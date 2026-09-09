const Project = require('../models/Project');
const Task = require('../models/Task');

// --- Project Controller ---

// @desc    Get all projects for logged-in user
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
  try {
    // Find projects where user is owner or a member
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    })
      .populate('owner', 'name email')
      .populate('members', 'name email')
      .sort({ createdAt: -1 });

    // Fetch task counts for each project to calculate progress
    const projectsWithProgress = await Promise.all(
      projects.map(async (project) => {
        const totalTasks = await Task.countDocuments({ project: project._id });
        const completedTasks = await Task.countDocuments({
          project: project._id,
          status: 'completed',
        });
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        let status = project.status;
        if (totalTasks > 0 && completedTasks === totalTasks && project.status !== 'on-hold') {
          status = 'completed';
          if (project.status !== 'completed') {
            await Project.findByIdAndUpdate(project._id, { status: 'completed' });
          }
        }

        return {
          ...project.toObject(),
          status,
          totalTasks,
          completedTasks,
          progress,
        };
      })
    );

    res.json(projectsWithProgress);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects', error: error.message });
  }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Verify user is owner or member
    const isOwner = project.owner._id.toString() === req.user._id.toString();
    const isMember = project.members.some(
      (m) => m._id.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Not authorized to access this project' });
    }

    const totalTasks = await Task.countDocuments({ project: project._id });
    const completedTasks = await Task.countDocuments({
      project: project._id,
      status: 'completed',
    });
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      ...project.toObject(),
      totalTasks,
      completedTasks,
      progress,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching project', error: error.message });
  }
};

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  try {
    const { title, description, status, deadline, members } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Project title is required' });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Initialize members list including the creator
    const memberList = members && Array.isArray(members) ? [...members] : [];
    if (!memberList.some((m) => m && m.toString() === req.user._id.toString())) {
      memberList.push(req.user._id);
    }

    // Clean deadline: if empty string or invalid, set to null
    let cleanDeadline = null;
    if (deadline && !isNaN(new Date(deadline).getTime())) {
      cleanDeadline = new Date(deadline);
    }

    const project = await Project.create({
      title: title.trim(),
      description: (description || '').trim(),
      owner: req.user._id,
      members: memberList,
      status: ['active', 'completed', 'on-hold'].includes(status) ? status : 'active',
      deadline: cleanDeadline,
    });

    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'name email')
      .populate('members', 'name email');

    res.status(201).json({
      ...populatedProject.toObject(),
      totalTasks: 0,
      completedTasks: 0,
      progress: 0,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Error creating project', error: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Verify ownership or membership
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isMember = project.members.some(
      (m) => m && m.toString() === req.user._id.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Not authorized to update this project' });
    }

    const { title, description, status, deadline, members } = req.body;

    if (title !== undefined && title.trim()) project.title = title.trim();
    if (description !== undefined) project.description = description.trim();
    if (status !== undefined && ['active', 'completed', 'on-hold'].includes(status)) {
      project.status = status;
    }
    if (deadline !== undefined) {
      project.deadline = (deadline && !isNaN(new Date(deadline).getTime())) ? new Date(deadline) : null;
    }
    if (members !== undefined && Array.isArray(members)) project.members = members;

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('owner', 'name email')
      .populate('members', 'name email');

    const totalTasks = await Task.countDocuments({ project: project._id });
    const completedTasks = await Task.countDocuments({
      project: project._id,
      status: 'completed',
    });
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      ...updatedProject.toObject(),
      totalTasks,
      completedTasks,
      progress,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating project', error: error.message });
  }
};

// @desc    Delete project and cascade delete tasks
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only project owner can delete project
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the project owner can delete this project' });
    }

    // Cascade delete associated tasks
    await Task.deleteMany({ project: project._id });

    // Delete project
    await Project.findByIdAndDelete(req.params.id);

    res.json({ message: 'Project and associated tasks deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting project', error: error.message });
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};

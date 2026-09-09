const Task = require('../models/Task');
const Project = require('../models/Project');

// --- Task Controller ---

// @desc    Get tasks (optionally filtered by projectId, status, priority)
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    const { projectId, status, priority } = req.query;
    const filter = {};

    if (projectId) {
      filter.project = projectId;
    } else {
      // If no specific project requested, return tasks from projects the user belongs to
      const userProjects = await Project.find({
        $or: [{ owner: req.user._id }, { members: req.user._id }],
      }).select('_id');
      const projectIds = userProjects.map((p) => p._id);
      filter.project = { $in: projectIds };
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'title')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    const { title, description, project, assignedTo, status, priority, dueDate } = req.body;

    if (!title || !project) {
      return res.status(400).json({ message: 'Task title and project ID are required' });
    }

    // Verify project exists and user has access
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const task = await Task.create({
      title,
      description: description || '',
      project,
      assignedTo: assignedTo || null,
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      createdBy: req.user._id,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'title');

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
};

// @desc    Update task details or status
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const { title, description, assignedTo, status, priority, dueDate } = req.body;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate || null;

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'title');

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({ message: 'Task deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
};

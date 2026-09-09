const Project = require('../models/Project');
const Task = require('../models/Task');
const aiService = require('../services/aiService');

// --- AI Controller ---

// @desc    Generate tasks using AI
// @route   POST /api/ai/generate-tasks
// @access  Private
const generateTasks = async (req, res) => {
  try {
    const { projectId, prompt, count, autoSave } = req.body;

    let projectTitle = 'Software Project';
    let projectDescription = prompt || '';

    if (projectId) {
      const project = await Project.findById(projectId);
      if (project) {
        projectTitle = project.title;
        projectDescription = prompt || project.description || project.title;
      }
    }

    const tasks = await aiService.generateTasks({
      title: projectTitle,
      description: projectDescription,
      count: count || 5,
    });

    let savedTasks = [];
    if (autoSave && projectId) {
      const taskDocs = tasks.map((t) => ({
        title: t.title,
        description: t.description || '',
        project: projectId,
        status: t.status || 'todo',
        priority: t.priority || 'medium',
        dueDate: t.dueDate || null,
        createdBy: req.user._id,
      }));
      savedTasks = await Task.insertMany(taskDocs);
    }

    res.json({
      success: true,
      count: tasks.length,
      saved: savedTasks.length > 0,
      tasks: savedTasks.length > 0 ? savedTasks : tasks,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating tasks with AI', error: error.message });
  }
};

// @desc    Bulk import accepted AI tasks into a project
// @route   POST /api/ai/import-tasks
// @access  Private
const importTasks = async (req, res) => {
  try {
    const { projectId, tasks } = req.body;

    if (!projectId || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ message: 'Project ID and valid task list are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Format tasks for Mongoose insert
    const taskDocs = tasks.map((t) => ({
      title: t.title,
      description: t.description || '',
      project: projectId,
      status: t.status || 'todo',
      priority: t.priority || 'medium',
      dueDate: t.dueDate || null,
      createdBy: req.user._id,
    }));

    const inserted = await Task.insertMany(taskDocs);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} tasks into "${project.title}"`,
      count: inserted.length,
      tasks: inserted,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error importing tasks', error: error.message });
  }
};

// @desc    Generate AI progress and health audit for a project
// @route   POST /api/ai/summarize-progress
// @access  Private
const summarizeProgress = async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Fetch all project tasks
    const tasks = await Task.find({ project: projectId }).sort({ createdAt: -1 });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
    const now = new Date();
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed'
    ).length;

    const summary = await aiService.summarizeProgress({
      title: project.title,
      description: project.description,
      stats: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
      },
      tasks,
    });

    res.json({
      success: true,
      projectId: project._id,
      projectTitle: project.title,
      stats: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
      },
      summary,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating project audit', error: error.message });
  }
};

// @desc    Interactive AI project chat
// @route   POST /api/ai/chat
// @access  Private
const chat = async (req, res) => {
  try {
    const { message, projectId } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    let projectContext = {};
    if (projectId) {
      const project = await Project.findById(projectId);
      if (project) {
        projectContext = {
          projectTitle: project.title,
          projectDescription: project.description,
        };
      }
    }

    const reply = await aiService.chat({
      message,
      context: projectContext,
    });

    res.json({
      success: true,
      reply,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error in AI chat', error: error.message });
  }
};

module.exports = {
  generateTasks,
  importTasks,
  summarizeProgress,
  chat,
};

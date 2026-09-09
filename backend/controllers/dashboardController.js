const Project = require('../models/Project');
const Task = require('../models/Task');

// --- Dashboard Controller ---

// @desc    Get aggregated dashboard analytics and stats
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Fetch all user projects (owner or member)
    const userProjects = await Project.find({
      $or: [{ owner: userId }, { members: userId }],
    }).sort({ createdAt: -1 });

    const projectIds = userProjects.map((p) => p._id);

    // 2. Fetch all tasks across user's projects
    const allTasks = await Task.find({ project: { $in: projectIds } })
      .populate('project', 'title')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    // 3. Project counts
    const totalProjects = userProjects.length;
    const activeProjects = userProjects.filter((p) => p.status === 'active').length;
    const completedProjects = userProjects.filter((p) => p.status === 'completed').length;
    const onHoldProjects = userProjects.filter((p) => p.status === 'on-hold').length;

    // 4. Task counts by status
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.status === 'completed').length;
    const inProgressTasks = allTasks.filter((t) => t.status === 'in-progress').length;
    const todoTasks = allTasks.filter((t) => t.status === 'todo').length;

    // 5. Completion rate
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 6. Overdue tasks (due before today and not completed)
    const now = new Date();
    const overdueTasks = allTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed'
    );

    // 7. Tasks by priority (EXCLUDES completed tasks - only active/pending tasks!)
    const activeTasks = allTasks.filter((t) => t.status !== 'completed');
    const priorityBreakdown = {
      urgent: activeTasks.filter((t) => t.priority === 'urgent').length,
      high: activeTasks.filter((t) => t.priority === 'high').length,
      medium: activeTasks.filter((t) => t.priority === 'medium').length,
      low: activeTasks.filter((t) => t.priority === 'low').length,
      totalPending: activeTasks.length,
    };

    // 8. Projects with individual task progress
    const projectsProgress = userProjects.map((proj) => {
      const projTasks = allTasks.filter(
        (t) => t.project?._id?.toString() === proj._id.toString() || t.project?.toString() === proj._id.toString()
      );
      const projCompleted = projTasks.filter((t) => t.status === 'completed').length;
      const progress = projTasks.length > 0 ? Math.round((projCompleted / projTasks.length) * 100) : 0;
      
      let effectiveStatus = proj.status;
      if (projTasks.length > 0 && projCompleted === projTasks.length && proj.status !== 'on-hold') {
        effectiveStatus = 'completed';
      }

      return {
        _id: proj._id,
        title: proj.title,
        status: effectiveStatus,
        deadline: proj.deadline,
        totalTasks: projTasks.length,
        completedTasks: projCompleted,
        progress,
      };
    });

    // 9. Upcoming Deadlines (tasks due soonest that are not completed)
    const upcomingDeadlines = allTasks
      .filter((t) => t.dueDate && t.status !== 'completed')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);

    // 10. Recent Activity / Tasks (latest 5 tasks created or updated)
    const recentTasks = allTasks.slice(0, 5);

    res.json({
      projects: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        onHold: onHoldProjects,
        list: projectsProgress,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        todo: todoTasks,
        overdue: overdueTasks.length,
        completionRate,
        priorityBreakdown,
        upcomingDeadlines,
        recent: recentTasks,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error aggregating dashboard stats', error: error.message });
  }
};

module.exports = { getDashboardStats };

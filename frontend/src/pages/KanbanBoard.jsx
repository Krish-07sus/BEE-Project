import { useState, useEffect } from 'react';
import api from '../services/api';

// --- Kanban Board Page (Member 3) ---

const KanbanBoard = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Drag & drop state
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Modal State for Task
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [defaultStatusForNewTask, setDefaultStatusForNewTask] = useState('todo');
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    project: '',
    priority: 'medium',
    status: 'todo',
    dueDate: '',
  });

  const [deleteDialog, setDeleteDialog] = useState(null); // { id, title }

  // --- Fetch Projects & Tasks ---
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [projectsRes, tasksRes] = await Promise.all([
        api.get('/projects'),
        api.get('/tasks'),
      ]);

      setProjects(projectsRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load Kanban board data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Drag & Drop Handlers ---
  const handleDragStart = (e, taskId) => {
    setDraggingTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, columnStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnStatus) {
      setDragOverColumn(columnStatus);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = draggingTaskId || e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const taskToMove = tasks.find((t) => t._id === taskId);
    if (!taskToMove || taskToMove.status === targetStatus) {
      setDraggingTaskId(null);
      return;
    }

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: targetStatus } : t))
    );
    setDraggingTaskId(null);

    try {
      await api.put(`/tasks/${taskId}`, { status: targetStatus });
    } catch (err) {
      setError('Failed to update task status');
      // Rollback on error
      fetchData();
    }
  };

  // --- Task Modal Handlers ---
  const openCreateTaskModal = (initialStatus = 'todo') => {
    setEditingTask(null);
    setDefaultStatusForNewTask(initialStatus);
    setTaskForm({
      title: '',
      description: '',
      project: selectedProjectId !== 'all' ? selectedProjectId : projects[0]?._id || '',
      priority: 'medium',
      status: initialStatus,
      dueDate: '',
    });
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      project: task.project?._id || task.project || '',
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !taskForm.project) {
      setError('Task title and associated project are required');
      return;
    }

    try {
      if (editingTask) {
        const res = await api.put(`/tasks/${editingTask._id}`, taskForm);
        setTasks((prev) =>
          prev.map((t) => (t._id === editingTask._id ? res.data : t))
        );
      } else {
        const res = await api.post('/tasks', taskForm);
        setTasks((prev) => [res.data, ...prev]);
      }
      setIsTaskModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save task');
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteDialog) return;

    try {
      await api.delete(`/tasks/${deleteDialog.id}`);
      setTasks((prev) => prev.filter((t) => t._id !== deleteDialog.id));
      setDeleteDialog(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task');
    }
  };

  // --- Filter Tasks ---
  const filteredTasks = tasks.filter((task) => {
    const taskProjId = task.project?._id || task.project;
    const matchesProject = selectedProjectId === 'all' || taskProjId === selectedProjectId;
    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesProject && matchesPriority && matchesSearch;
  });

  const columns = [
    {
      id: 'todo',
      title: 'To Do',
      emoji: '📝',
      color: 'border-t-indigo-500',
      headerBg: 'bg-indigo-50/50 text-indigo-900',
      badgeColor: 'bg-indigo-100 text-indigo-700',
    },
    {
      id: 'in-progress',
      title: 'In Progress',
      emoji: '🔄',
      color: 'border-t-amber-500',
      headerBg: 'bg-amber-50/50 text-amber-900',
      badgeColor: 'bg-amber-100 text-amber-700',
    },
    {
      id: 'completed',
      title: 'Completed',
      emoji: '✅',
      color: 'border-t-emerald-500',
      headerBg: 'bg-emerald-50/50 text-emerald-900',
      badgeColor: 'bg-emerald-100 text-emerald-700',
    },
  ];

  // Helper for priority badges
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-sm">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-800 font-bold">✕</button>
        </div>
      )}

      {/* --- Top Controls & Filter Bar --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Kanban Board</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Drag and drop cards across columns to update task workflow in real-time
            </p>
          </div>

          <button
            onClick={() => openCreateTaskModal('todo')}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-indigo-500/20 flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
        </div>

        {/* Filter Inputs */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400">Priority:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <svg className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* --- Kanban 3 Columns --- */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`bg-white rounded-2xl shadow-sm border border-gray-100 border-t-4 ${col.color} p-4 flex flex-col min-h-[550px] transition-all duration-200 ${
                  dragOverColumn === col.id ? 'ring-2 ring-indigo-500 bg-indigo-50/20' : ''
                }`}
              >
                {/* Column Header */}
                <div className={`flex items-center justify-between p-3 rounded-xl mb-4 ${col.headerBg}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{col.emoji}</span>
                    <h3 className="font-bold text-sm text-gray-800">{col.title}</h3>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${col.badgeColor}`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards Container */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[650px] pr-1">
                  {colTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs p-4 text-center">
                      <p className="font-medium">Drop tasks here</p>
                      <button
                        onClick={() => openCreateTaskModal(col.id)}
                        className="mt-2 text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        + Add Task
                      </button>
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task._id)}
                        className="bg-white p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition duration-150 cursor-grab active:cursor-grabbing shadow-sm group space-y-3"
                      >
                        {/* Top: Project Badge & Action Menu */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold truncate max-w-[150px]">
                            {task.project?.title || 'General'}
                          </span>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => openEditTaskModal(task)}
                              className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                              title="Edit"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteDialog({ id: task._id, title: task.title })}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 leading-snug">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Bottom: Priority & Due Date */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-[11px]">
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${getPriorityBadge(task.priority)}`}>
                            {task.priority}
                          </span>

                          {task.dueDate && (
                            <span className="text-gray-400 flex items-center gap-1">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Bottom Add Task Button */}
                <button
                  onClick={() => openCreateTaskModal(col.id)}
                  className="mt-3 w-full py-2 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 text-gray-500 rounded-xl text-xs font-semibold transition border border-dashed border-gray-200"
                >
                  + Add Card
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* --- Modal: Create / Edit Task --- */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editingTask ? 'Edit Task' : 'Add Kanban Task'}
            </h3>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Project *</label>
                <select
                  required
                  value={taskForm.project}
                  onChange={(e) => setTaskForm({ ...taskForm, project: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>Select Project</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement user profile page"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Task instructions and requirements..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Column (Status)</label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Due Date</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-indigo-500/20"
                >
                  {editingTask ? 'Save Changes' : 'Add to Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal: Confirm Delete Task Dialog --- */}
      {deleteDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-gray-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-gray-800 mb-1">Delete Task?</h4>
            <p className="text-xs text-gray-500 mb-6">
              Are you sure you want to delete <strong className="text-gray-700">"{deleteDialog.title}"</strong> from the Kanban board?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteDialog(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-red-500/20"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;

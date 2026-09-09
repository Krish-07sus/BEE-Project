import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// --- Projects & Task Management Page (Member 2) ---

const Projects = () => {
  const { user } = useAuth();

  // State
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    deadline: '',
    status: 'active',
  });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    dueDate: '',
  });

  const [deleteDialog, setDeleteDialog] = useState(null); // { type: 'project'|'task', id, title }

  // --- Fetch Projects ---
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // --- Fetch Tasks for Selected Project ---
  const fetchTasks = async (projectId) => {
    try {
      setTasksLoading(true);
      const res = await api.get(`/tasks?projectId=${projectId}`);
      setTasks(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tasks');
    } finally {
      setTasksLoading(false);
    }
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    fetchTasks(project._id);
  };

  // --- Project Modal Handlers ---
  const openCreateProjectModal = () => {
    setEditingProject(null);
    setProjectForm({
      title: '',
      description: '',
      deadline: '',
      status: 'active',
    });
    setIsProjectModalOpen(true);
  };

  const openEditProjectModal = (proj, e) => {
    e?.stopPropagation();
    setEditingProject(proj);
    setProjectForm({
      title: proj.title,
      description: proj.description || '',
      deadline: proj.deadline ? proj.deadline.split('T')[0] : '',
      status: proj.status || 'active',
    });
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!projectForm.title.trim()) {
      setError('Please enter a project title');
      return;
    }

    try {
      setError('');
      const payload = {
        title: projectForm.title.trim(),
        description: projectForm.description ? projectForm.description.trim() : '',
        status: projectForm.status || 'active',
        deadline: projectForm.deadline ? projectForm.deadline : null,
      };

      if (editingProject) {
        const res = await api.put(`/projects/${editingProject._id}`, payload);
        setProjects((prev) =>
          prev.map((p) => (p._id === editingProject._id ? res.data : p))
        );
        if (selectedProject?._id === editingProject._id) {
          setSelectedProject(res.data);
        }
      } else {
        const res = await api.post('/projects', payload);
        setProjects((prev) => [res.data, ...prev]);
      }
      setIsProjectModalOpen(false);
      setProjectForm({ title: '', description: '', deadline: '', status: 'active' });
    } catch (err) {
      console.error('Failed to save project:', err);
      setError(err.response?.data?.message || 'Failed to save project');
    }
  };

  // --- Task Modal Handlers ---
  const openCreateTaskModal = () => {
    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      dueDate: '',
    });
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !selectedProject) return;

    try {
      if (editingTask) {
        const res = await api.put(`/tasks/${editingTask._id}`, taskForm);
        setTasks((prev) =>
          prev.map((t) => (t._id === editingTask._id ? res.data : t))
        );
      } else {
        const res = await api.post('/tasks', {
          ...taskForm,
          project: selectedProject._id,
        });
        setTasks((prev) => [res.data, ...prev]);
      }
      setIsTaskModalOpen(false);
      // Refresh project to update task count and progress
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save task');
    }
  };

  // Quick Task Status Change
  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t._id === taskId ? res.data : t)));
      fetchProjects(); // Recalculate project progress
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task status');
    }
  };

  // --- Delete Handler ---
  const confirmDelete = async () => {
    if (!deleteDialog) return;

    try {
      if (deleteDialog.type === 'project') {
        await api.delete(`/projects/${deleteDialog.id}`);
        setProjects((prev) => prev.filter((p) => p._id !== deleteDialog.id));
        if (selectedProject?._id === deleteDialog.id) {
          setSelectedProject(null);
          setTasks([]);
        }
      } else if (deleteDialog.type === 'task') {
        await api.delete(`/tasks/${deleteDialog.id}`);
        setTasks((prev) => prev.filter((t) => t._id !== deleteDialog.id));
        fetchProjects();
      }
      setDeleteDialog(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  // --- Filtered Projects ---
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Priority color styling helper
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

  // Status color styling helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'in-progress':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'on-hold':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'active':
      case 'todo':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* --- Error Banner --- */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-sm">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-800 font-bold">✕</button>
        </div>
      )}

      {/* --- Top Header & Controls --- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {selectedProject ? selectedProject.title : 'Project & Task Management'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {selectedProject
              ? selectedProject.description || 'Manage tasks under this project'
              : 'Create, organize, and track your team projects and deliverables'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedProject ? (
            <>
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium transition shadow-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                All Projects
              </button>
              <button
                onClick={openCreateTaskModal}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-medium transition shadow-md shadow-indigo-500/20 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Task
              </button>
            </>
          ) : (
            (statusFilter === 'all' || statusFilter === 'active') && (
              <button
                onClick={openCreateProjectModal}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-medium transition shadow-md shadow-indigo-500/20 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Project
              </button>
            )
          )}
        </div>
      </div>

      {/* --- Main View: Project Details or Projects Grid --- */}
      {!selectedProject ? (
        <>
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="relative w-full sm:w-80">
              <svg className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status:</span>
              <div className="flex gap-1.5 overflow-x-auto">
                {['all', 'active', 'completed', 'on-hold'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                      statusFilter === status
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Projects Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredProjects.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">
                {statusFilter === 'completed' ? '🏆' : statusFilter === 'on-hold' ? '⏸️' : '📁'}
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                {statusFilter === 'completed'
                  ? 'No Completed Projects'
                  : statusFilter === 'on-hold'
                  ? 'No Projects On Hold'
                  : 'No Projects Found'}
              </h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
                {statusFilter === 'completed'
                  ? 'Projects marked as completed will appear here.'
                  : statusFilter === 'on-hold'
                  ? 'Projects paused or put on hold will appear here.'
                  : searchQuery
                  ? 'No projects matched your search criteria.'
                  : 'Get started by creating your first project to organize tasks and collaborate.'}
              </p>
              {(statusFilter === 'all' || statusFilter === 'active') && !searchQuery && (
                <button
                  onClick={openCreateProjectModal}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition shadow-md shadow-indigo-500/20"
                >
                  + Create Project
                </button>
              )}
            </div>
          ) : (
            /* Projects Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((proj) => (
                <div
                  key={proj._id}
                  onClick={() => handleSelectProject(proj)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition duration-200 p-6 flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    {/* Header: Title & Status */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-base font-bold text-gray-800 group-hover:text-indigo-600 transition line-clamp-1">
                        {proj.title}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${getStatusBadge(proj.status)}`}>
                        {proj.status}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                      {proj.description || 'No description provided.'}
                    </p>
                  </div>

                  <div>
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                        <span className="font-medium">Progress</span>
                        <span className="font-semibold text-gray-700">
                          {proj.completedTasks || 0}/{proj.totalTasks || 0} tasks ({proj.progress || 0}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                          style={{ width: `${proj.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Footer: Deadline & Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {proj.deadline
                            ? new Date(proj.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'No deadline'}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => openEditProjectModal(proj, e)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Edit Project"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteDialog({ type: 'project', id: proj._id, title: proj.title });
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Project"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* --- Selected Project Tasks View --- */
        <div className="space-y-6">
          {/* Project Summary Banner */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${getStatusBadge(selectedProject.status)}`}>
                  {selectedProject.status}
                </span>
                <span className="text-xs text-gray-400">
                  Owner: <strong className="text-gray-600">{selectedProject.owner?.name || user?.name}</strong>
                </span>
                {selectedProject.deadline && (
                  <span className="text-xs text-gray-400">
                    Deadline: <strong className="text-gray-600">{new Date(selectedProject.deadline).toLocaleDateString()}</strong>
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-sm">{selectedProject.description || 'No description provided.'}</p>
            </div>

            {/* Task Stats Counter */}
            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 min-w-[240px]">
              <div className="text-center flex-1">
                <p className="text-xl font-bold text-gray-800">{tasks.length}</p>
                <p className="text-xs text-gray-400">Total Tasks</p>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>
              <div className="text-center flex-1">
                <p className="text-xl font-bold text-indigo-600">
                  {tasks.filter((t) => t.status === 'in-progress').length}
                </p>
                <p className="text-xs text-gray-400">In Progress</p>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>
              <div className="text-center flex-1">
                <p className="text-xl font-bold text-emerald-600">
                  {tasks.filter((t) => t.status === 'completed').length}
                </p>
                <p className="text-xs text-gray-400">Completed</p>
              </div>
            </div>
          </div>

          {/* Tasks List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">Tasks</h2>
              <button
                onClick={openCreateTaskModal}
                className="px-3.5 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                + Add Task
              </button>
            </div>

            {tasksLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center mx-auto mb-3 text-xl">
                  📝
                </div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">No Tasks in this Project</h4>
                <p className="text-xs text-gray-400 mb-4">Add your first task to start tracking work.</p>
                <button
                  onClick={openCreateTaskModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition"
                >
                  + Add First Task
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task._id}
                    className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      task.status === 'completed'
                        ? 'bg-gray-50/70 border-gray-200/60 opacity-80'
                        : 'bg-white border-gray-100 hover:border-indigo-100 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Checkbox for quick completion */}
                      <button
                        onClick={() =>
                          handleUpdateTaskStatus(
                            task._id,
                            task.status === 'completed' ? 'todo' : 'completed'
                          )
                        }
                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition ${
                          task.status === 'completed'
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-gray-300 hover:border-indigo-500'
                        }`}
                      >
                        {task.status === 'completed' && (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      {/* Task Info */}
                      <div>
                        <h4
                          className={`text-sm font-semibold text-gray-800 ${
                            task.status === 'completed' ? 'line-through text-gray-400' : ''
                          }`}
                        >
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{task.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {/* Priority Pill */}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getPriorityBadge(task.priority)}`}>
                            {task.priority}
                          </span>

                          {/* Due Date */}
                          {task.dueDate && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Dropdown & Action buttons */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <select
                        value={task.status}
                        onChange={(e) => handleUpdateTaskStatus(task._id, e.target.value)}
                        className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="todo">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>

                      <button
                        onClick={() => openEditTaskModal(task)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Edit Task"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      <button
                        onClick={() =>
                          setDeleteDialog({ type: 'task', id: task._id, title: task.title })
                        }
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete Task"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Modal: Create / Edit Project --- */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </h3>

            <form onSubmit={handleSaveProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Website Redesign"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief summary of the project scope and deliverables..."
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select
                    value={projectForm.status}
                    onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={projectForm.deadline}
                    onChange={(e) => setProjectForm({ ...projectForm, deadline: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-indigo-500/20"
                >
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal: Create / Edit Task --- */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editingTask ? 'Edit Task' : 'Add New Task'}
            </h3>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design homepage hero section"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Details, requirements, or links for this task..."
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
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
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
                  {editingTask ? 'Save Changes' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal: Confirm Delete Dialog --- */}
      {deleteDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-gray-100 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-gray-800 mb-1">
              Delete {deleteDialog.type === 'project' ? 'Project' : 'Task'}?
            </h4>
            <p className="text-xs text-gray-500 mb-6">
              Are you sure you want to delete <strong className="text-gray-700">"{deleteDialog.title}"</strong>?
              {deleteDialog.type === 'project' && ' All tasks inside this project will also be deleted.'}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteDialog(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
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

export default Projects;

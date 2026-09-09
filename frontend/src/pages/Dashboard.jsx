import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// --- Dashboard Page (Member 3) ---

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch Dashboard Stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Quick task toggle from upcoming list
  const handleQuickToggleTask = async (taskId, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'completed' ? 'todo' : 'completed';
      await api.put(`/tasks/${taskId}`, { status: nextStatus });
      fetchStats();
    } catch (err) {
      setError('Failed to update task');
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const pStats = stats?.projects || { total: 0, active: 0, completed: 0, onHold: 0, list: [] };
  const tStats = stats?.tasks || {
    total: 0,
    completed: 0,
    inProgress: 0,
    todo: 0,
    overdue: 0,
    completionRate: 0,
    priorityBreakdown: { urgent: 0, high: 0, medium: 0, low: 0 },
    upcomingDeadlines: [],
    recent: [],
  };

  return (
    <div className="space-y-8">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-sm">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-800 font-bold">✕</button>
        </div>
      )}

      {/* --- Greeting & Overview Header --- */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 -top-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="px-3 py-1 bg-white/10 text-indigo-200 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <h1 className="text-3xl font-extrabold mt-3">
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="text-indigo-200 text-sm mt-1 max-w-xl">
              Here is your project intelligence overview. You have{' '}
              <strong className="text-white">{tStats.inProgress} active tasks</strong> in progress and{' '}
              <strong className="text-white">{tStats.overdue} overdue items</strong> requiring attention.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/kanban"
              className="px-5 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl text-sm font-bold transition shadow-lg flex items-center gap-2"
            >
              <span>Kanban Board</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <Link
              to="/projects"
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition backdrop-blur-md flex items-center gap-2 border border-white/10"
            >
              <span>Manage Projects</span>
            </Link>
          </div>
        </div>
      </div>

      {/* --- 4 Key Metric Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Projects */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Projects</p>
              <p className="text-3xl font-extrabold text-gray-800 mt-2">{pStats.total}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl shadow-sm">
              📁
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 pt-3 border-t border-gray-100">
            <span className="font-semibold text-emerald-600">{pStats.active} Active</span>
            <span>•</span>
            <span className="font-semibold text-purple-600">{pStats.completed} Done</span>
          </div>
        </div>

        {/* Card 2: Total Tasks */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Tasks</p>
              <p className="text-3xl font-extrabold text-gray-800 mt-2">{tStats.total}</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-xl shadow-sm">
              📋
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 pt-3 border-t border-gray-100">
            <span className="font-semibold text-indigo-600">{tStats.inProgress} In Progress</span>
            <span>•</span>
            <span className="font-semibold text-slate-500">{tStats.todo} To Do</span>
          </div>
        </div>

        {/* Card 3: Completion Rate */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Completion Rate</p>
              <p className="text-3xl font-extrabold text-emerald-600 mt-2">{tStats.completionRate}%</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl shadow-sm">
              🎯
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${tStats.completionRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card 4: Overdue Deadlines */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Overdue Tasks</p>
              <p className={`text-3xl font-extrabold mt-2 ${tStats.overdue > 0 ? 'text-rose-600' : 'text-gray-800'}`}>
                {tStats.overdue}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${tStats.overdue > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
              ⏰
            </div>
          </div>
          <div className="mt-4 text-xs pt-3 border-t border-gray-100">
            {tStats.overdue > 0 ? (
              <span className="font-semibold text-rose-600 flex items-center gap-1">
                ⚠️ Requires immediate attention
              </span>
            ) : (
              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                ✓ All tasks on schedule
              </span>
            )}
          </div>
        </div>
      </div>

      {/* --- Main Analytics Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Projects Progress & Priority Breakdown */}
        <div className="lg:col-span-2 space-y-8">
          {/* Projects Progress Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-gray-800">Projects Progress</h2>
                <p className="text-xs text-gray-400 mt-0.5">Real-time task completion by project</p>
              </div>
              <Link to="/projects" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                View All →
              </Link>
            </div>

            {pStats.list.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-2 text-xl">
                  📁
                </div>
                <p className="text-sm text-gray-500 font-medium">No projects created yet</p>
                <Link
                  to="/projects"
                  className="mt-3 inline-block px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                >
                  + Create Your First Project
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {pStats.list.slice(0, 5).map((proj) => (
                  <Link
                    key={proj._id}
                    to="/projects"
                    className="block p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/20 transition group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-gray-800 group-hover:text-indigo-600 transition">
                        {proj.title}
                      </h3>
                      <span className="text-xs font-bold text-indigo-600">
                        {proj.progress}%
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300"
                        style={{ width: `${proj.progress}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{proj.completedTasks} of {proj.totalTasks} tasks completed</span>
                      {proj.deadline && (
                        <span>Due {new Date(proj.deadline).toLocaleDateString()}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Priority Breakdown Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-base font-bold text-gray-800 mb-1">Active Task Priority Distribution</h2>
            <p className="text-xs text-gray-400 mb-6">Pending & in-progress tasks segmented by priority (completed tasks removed)</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-rose-50/60 border border-rose-100 p-4 rounded-xl text-center">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Urgent</span>
                <p className="text-2xl font-black text-rose-600 mt-1">{tStats.priorityBreakdown.urgent}</p>
                <p className="text-[11px] text-rose-500 mt-1">tasks</p>
              </div>

              <div className="bg-orange-50/60 border border-orange-100 p-4 rounded-xl text-center">
                <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">High</span>
                <p className="text-2xl font-black text-orange-600 mt-1">{tStats.priorityBreakdown.high}</p>
                <p className="text-[11px] text-orange-500 mt-1">tasks</p>
              </div>

              <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-xl text-center">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Medium</span>
                <p className="text-2xl font-black text-blue-600 mt-1">{tStats.priorityBreakdown.medium}</p>
                <p className="text-[11px] text-blue-500 mt-1">tasks</p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl text-center">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Low</span>
                <p className="text-2xl font-black text-slate-600 mt-1">{tStats.priorityBreakdown.low}</p>
                <p className="text-[11px] text-slate-500 mt-1">tasks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Deadlines & Quick Links */}
        <div className="space-y-8">
          {/* Upcoming Deadlines Widget */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">Upcoming Deadlines</h2>
              <Link to="/kanban" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                Board →
              </Link>
            </div>

            {tStats.upcomingDeadlines.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-2xl mb-1">🎉</div>
                <p className="text-xs text-gray-400">No upcoming tasks due soon</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tStats.upcomingDeadlines.map((task) => (
                  <div
                    key={task._id}
                    className="p-3.5 rounded-xl border border-gray-100 hover:border-indigo-100 transition flex items-start justify-between gap-3 bg-gray-50/50"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-800 line-clamp-1">{task.title}</p>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className="text-gray-400">
                          {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleQuickToggleTask(task._id, task.status)}
                      className="text-gray-400 hover:text-emerald-600 transition p-1"
                      title="Mark as Completed"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100/60 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Quick Navigation</h3>
            <div className="space-y-2">
              <Link
                to="/projects"
                className="w-full flex items-center justify-between p-3 bg-white hover:bg-indigo-50 rounded-xl text-xs font-semibold text-gray-700 hover:text-indigo-600 transition shadow-sm border border-gray-100"
              >
                <span className="flex items-center gap-2">
                  <span>📁</span> Manage All Projects
                </span>
                <span>→</span>
              </Link>
              <Link
                to="/kanban"
                className="w-full flex items-center justify-between p-3 bg-white hover:bg-indigo-50 rounded-xl text-xs font-semibold text-gray-700 hover:text-indigo-600 transition shadow-sm border border-gray-100"
              >
                <span className="flex items-center gap-2">
                  <span>📋</span> Open Kanban Board
                </span>
                <span>→</span>
              </Link>
              <Link
                to="/ai-assistant"
                className="w-full flex items-center justify-between p-3 bg-white hover:bg-indigo-50 rounded-xl text-xs font-semibold text-gray-700 hover:text-indigo-600 transition shadow-sm border border-gray-100"
              >
                <span className="flex items-center gap-2">
                  <span>🤖</span> AI Assistant
                </span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

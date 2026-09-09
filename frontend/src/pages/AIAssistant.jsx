import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

// --- AI Assistant Workspace (Member 4) ---

const AIAssistant = () => {
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'audit' | 'chat'
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // --- Tab 1: Task Generator State ---
  const [genProjectId, setGenProjectId] = useState('');
  const [genPrompt, setGenPrompt] = useState('');
  const [genCount, setGenCount] = useState(5);
  const [autoSaveToProject, setAutoSaveToProject] = useState(true);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('projectai_recent_ai_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedTaskIndices, setSelectedTaskIndices] = useState([]);
  const [importingTasks, setImportingTasks] = useState(false);

  // Live tasks for current project
  const [projectTasks, setProjectTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // --- Tab 2: Progress Audit State ---
  const [auditProjectId, setAuditProjectId] = useState('');
  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);

  // --- Tab 3: Chat State ---
  const [chatProjectId, setChatProjectId] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am your **ProjectAI Assistant**. I can help you plan sprints, break down tasks, analyze project risks, and recommend priorities. How can I assist your team today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [sendingChat, setSendingChat] = useState(false);

  // Fetch Projects on Load
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const res = await api.get('/projects');
        setProjects(res.data);
        if (res.data.length > 0) {
          const firstId = res.data[0]._id;
          setGenProjectId(firstId);
          setAuditProjectId(firstId);
          fetchProjectTasks(firstId);
        }
      } catch (err) {
        setError('Failed to load projects');
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  // Fetch Tasks for the currently selected project
  const fetchProjectTasks = async (projectId) => {
    if (!projectId) return;
    try {
      setLoadingTasks(true);
      const res = await api.get(`/tasks?projectId=${projectId}`);
      setProjectTasks(res.data);
    } catch (err) {
      console.error('Error fetching project tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleProjectChange = (projectId) => {
    setGenProjectId(projectId);
    fetchProjectTasks(projectId);
  };

  // Quick Prompt Template Chips
  const promptTemplates = [
    { label: '🛒 E-commerce Store', prompt: 'Build an online store with product catalog, shopping cart, Stripe payment gateway, and order emails.' },
    { label: '📱 Mobile App MVP', prompt: 'Create a cross-platform mobile app with user profiles, push notifications, offline storage, and settings.' },
    { label: '🔒 Auth & Security Audit', prompt: 'Implement OAuth2 social login, rate limiting, password reset with token expiration, and role-based access.' },
    { label: '📊 Analytics Dashboard', prompt: 'Develop a metrics dashboard with chart visualizations, CSV export, filterable tables, and live data polling.' },
  ];

  // --- Handler: Generate Tasks ---
  const handleGenerateTasks = async (e) => {
    e.preventDefault();
    if (!genPrompt.trim()) return;

    try {
      setGeneratingTasks(true);
      setError('');
      setSuccessMessage('');

      const res = await api.post('/ai/generate-tasks', {
        projectId: genProjectId || undefined,
        prompt: genPrompt,
        count: genCount,
        autoSave: autoSaveToProject,
      });

      const tasksList = res.data.tasks || [];
      setGeneratedTasks(tasksList);
      try {
        localStorage.setItem('projectai_recent_ai_tasks', JSON.stringify(tasksList));
      } catch (e) {
        console.warn('Could not save to localStorage', e);
      }

      // Select all by default
      setSelectedTaskIndices(tasksList.map((_, i) => i));

      const selectedProj = projects.find((p) => p._id === genProjectId);
      if (res.data.saved) {
        setSuccessMessage(
          `✨ ${tasksList.length} tasks generated and automatically added to "${selectedProj?.title || 'project'}"! They are now live on your Kanban Board and Dashboard.`
        );
        fetchProjectTasks(genProjectId);
      } else {
        setSuccessMessage(`Generated ${tasksList.length} tasks! Review below and click "Import to Project" to save.`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate tasks with AI');
    } finally {
      setGeneratingTasks(false);
    }
  };

  // Toggle selection of individual task
  const toggleTaskSelection = (index) => {
    setSelectedTaskIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // Select / Deselect All
  const handleToggleSelectAll = () => {
    if (selectedTaskIndices.length === generatedTasks.length) {
      setSelectedTaskIndices([]);
    } else {
      setSelectedTaskIndices(generatedTasks.map((_, i) => i));
    }
  };

  // --- Handler: Import Tasks to Project ---
  const handleImportTasks = async () => {
    if (!genProjectId) {
      setError('Please select a project to import tasks into');
      return;
    }
    const tasksToImport = generatedTasks.filter((_, i) => selectedTaskIndices.includes(i));
    if (tasksToImport.length === 0) {
      setError('Please select at least one task to import');
      return;
    }

    try {
      setImportingTasks(true);
      setError('');

      const res = await api.post('/ai/import-tasks', {
        projectId: genProjectId,
        tasks: tasksToImport,
      });

      const selectedProjectTitle = projects.find((p) => p._id === genProjectId)?.title || 'project';
      setSuccessMessage(`🎉 Successfully imported ${res.data.count} tasks into "${selectedProjectTitle}"! Check them in Kanban or Dashboard.`);
      fetchProjectTasks(genProjectId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to import tasks');
    } finally {
      setImportingTasks(false);
    }
  };

  // --- Handler: Run Progress Audit ---
  const handleRunAudit = async (e) => {
    e?.preventDefault();
    if (!auditProjectId) return;

    try {
      setAuditing(true);
      setError('');
      setAuditResult(null);

      const res = await api.post('/ai/summarize-progress', {
        projectId: auditProjectId,
      });

      setAuditResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate project audit');
    } finally {
      setAuditing(false);
    }
  };

  // --- Handler: Send Chat Message ---
  const handleSendChat = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || sendingChat) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setChatMessages((prev) => [...prev, { role: 'user', text: userMsg, time }]);

    try {
      setSendingChat(true);
      const res = await api.post('/ai/chat', {
        message: userMsg,
        projectId: chatProjectId || undefined,
      });

      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.data.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Sorry, I encountered an issue processing your request. Please try again.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSendingChat(false);
    }
  };

  // Priority color helper
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
      {/* --- Error & Success Alerts --- */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-sm">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-800 font-bold">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span>🎉</span>
            <span>{successMessage}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/kanban" className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm">
              Open Kanban Board →
            </Link>
            <Link to="/dashboard" className="px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-xs shadow-sm">
              Dashboard →
            </Link>
            <button onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-800 font-bold ml-1">✕</button>
          </div>
        </div>
      )}

      {/* --- Top Header & AI Badges --- */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white/10 text-purple-200 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
                AI Intelligence Hub
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[11px] font-medium">
                ⚡ Active & Connected
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white">AI Project Assistant</h1>
            <p className="text-gray-300 text-sm max-w-xl">
              Automate task breakdowns, audit project health, and receive sprint planning guidance powered by AI.
            </p>
          </div>

          {/* Tab Navigation Buttons */}
          <div className="flex bg-white/10 p-1.5 rounded-2xl backdrop-blur-md border border-white/10 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('generator')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'generator'
                  ? 'bg-white text-indigo-900 shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>⚡</span> Task Generator
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-white text-indigo-900 shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>📊</span> Health Audit
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'chat'
                  ? 'bg-white text-indigo-900 shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>💬</span> AI Advisor
            </button>
          </div>
        </div>
      </div>

      {/* --- TAB 1: AI TASK GENERATOR --- */}
      {activeTab === 'generator' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Generate Project Tasks with AI</h2>
            <p className="text-xs text-gray-500 mb-6">
              Describe your project deliverables in natural language and the AI will create structured, actionable tasks with estimated priorities and deadlines.
            </p>

            <form onSubmit={handleGenerateTasks} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Project Picker */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Target Project *</label>
                  <select
                    value={genProjectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.title} ({p.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Task Count Picker */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Number of Tasks</label>
                  <select
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={3}>3 Tasks (Sprint Scope)</option>
                    <option value={5}>5 Tasks (Standard)</option>
                    <option value={8}>8 Tasks (Detailed Scope)</option>
                    <option value={10}>10 Tasks (Full Roadmap)</option>
                  </select>
                </div>
              </div>

              {/* Requirements Description Box */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Project Scope & Deliverables *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Build a student marketplace platform where users can list textbooks, message sellers in real-time, and leave seller reviews..."
                  value={genPrompt}
                  onChange={(e) => setGenPrompt(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              {/* Template Chips */}
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                  Quick Starter Templates:
                </span>
                <div className="flex flex-wrap gap-2">
                  {promptTemplates.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => setGenPrompt(t.prompt)}
                      className="px-3 py-1.5 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium transition border border-indigo-100"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-Save Checkbox & Submit Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={autoSaveToProject}
                    onChange={(e) => setAutoSaveToProject(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <span>
                    ⚡ Auto-save directly into Project & Kanban Board immediately
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={generatingTasks || !genPrompt.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generatingTasks ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating & Saving Tasks...
                    </>
                  ) : (
                    <>
                      <span>✨</span> Generate {genCount} Tasks
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Generated Tasks Preview Section */}
          {generatedTasks.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <span>✨</span> Generated AI Tasks ({generatedTasks.length} tasks)
                  </h3>
                  <p className="text-xs text-gray-400">
                    {autoSaveToProject
                      ? 'These tasks are saved in your project database and visible across Kanban and Dashboard.'
                      : 'Review and select which tasks to import into your project.'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {!autoSaveToProject && (
                    <>
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        {selectedTaskIndices.length === generatedTasks.length ? 'Deselect All' : 'Select All'}
                      </button>

                      <button
                        onClick={handleImportTasks}
                        disabled={importingTasks || selectedTaskIndices.length === 0}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {importingTasks ? 'Importing...' : `📥 Import ${selectedTaskIndices.length} Tasks`}
                      </button>
                    </>
                  )}

                  <Link
                    to="/kanban"
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition"
                  >
                    View on Kanban Board →
                  </Link>
                </div>
              </div>

              {/* Tasks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {generatedTasks.map((task, idx) => {
                  const isSelected = selectedTaskIndices.includes(idx);

                  return (
                    <div
                      key={task._id || idx}
                      onClick={() => !autoSaveToProject && toggleTaskSelection(idx)}
                      className={`p-4 rounded-xl border transition flex items-start gap-3.5 bg-white border-gray-100 shadow-sm ${
                        !autoSaveToProject ? (isSelected ? 'bg-indigo-50/40 border-indigo-200 cursor-pointer' : 'opacity-60 cursor-pointer') : ''
                      }`}
                    >
                      {!autoSaveToProject && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                      )}

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{task.title}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getPriorityBadge(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>

                        <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>

                        <div className="pt-2 text-[11px] text-gray-400 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Set by AI'}</span>
                          </span>

                          <span className="capitalize font-semibold text-indigo-600 text-[10px]">
                            Status: {task.status || 'To Do'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Current Live Tasks for Selected Project */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-800">
                  Current Tasks in Project ({projectTasks.length} active)
                </h3>
                <p className="text-xs text-gray-400">
                  Live snapshot from database. Any generated or manual task is updated here.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/kanban" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                  Kanban Board →
                </Link>
                <Link to="/dashboard" className="text-xs font-bold text-purple-600 hover:text-purple-700">
                  Dashboard →
                </Link>
              </div>
            </div>

            {loadingTasks ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              </div>
            ) : projectTasks.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">
                No tasks yet in this project. Use the generator above to create and add them!
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {projectTasks.map((t) => (
                  <div
                    key={t._id}
                    className="p-3 bg-gray-50/70 border border-gray-100 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <span className="font-semibold text-gray-800">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getPriorityBadge(t.priority)}`}>
                        {t.priority}
                      </span>
                      <span className="text-gray-400 capitalize">{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: PROGRESS AUDIT & SUMMARY --- */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-1">AI Project Progress & Health Audit</h2>
            <p className="text-xs text-gray-500 mb-6">
              Generate an intelligent audit assessing completion velocity, overdue bottlenecks, and recommended next steps.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-80">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Select Project</label>
                <select
                  value={auditProjectId}
                  onChange={(e) => setAuditProjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleRunAudit}
                disabled={auditing || !auditProjectId}
                className="mt-5 sm:mt-5 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-semibold transition shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {auditing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing Project...
                  </>
                ) : (
                  <>
                    <span>📊</span> Run Project Audit
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Audit Results Presentation */}
          {auditResult && (
            <div className="space-y-6">
              {/* Header Score Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="flex items-center gap-4 md:col-span-2">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-md">
                    {auditResult.summary?.healthScore || 85}
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase">
                      {auditResult.summary?.statusVerdict || 'Healthy & On Track'}
                    </span>
                    <h3 className="text-lg font-bold text-gray-800 mt-1">
                      Project Health Score: {auditResult.summary?.healthScore || 85}/100
                    </h3>
                    <p className="text-xs text-gray-400">
                      Evaluated based on task velocity, completion percentage, and overdue items.
                    </p>
                  </div>
                </div>

                {/* Quick Task Stats */}
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100 text-center text-xs">
                  <div>
                    <p className="font-bold text-gray-800 text-base">{auditResult.stats?.totalTasks || 0}</p>
                    <p className="text-gray-400">Total</p>
                  </div>
                  <div className="h-6 w-px bg-gray-200"></div>
                  <div>
                    <p className="font-bold text-emerald-600 text-base">{auditResult.stats?.completedTasks || 0}</p>
                    <p className="text-gray-400">Completed</p>
                  </div>
                  <div className="h-6 w-px bg-gray-200"></div>
                  <div>
                    <p className="font-bold text-rose-600 text-base">{auditResult.stats?.overdueTasks || 0}</p>
                    <p className="text-gray-400">Overdue</p>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Executive Summary */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3">
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <span>📝</span> Executive Summary
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                    {auditResult.summary?.executiveSummary}
                  </p>
                </div>

                {/* Bottlenecks & Risks */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3">
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <span>⚠️</span> Identified Bottlenecks & Risks
                  </h4>
                  <div className="space-y-2">
                    {auditResult.summary?.bottlenecks?.map((item, i) => (
                      <div key={i} className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommended Next Actions */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <span>🚀</span> Recommended Next Actions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {auditResult.summary?.recommendations?.map((rec, i) => (
                    <div key={i} className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1">
                      <span className="font-bold text-indigo-600">Step {i + 1}</span>
                      <p>{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: AI ADVISOR CHAT --- */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[650px] overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg shadow-sm">
                🤖
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">ProjectAI Chat Assistant</h3>
                <p className="text-xs text-gray-400">Ask any agile project planning or management question</p>
              </div>
            </div>

            {/* Context Project Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Context:</span>
              <select
                value={chatProjectId}
                onChange={(e) => setChatProjectId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">General (No project)</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-2xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
                  }`}
                >
                  {msg.role === 'user' ? 'You' : '🤖'}
                </div>

                <div>
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm'
                        : 'bg-gray-100 text-gray-800 rounded-tl-none prose prose-xs'
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block px-1">{msg.time}</span>
                </div>
              </div>
            ))}

            {sendingChat && (
              <div className="flex gap-3 max-w-xl">
                <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs">
                  🤖
                </div>
                <div className="p-3.5 bg-gray-100 rounded-2xl rounded-tl-none text-xs text-gray-500 flex items-center gap-2">
                  <span className="animate-pulse">Thinking & generating advice...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-gray-400 text-[11px] shrink-0">Suggestions:</span>
            {[
              'How can I catch up on overdue tasks?',
              'Sprint prioritization tips',
              'Break down testing phase',
            ].map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => setChatInput(sug)}
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 border border-gray-200 rounded-lg shrink-0 transition"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendChat} className="p-4 bg-white border-t border-gray-100 flex items-center gap-3">
            <input
              type="text"
              placeholder="Ask ProjectAI Assistant for advice..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={sendingChat || !chatInput.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
            >
              <span>Send</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;

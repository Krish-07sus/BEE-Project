// --- Projects Page (Placeholder for Member 2) ---

const Projects = () => {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Projects</h1>
        <p className="text-gray-500 mt-1">Manage your projects and tasks</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-4xl mb-4">📋</div>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Project & Task Management</h2>
        <p className="text-gray-400">This section will be implemented by Member 2 — Project & Task Management</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm">Create Projects</span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-sm">Assign Tasks</span>
          <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-sm">Set Priorities</span>
          <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-sm">Due Dates</span>
        </div>
      </div>
    </div>
  );
};

export default Projects;

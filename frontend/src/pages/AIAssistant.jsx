// --- AI Assistant Page (Placeholder for Member 4) ---

const AIAssistant = () => {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">AI Assistant</h1>
        <p className="text-gray-500 mt-1">AI-powered project intelligence</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Task Generator Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center hover:shadow-md transition duration-200">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">
            🤖
          </div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">AI Task Generator</h2>
          <p className="text-gray-400 text-sm">Automatically generate tasks from project descriptions using AI</p>
        </div>

        {/* AI Progress Summary Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center hover:shadow-md transition duration-200">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">
            📈
          </div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">AI Progress Summary</h2>
          <p className="text-gray-400 text-sm">Get intelligent summaries of your project progress and insights</p>
        </div>
      </div>

      {/* Placeholder Notice */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
        <p className="text-gray-400 text-sm">AI features will be implemented by Member 4 — AI Module & Integration</p>
      </div>
    </div>
  );
};

export default AIAssistant;

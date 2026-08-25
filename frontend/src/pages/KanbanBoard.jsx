// --- Kanban Board Page (Placeholder for Member 3) ---

const KanbanBoard = () => {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Kanban Board</h1>
        <p className="text-gray-500 mt-1">Visualize your task progress</p>
      </div>

      {/* Placeholder Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'To Do', color: 'border-t-blue-500', emoji: '📝' },
          { title: 'In Progress', color: 'border-t-yellow-500', emoji: '🔄' },
          { title: 'Completed', color: 'border-t-green-500', emoji: '✅' },
        ].map((col) => (
          <div key={col.title} className={`bg-white rounded-xl shadow-sm border border-gray-100 border-t-4 ${col.color} p-6 min-h-[300px]`}>
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span>{col.emoji}</span> {col.title}
            </h3>
            <div className="flex items-center justify-center h-40 text-gray-300 text-sm">
              No tasks yet
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder Notice */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
        <p className="text-gray-400 text-sm">Kanban Board will be implemented by Member 3 — Dashboard & Kanban</p>
      </div>
    </div>
  );
};

export default KanbanBoard;

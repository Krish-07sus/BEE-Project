import { useAuth } from '../context/AuthContext';

// --- Dashboard Page (Placeholder for Member 3) ---

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.name}!</p>
      </div>

      {/* Placeholder Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Projects', value: '0', color: 'bg-indigo-500', icon: '📁' },
          { label: 'Total Tasks', value: '0', color: 'bg-emerald-500', icon: '✅' },
          { label: 'Completed', value: '0', color: 'bg-purple-500', icon: '🎯' },
          { label: 'Overdue', value: '0', color: 'bg-rose-500', icon: '⏰' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-xl shadow-sm`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder Notice */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Dashboard Module</h2>
        <p className="text-gray-400">This section will be implemented by Member 3 — Dashboard & Kanban</p>
      </div>
    </div>
  );
};

export default Dashboard;

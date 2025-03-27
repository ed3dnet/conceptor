import { useTenantContext } from "../context.ts";

export default function DashboardPage() {
  const { currentUser } = useTenantContext();

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Welcome, {currentUser.displayName}</h2>
          <p>
            This is your tenant dashboard. Here you'll find an overview of your
            organization's data and insights.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {/* Placeholder for dashboard widgets */}
            <div className="stat bg-base-200 rounded-box">
              <div className="stat-title">Total Users</div>
              <div className="stat-value">89</div>
              <div className="stat-desc">21% more than last month</div>
            </div>

            <div className="stat bg-base-200 rounded-box">
              <div className="stat-title">Active Projects</div>
              <div className="stat-value">12</div>
              <div className="stat-desc">3 added this week</div>
            </div>

            <div className="stat bg-base-200 rounded-box">
              <div className="stat-title">Pending Tasks</div>
              <div className="stat-value">24</div>
              <div className="stat-desc">7 due today</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

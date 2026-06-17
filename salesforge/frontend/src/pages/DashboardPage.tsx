import { useDashboardStats, usePipelineByStage, useRecentActivities } from '../api/dashboard'
import KpiTile from '../components/dashboard/KpiTile'
import PipelineChart from '../components/dashboard/PipelineChart'

const TYPE_ICONS: Record<string, string> = {
  call: '📞', email: '✉️', meeting: '👥', note: '📝', task: '✅',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: pipeline } = usePipelineByStage()
  const { data: activities } = useRecentActivities()

  if (statsLoading) {
    return <p className="text-sm text-gray-500 py-4">Loading dashboard...</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* KPI Tiles */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-8">
          <KpiTile label="New Leads This Week" value={stats.leads_this_week} />
          <KpiTile label="Pipeline Value" value={`$${stats.pipeline_value.toLocaleString()}`} />
          <KpiTile label="Deals Won (Month)" value={stats.deals_won_this_month} />
          <KpiTile
            label="Won Value (Month)"
            value={`$${stats.deals_won_value_this_month.toLocaleString()}`}
          />
          <KpiTile label="Overdue Activities" value={stats.overdue_activities} />
        </div>
      )}

      {/* Pipeline Chart */}
      {pipeline && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Pipeline by Stage
          </h2>
          <PipelineChart data={pipeline} />
        </div>
      )}

      {/* Recent Activities */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Recent Activities
        </h2>
        {!activities || activities.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activities.</p>
        ) : (
          <ul className="space-y-3">
            {activities.map(activity => (
              <li key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg shrink-0" aria-hidden="true">
                  {TYPE_ICONS[activity.type] ?? '📋'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500">
                    {activity.linked_record_name && (
                      <span>{activity.linked_record_name} · </span>
                    )}
                    {formatDate(activity.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

import type { LinkedActivity } from '../../types/contact'

interface ActivityTimelineProps {
  activities: LinkedActivity[]
  onLogActivity?: () => void
}

const TYPE_LABELS: Record<string, string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  note: 'Note',
  task: 'Task',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ActivityTimeline({ activities, onLogActivity }: ActivityTimelineProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Activities</h3>
        {onLogActivity && (
          <button
            onClick={onLogActivity}
            className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
          >
            Log Activity
          </button>
        )}
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No activities yet.</p>
      ) : (
        <ul className="space-y-3">
          {activities.map(activity => (
            <li key={activity.id} data-testid="activity-item" className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 shrink-0">
                {TYPE_LABELS[activity.type] ?? activity.type}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                <p className="text-xs text-gray-500">
                  {activity.due_date ? `Due: ${formatDate(activity.due_date)}` : formatDate(activity.created_at)}
                  {activity.completed && (
                    <span className="ml-2 text-green-600 font-medium">Completed</span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

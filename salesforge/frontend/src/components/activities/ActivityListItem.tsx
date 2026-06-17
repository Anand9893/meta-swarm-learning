import type { Activity } from '../../types/activity'

interface ActivityListItemProps {
  activity: Activity
  onToggleComplete: (id: string, completed: boolean) => void
  onDelete?: (id: string) => void
}

const TYPE_LABELS: Record<string, string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  note: 'Note',
  task: 'Task',
}

function isOverdue(activity: Activity): boolean {
  if (!activity.due_date || activity.completed) return false
  return new Date(activity.due_date) < new Date()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ActivityListItem({ activity, onToggleComplete, onDelete }: ActivityListItemProps) {
  const overdue = isOverdue(activity)

  return (
    <div className={`flex items-start gap-3 p-4 bg-white border rounded-lg ${overdue ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
      <input
        type="checkbox"
        checked={activity.completed}
        onChange={() => onToggleComplete(activity.id, !activity.completed)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        aria-label={`Mark "${activity.title}" as ${activity.completed ? 'incomplete' : 'complete'}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${activity.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {activity.title}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            {TYPE_LABELS[activity.type] ?? activity.type}
          </span>
          {overdue && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
              Overdue
            </span>
          )}
        </div>
        {activity.due_date && (
          <p className="text-xs text-gray-500 mt-1">
            Due: {formatDate(activity.due_date)}
          </p>
        )}
      </div>
      {onDelete && (
        <button
          onClick={() => onDelete(activity.id)}
          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
        >
          Delete
        </button>
      )}
    </div>
  )
}

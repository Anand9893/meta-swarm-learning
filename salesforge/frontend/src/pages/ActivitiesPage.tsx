import { useState } from 'react'
import { useActivities, useCreateActivity, useDeleteActivity, useToggleComplete } from '../api/activities'
import ActivityForm from '../components/activities/ActivityForm'
import ActivityListItem from '../components/activities/ActivityListItem'
import type { ActivityCreate } from '../types/activity'

const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'task'] as const
const TYPE_LABELS: Record<string, string> = {
  call: 'Call', email: 'Email', meeting: 'Meeting', note: 'Note', task: 'Task',
}

export default function ActivitiesPage() {
  const [typeFilter, setTypeFilter] = useState('')
  const [completedFilter, setCompletedFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const completedParam =
    completedFilter === 'pending' ? false :
    completedFilter === 'completed' ? true :
    undefined

  const { data, isLoading } = useActivities({
    type: typeFilter || undefined,
    completed: completedParam,
    page,
  })

  const createActivity = useCreateActivity()
  const deleteActivity = useDeleteActivity()
  const toggleComplete = useToggleComplete()

  const PAGE_SIZE = 20
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0

  async function handleCreate(formData: ActivityCreate) {
    setCreateError(null)
    try {
      await createActivity.mutateAsync(formData)
      setShowForm(false)
    } catch {
      setCreateError('Failed to log activity. Please try again.')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this activity?')) return
    await deleteActivity.mutateAsync(id)
  }

  function handleToggle(id: string, completed: boolean) {
    toggleComplete.mutate({ id, completed })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
        <button
          onClick={() => { setShowForm(s => !s); setCreateError(null) }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          New Activity
        </button>
      </div>

      {showForm && (
        <ActivityForm
          onSubmit={handleCreate}
          onCancel={() => { setShowForm(false); setCreateError(null) }}
          isLoading={createActivity.isPending}
          error={createError}
        />
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          aria-label="Filter by type"
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Types</option>
          {ACTIVITY_TYPES.map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          value={completedFilter}
          onChange={e => { setCompletedFilter(e.target.value as typeof completedFilter); setPage(1) }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {isLoading && <p className="text-sm text-gray-500 py-4">Loading activities...</p>}

      {!isLoading && data?.items.length === 0 && (
        <p className="text-sm text-gray-500 py-8 text-center">No activities found.</p>
      )}

      <div className="space-y-2">
        {data?.items.map(activity => (
          <ActivityListItem
            key={activity.id}
            activity={activity}
            onToggleComplete={handleToggle}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  )
}

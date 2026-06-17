import { useState } from 'react'
import type { ActivityCreate } from '../../types/activity'

const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'task'] as const

interface ActivityFormProps {
  dealId?: string
  contactId?: string
  leadId?: string
  onSubmit: (data: ActivityCreate) => void | Promise<void>
  onCancel: () => void
  isLoading?: boolean
  error?: string | null
}

export default function ActivityForm({
  dealId,
  contactId,
  leadId,
  onSubmit,
  onCancel,
  isLoading,
  error,
}: ActivityFormProps) {
  const [type, setType] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError(null)
    if (!type) {
      setValidationError('Activity type is required')
      return
    }
    if (!title.trim()) {
      setValidationError('Activity title is required')
      return
    }
    onSubmit({
      type,
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate || undefined,
      deal_id: dealId,
      contact_id: contactId,
      lead_id: leadId,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Log Activity</h2>

      {(error ?? validationError) && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error ?? validationError}
        </div>
      )}

      {/* Hidden pre-filled fields */}
      {dealId && <input type="hidden" name="deal_id" value={dealId} />}
      {contactId && <input type="hidden" name="contact_id" value={contactId} />}
      {leadId && <input type="hidden" name="lead_id" value={leadId} />}

      <div className="space-y-4">
        <div>
          <label htmlFor="activity_type" className="block text-sm font-medium text-gray-700 mb-1">
            Type *
          </label>
          <select
            id="activity_type"
            value={type}
            onChange={e => setType(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select type...</option>
            {ACTIVITY_TYPES.map(t => (
              <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="activity_title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            id="activity_title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="activity_description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="activity_description"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="activity_due_date" className="block text-sm font-medium text-gray-700 mb-1">
            Due Date
          </label>
          <input
            id="activity_due_date"
            type="datetime-local"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Log Activity
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useDeal, useUpdateDeal, useDeleteDeal } from '../api/deals'
import { useActivities } from '../api/activities'
import DealForm from '../components/deals/DealForm'
import type { DealStage, DealUpdate } from '../types/deal'

const STAGE_LABELS: Record<DealStage, string> = {
  prospect: 'Prospect',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

const STAGE_STYLES: Record<DealStage, string> = {
  prospect: 'bg-gray-100 text-gray-800',
  proposal: 'bg-blue-100 text-blue-800',
  negotiation: 'bg-yellow-100 text-yellow-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const { data: deal, isLoading } = useDeal(id!)
  const { data: activitiesData } = useActivities({ deal_id: id })
  const updateDeal = useUpdateDeal()
  const deleteDeal = useDeleteDeal()

  async function handleUpdate(formData: DealUpdate) {
    setUpdateError(null)
    try {
      await updateDeal.mutateAsync({ id: id!, ...formData })
      setIsEditing(false)
    } catch {
      setUpdateError('Failed to update deal.')
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this deal? This cannot be undone.')) return
    try {
      await deleteDeal.mutateAsync(id!)
      navigate('/deals')
    } catch {
      // ignore
    }
  }

  if (isLoading) return <p className="text-sm text-gray-500 py-4">Loading deal...</p>
  if (!deal) return <p className="text-sm text-gray-500 py-4">Deal not found.</p>

  return (
    <div className="max-w-3xl">
      <nav className="mb-4 text-sm text-gray-500">
        <Link to="/deals" className="hover:text-blue-600">Deals</Link>
        <span className="mx-2">/</span>
        <span>{deal.title}</span>
      </nav>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{deal.title}</h1>
          <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STAGE_STYLES[deal.stage]}`}>
            {STAGE_LABELS[deal.stage]}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setIsEditing(s => !s); setUpdateError(null) }}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {isEditing ? (
        <DealForm
          initialValues={{
            title: deal.title,
            value: deal.value ?? undefined,
            stage: deal.stage,
            probability: deal.probability,
            expected_close_date: deal.expected_close_date ?? undefined,
          }}
          onSubmit={handleUpdate}
          onCancel={() => { setIsEditing(false); setUpdateError(null) }}
          isLoading={updateDeal.isPending}
          error={updateError}
        />
      ) : (
        <dl className="grid grid-cols-2 gap-6 bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Value</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {deal.value != null ? `$${deal.value.toLocaleString()} ${deal.currency}` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Probability</dt>
            <dd className="mt-1 text-sm text-gray-900">{deal.probability}%</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expected Close</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(deal.expected_close_date)}</dd>
          </div>
        </dl>
      )}

      {/* Activities section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Activities</h2>
          <button
            onClick={() => alert('Log Activity — coming in WU-15')}
            className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
          >
            Log Activity
          </button>
        </div>
        {!activitiesData || activitiesData.items.length === 0 ? (
          <p className="text-sm text-gray-500">No activities yet.</p>
        ) : (
          <ul className="space-y-2">
            {activitiesData.items.map(activity => (
              <li key={activity.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                <p className="text-xs text-gray-500">{activity.type}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

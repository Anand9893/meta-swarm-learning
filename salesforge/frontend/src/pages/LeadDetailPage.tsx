import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLead, useUpdateLead, useDeleteLead } from '../api/leads'
import LeadForm from '../components/leads/LeadForm'
import ConvertLeadModal from '../components/leads/ConvertLeadModal'
import type { LeadStatus, LeadUpdate } from '../types/lead'

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-green-100 text-green-800',
  converted: 'bg-purple-100 text-purple-800',
  lost: 'bg-gray-100 text-gray-800',
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
  lost: 'Lost',
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: lead, isLoading } = useLead(id!)
  const updateLead = useUpdateLead()
  const deleteLead = useDeleteLead()

  async function handleUpdate(formData: LeadUpdate) {
    setUpdateError(null)
    try {
      await updateLead.mutateAsync({ id: id!, ...formData })
      setIsEditing(false)
    } catch {
      setUpdateError('Failed to update lead.')
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this lead? This cannot be undone.')) return
    setDeleteError(null)
    try {
      await deleteLead.mutateAsync(id!)
      navigate('/leads')
    } catch {
      setDeleteError('Failed to delete lead.')
    }
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500 py-4">Loading lead...</p>
  }

  if (!lead) {
    return <p className="text-sm text-red-600 py-4">Lead not found.</p>
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4">
        <Link to="/leads" className="hover:text-blue-600">
          Leads
        </Link>
        <span className="mx-2">›</span>
        <span>
          {lead.first_name} {lead.last_name}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {lead.first_name} {lead.last_name}
          </h1>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[lead.status]}`}
          >
            {STATUS_LABELS[lead.status]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {lead.status !== 'converted' && (
            <button
              onClick={() => setShowConvert(true)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
            >
              Convert
            </button>
          )}
          <button
            onClick={() => { setIsEditing(e => !e); setUpdateError(null) }}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {isEditing ? 'Cancel Edit' : 'Edit'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteLead.isPending}
            className="px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="mb-4 rounded-md bg-red-50 p-3" role="alert">
          <p className="text-sm text-red-700">{deleteError}</p>
        </div>
      )}

      {/* Edit form or detail view */}
      {isEditing ? (
        <LeadForm
          lead={lead}
          onSubmit={handleUpdate}
          onCancel={() => { setIsEditing(false); setUpdateError(null) }}
          isLoading={updateLead.isPending}
          error={updateError}
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            {lead.email && (
              <>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{lead.email}</dd>
              </>
            )}
            {lead.phone && (
              <>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="text-sm text-gray-900">{lead.phone}</dd>
              </>
            )}
            {lead.company_name && (
              <>
                <dt className="text-sm font-medium text-gray-500">Company</dt>
                <dd className="text-sm text-gray-900">{lead.company_name}</dd>
              </>
            )}
            {lead.source && (
              <>
                <dt className="text-sm font-medium text-gray-500">Source</dt>
                <dd className="text-sm text-gray-900">{lead.source}</dd>
              </>
            )}
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="text-sm text-gray-900">
              {new Date(lead.created_at).toLocaleDateString()}
            </dd>
            {lead.notes && (
              <>
                <dt className="text-sm font-medium text-gray-500 col-span-2">Notes</dt>
                <dd className="text-sm text-gray-900 col-span-2 whitespace-pre-wrap">
                  {lead.notes}
                </dd>
              </>
            )}
          </dl>
        </div>
      )}

      {/* Activities placeholder */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activities</h2>
        <p className="text-sm text-gray-500 italic">No activities yet.</p>
      </div>

      {showConvert && (
        <ConvertLeadModal
          lead={lead}
          onClose={() => setShowConvert(false)}
          onSuccess={(contactId) => navigate(`/contacts/${contactId}`)}
        />
      )}
    </div>
  )
}

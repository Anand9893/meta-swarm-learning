import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useContact, useUpdateContact, useDeleteContact } from '../api/contacts'
import ContactForm from '../components/contacts/ContactForm'
import ActivityTimeline from '../components/contacts/ActivityTimeline'
import type { Contact, ContactCreate } from '../types/contact'

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: contact, isLoading } = useContact(id!)
  const updateContact = useUpdateContact()
  const deleteContact = useDeleteContact()

  async function handleUpdate(formData: ContactCreate) {
    setUpdateError(null)
    try {
      await updateContact.mutateAsync({ id: id!, ...formData })
      setIsEditing(false)
    } catch {
      setUpdateError('Failed to update contact.')
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this contact? This cannot be undone.')) return
    setDeleteError(null)
    try {
      await deleteContact.mutateAsync(id!)
      navigate('/contacts')
    } catch {
      setDeleteError('Failed to delete contact.')
    }
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500 py-4">Loading contact...</p>
  }

  if (!contact) {
    return <p className="text-sm text-red-600 py-4">Contact not found.</p>
  }

  const fullName = `${contact.first_name} ${contact.last_name}`

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4">
        <Link to="/contacts" className="hover:text-blue-600">
          Contacts
        </Link>
        <span className="mx-2">›</span>
        <span>{fullName}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setIsEditing(e => !e); setUpdateError(null) }}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {isEditing ? 'Cancel Edit' : 'Edit'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteContact.isPending}
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
        <ContactForm
          initialValues={{
            first_name: contact.first_name,
            last_name: contact.last_name,
            email: contact.email ?? undefined,
            phone: contact.phone ?? undefined,
            title: contact.title ?? undefined,
          }}
          onSubmit={handleUpdate}
          onCancel={() => { setIsEditing(false); setUpdateError(null) }}
          isLoading={updateContact.isPending}
          error={updateError}
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            {contact.email && (
              <>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{contact.email}</dd>
              </>
            )}
            {contact.phone && (
              <>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="text-sm text-gray-900">{contact.phone}</dd>
              </>
            )}
            {contact.title && (
              <>
                <dt className="text-sm font-medium text-gray-500">Title</dt>
                <dd className="text-sm text-gray-900">{contact.title}</dd>
              </>
            )}
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="text-sm text-gray-900">
              {new Date(contact.created_at).toLocaleDateString()}
            </dd>
          </dl>
        </div>
      )}

      {/* Deals section */}
      {!isEditing && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Deals</h2>
          {contact.deals.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No deals linked.</p>
          ) : (
            <div className="space-y-2">
              {contact.deals.map(deal => (
                <div
                  key={deal.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{deal.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Stage: {deal.stage}
                      {deal.value != null && ` · $${deal.value.toLocaleString()}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activities timeline */}
      {!isEditing && (
        <div>
          <ActivityTimeline
            activities={contact.activities}
            onLogActivity={() => {
              // ActivityForm integration will be wired in WU-15
              alert('Log Activity — coming soon')
            }}
          />
        </div>
      )}
    </div>
  )
}

// Re-export Contact type helper for use by parent components
export type { Contact }

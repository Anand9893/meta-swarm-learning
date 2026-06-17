import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useContacts, useCreateContact } from '../api/contacts'
import ContactForm from '../components/contacts/ContactForm'
import type { Contact } from '../types/contact'
import type { ContactCreate } from '../types/contact'

function ContactCard({ contact }: { contact: Contact }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:border-gray-300 transition-colors">
      <div className="min-w-0">
        <Link
          to={`/contacts/${contact.id}`}
          className="text-sm font-semibold text-gray-900 hover:text-blue-600"
        >
          {contact.first_name} {contact.last_name}
        </Link>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
          {contact.email && <span className="truncate">{contact.email}</span>}
          {contact.title && <span>{contact.title}</span>}
        </div>
      </div>
    </div>
  )
}

export default function ContactsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const { data, isLoading } = useContacts({
    search: search || undefined,
    page,
  })

  const createContact = useCreateContact()

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0

  async function handleCreate(formData: ContactCreate) {
    setCreateError(null)
    try {
      await createContact.mutateAsync(formData)
      setShowForm(false)
    } catch {
      setCreateError('Failed to create contact. Please try again.')
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <button
          onClick={() => { setShowForm(s => !s); setCreateError(null) }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          New Contact
        </button>
      </div>

      {showForm && (
        <ContactForm
          onSubmit={handleCreate}
          onCancel={() => { setShowForm(false); setCreateError(null) }}
          isLoading={createContact.isPending}
          error={createError}
        />
      )}

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input
            id="search"
            type="text"
            aria-label="Search contacts"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-3 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
          >
            Search
          </button>
        </form>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-500 py-4">Loading contacts...</p>
      )}

      {!isLoading && data?.items.length === 0 && (
        <p className="text-sm text-gray-500 py-8 text-center">No contacts found.</p>
      )}

      <div className="space-y-2">
        {data?.items.map(contact => (
          <ContactCard key={contact.id} contact={contact} />
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
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
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

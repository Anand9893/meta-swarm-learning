import { useState } from 'react'
import { useLeads, useCreateLead } from '../api/leads'
import LeadCard from '../components/leads/LeadCard'
import LeadForm from '../components/leads/LeadForm'
import type { LeadCreate, LeadUpdate } from '../types/lead'

export default function LeadsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const { data, isLoading } = useLeads({
    search: search || undefined,
    status: statusFilter || undefined,
    page,
  })

  const createLead = useCreateLead()

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0

  async function handleCreate(formData: LeadCreate | LeadUpdate) {
    setCreateError(null)
    try {
      await createLead.mutateAsync(formData as LeadCreate)
      setShowForm(false)
    } catch {
      setCreateError('Failed to create lead. Please try again.')
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatusFilter(e.target.value)
    setPage(1)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <button
          onClick={() => { setShowForm(s => !s); setCreateError(null) }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          New Lead
        </button>
      </div>

      {showForm && (
        <LeadForm
          onSubmit={handleCreate}
          onCancel={() => { setShowForm(false); setCreateError(null) }}
          isLoading={createLead.isPending}
          error={createError}
        />
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input
            id="search"
            type="text"
            aria-label="Search leads"
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

        <select
          id="status-filter"
          aria-label="Filter by status"
          value={statusFilter}
          onChange={handleStatusChange}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="converted">Converted</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-500 py-4">Loading leads...</p>
      )}

      {!isLoading && data?.items.length === 0 && (
        <p className="text-sm text-gray-500 py-8 text-center">No leads found.</p>
      )}

      <div className="space-y-2">
        {data?.items.map(lead => (
          <LeadCard key={lead.id} lead={lead} />
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

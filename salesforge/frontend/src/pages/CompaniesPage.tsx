import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCompanies, useCreateCompany, useDeleteCompany } from '../api/companies'
import CompanyForm from '../components/companies/CompanyForm'
import type { Company } from '../types/company'
import type { CompanyCreate } from '../types/company'

const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail', 'Other']

function CompanyCard({ company, onDelete }: { company: Company; onDelete: (id: string) => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:border-gray-300 transition-colors">
      <div className="min-w-0">
        <Link
          to={`/companies/${company.id}`}
          className="text-sm font-semibold text-gray-900 hover:text-blue-600"
        >
          {company.name}
        </Link>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
          {company.industry && <span>{company.industry}</span>}
          {company.website && <span className="truncate">{company.website}</span>}
        </div>
      </div>
      <button
        onClick={() => onDelete(company.id)}
        className="ml-4 px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  )
}

export default function CompaniesPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [industry, setIndustry] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const { data, isLoading } = useCompanies({
    search: search || undefined,
    industry: industry || undefined,
    page,
  })

  const createCompany = useCreateCompany()
  const deleteCompany = useDeleteCompany()

  const PAGE_SIZE = 20
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0

  async function handleCreate(formData: CompanyCreate) {
    setCreateError(null)
    try {
      await createCompany.mutateAsync(formData)
      setShowForm(false)
    } catch {
      setCreateError('Failed to create company. Please try again.')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this company?')) return
    await deleteCompany.mutateAsync(id)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  function handleIndustryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setIndustry(e.target.value)
    setPage(1)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
        <button
          onClick={() => { setShowForm(s => !s); setCreateError(null) }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          New Company
        </button>
      </div>

      {showForm && (
        <CompanyForm
          onSubmit={handleCreate}
          onCancel={() => { setShowForm(false); setCreateError(null) }}
          isLoading={createCompany.isPending}
          error={createError}
        />
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input
            id="search"
            type="text"
            aria-label="Search companies"
            placeholder="Search companies..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
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
          aria-label="Filter by industry"
          value={industry}
          onChange={handleIndustryChange}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Industries</option>
          {INDUSTRIES.map(ind => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm text-gray-500 py-4">Loading companies...</p>}

      {!isLoading && data?.items.length === 0 && (
        <p className="text-sm text-gray-500 py-8 text-center">No companies found.</p>
      )}

      <div className="space-y-2">
        {data?.items.map(company => (
          <CompanyCard key={company.id} company={company} onDelete={handleDelete} />
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

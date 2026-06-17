import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCompany, useUpdateCompany, useDeleteCompany } from '../api/companies'
import CompanyForm from '../components/companies/CompanyForm'
import type { CompanyUpdate } from '../types/company'

type Tab = 'overview' | 'contacts' | 'deals'

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const { data: company, isLoading } = useCompany(id!)
  const updateCompany = useUpdateCompany()
  const deleteCompany = useDeleteCompany()

  async function handleUpdate(formData: CompanyUpdate) {
    setUpdateError(null)
    try {
      await updateCompany.mutateAsync({ id: id!, ...formData })
      setIsEditing(false)
    } catch {
      setUpdateError('Failed to update company.')
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this company? Contacts and deals will remain.')) return
    try {
      await deleteCompany.mutateAsync(id!)
      navigate('/companies')
    } catch {
      // ignore
    }
  }

  if (isLoading) return <p className="text-sm text-gray-500 py-4">Loading company...</p>
  if (!company) return <p className="text-sm text-gray-500 py-4">Company not found.</p>

  return (
    <div className="max-w-3xl">
      <nav className="mb-4 text-sm text-gray-500">
        <Link to="/companies" className="hover:text-blue-600">Companies</Link>
        <span className="mx-2">/</span>
        <span>{company.name}</span>
      </nav>

      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
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

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          {(['overview', 'contacts', 'deals'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize border-b-2 ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        isEditing ? (
          <CompanyForm
            initialValues={{
              name: company.name,
              website: company.website ?? undefined,
              industry: company.industry ?? undefined,
              phone: company.phone ?? undefined,
              address: company.address ?? undefined,
              notes: company.notes ?? undefined,
            }}
            onSubmit={handleUpdate}
            onCancel={() => { setIsEditing(false); setUpdateError(null) }}
            isLoading={updateCompany.isPending}
            error={updateError}
          />
        ) : (
          <dl className="grid grid-cols-2 gap-6 bg-white border border-gray-200 rounded-lg p-6">
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Website</dt>
              <dd className="mt-1 text-sm text-gray-900">{company.website ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Industry</dt>
              <dd className="mt-1 text-sm text-gray-900">{company.industry ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</dt>
              <dd className="mt-1 text-sm text-gray-900">{company.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Address</dt>
              <dd className="mt-1 text-sm text-gray-900">{company.address ?? '—'}</dd>
            </div>
            {company.notes && (
              <div className="col-span-2">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900">{company.notes}</dd>
              </div>
            )}
          </dl>
        )
      )}

      {activeTab === 'contacts' && (
        <div>
          {company.contacts.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No contacts linked to this company.</p>
          ) : (
            <ul className="space-y-2">
              {company.contacts.map(contact => (
                <li key={contact.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {contact.first_name} {contact.last_name}
                    </p>
                    <div className="flex gap-3 text-xs text-gray-500 mt-1">
                      {contact.email && <span>{contact.email}</span>}
                      {contact.title && <span>{contact.title}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'deals' && (
        <div>
          {company.deals.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No deals linked to this company.</p>
          ) : (
            <ul className="space-y-2">
              {company.deals.map(deal => (
                <li key={deal.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">{deal.title}</span>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="capitalize">{deal.stage}</span>
                    {deal.value != null && <span>${deal.value.toLocaleString()}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

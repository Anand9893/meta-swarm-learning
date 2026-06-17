import { useState } from 'react'
import type { Lead, LeadCreate, LeadUpdate, LeadStatus } from '../../types/lead'

interface LeadFormProps {
  lead?: Lead
  onSubmit: (data: LeadCreate | LeadUpdate) => void
  onCancel: () => void
  isLoading?: boolean
  error?: string | null
}

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
]

export default function LeadForm({ lead, onSubmit, onCancel, isLoading, error }: LeadFormProps) {
  const [firstName, setFirstName] = useState(lead?.first_name ?? '')
  const [lastName, setLastName] = useState(lead?.last_name ?? '')
  const [email, setEmail] = useState(lead?.email ?? '')
  const [phone, setPhone] = useState(lead?.phone ?? '')
  const [companyName, setCompanyName] = useState(lead?.company_name ?? '')
  const [source, setSource] = useState(lead?.source ?? '')
  const [notes, setNotes] = useState(lead?.notes ?? '')
  const [status, setStatus] = useState<LeadStatus>(lead?.status ?? 'new')
  const [validationError, setValidationError] = useState<string | null>(null)

  const isEdit = !!lead

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim()) {
      setValidationError('First name is required')
      return
    }
    if (!lastName.trim()) {
      setValidationError('Last name is required')
      return
    }
    setValidationError(null)

    const data: LeadCreate | LeadUpdate = {
      first_name: firstName,
      last_name: lastName,
      ...(email && { email }),
      ...(phone && { phone }),
      ...(companyName && { company_name: companyName }),
      ...(source && { source }),
      ...(notes && { notes }),
      ...(isEdit && { status }),
    }
    onSubmit(data)
  }

  const displayError = validationError ?? error

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white border border-gray-200 rounded-lg p-6 mb-6"
    >
      <h2 className="text-lg font-semibold text-gray-900">
        {isEdit ? 'Edit Lead' : 'New Lead'}
      </h2>

      {displayError && (
        <div className="rounded-md bg-red-50 p-3" role="alert">
          <p className="text-sm text-red-700">{displayError}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="first-name" className="block text-sm font-medium text-gray-700">
            First Name <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="first-name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="last-name" className="block text-sm font-medium text-gray-700">
            Last Name <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="last-name"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="company-name" className="block text-sm font-medium text-gray-700">
            Company
          </label>
          <input
            id="company-name"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="source" className="block text-sm font-medium text-gray-700">
            Source
          </label>
          <input
            id="source"
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {isEdit && (
        <div>
          <label htmlFor="lead-status" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="lead-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Lead'}
        </button>
      </div>
    </form>
  )
}

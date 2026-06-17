import { useState } from 'react'
import { useConvertLead } from '../../api/leads'
import type { Lead } from '../../types/lead'

interface ConvertLeadModalProps {
  lead: Lead
  onClose: () => void
  onSuccess: (contactId: string) => void
}

export default function ConvertLeadModal({ lead, onClose, onSuccess }: ConvertLeadModalProps) {
  const [createCompany, setCreateCompany] = useState(false)
  const [createDeal, setCreateDeal] = useState(false)
  const [dealTitle, setDealTitle] = useState('')
  const [dealValue, setDealValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const convertLead = useConvertLead()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const result = await convertLead.mutateAsync({
        id: lead.id,
        create_company: createCompany,
        create_deal: createDeal,
        ...(createDeal && dealTitle ? { deal_title: dealTitle } : {}),
        ...(createDeal && dealValue ? { deal_value: parseFloat(dealValue) } : {}),
      })
      onSuccess(result.contact_id)
    } catch {
      setError('Conversion failed — no records were created')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="convert-modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 id="convert-modal-title" className="text-lg font-semibold text-gray-900">
            Convert Lead
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3" role="alert">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact section — always created */}
          <div className="bg-gray-50 rounded-md p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Contact (always created)
            </p>
            <p className="text-sm text-gray-800">
              {lead.first_name} {lead.last_name}
              {lead.email && (
                <span className="text-gray-500"> · {lead.email}</span>
              )}
            </p>
          </div>

          {/* Create Company toggle */}
          <div className="flex items-start gap-3">
            <input
              id="create-company"
              type="checkbox"
              checked={createCompany}
              onChange={(e) => setCreateCompany(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <div>
              <label htmlFor="create-company" className="text-sm font-medium text-gray-700">
                Create Company
              </label>
              {createCompany && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {lead.company_name
                    ? `Will create: "${lead.company_name}"`
                    : 'No company name on lead — company creation will be skipped'}
                </p>
              )}
            </div>
          </div>

          {/* Create Deal toggle */}
          <div className="flex items-start gap-3">
            <input
              id="create-deal"
              type="checkbox"
              checked={createDeal}
              onChange={(e) => setCreateDeal(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="create-deal" className="text-sm font-medium text-gray-700">
              Create Deal
            </label>
          </div>

          {createDeal && (
            <div className="pl-7 space-y-3">
              <div>
                <label htmlFor="deal-title" className="block text-sm font-medium text-gray-700">
                  Deal Title
                </label>
                <input
                  id="deal-title"
                  type="text"
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="deal-value" className="block text-sm font-medium text-gray-700">
                  Deal Value
                </label>
                <input
                  id="deal-value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={dealValue}
                  onChange={(e) => setDealValue(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={convertLead.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {convertLead.isPending ? 'Converting...' : 'Convert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

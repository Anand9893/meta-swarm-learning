import { useState } from 'react'
import type { DealCreate, DealUpdate, DealStage } from '../../types/deal'
import { DEAL_STAGES, STAGE_DEFAULT_PROBABILITY } from '../../types/deal'

interface DealFormProps {
  initialValues?: Partial<DealUpdate>
  onSubmit: (data: DealCreate) => void | Promise<void>
  onCancel: () => void
  isLoading?: boolean
  error?: string | null
}

const STAGE_LABELS: Record<DealStage, string> = {
  prospect: 'Prospect',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

export default function DealForm({ initialValues, onSubmit, onCancel, isLoading, error }: DealFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [value, setValue] = useState(String(initialValues?.value ?? ''))
  const [stage, setStage] = useState<DealStage>((initialValues?.stage as DealStage) ?? 'prospect')
  const [probability, setProbability] = useState(
    String(initialValues?.probability ?? STAGE_DEFAULT_PROBABILITY.prospect)
  )
  const [closeDate, setCloseDate] = useState(initialValues?.expected_close_date ?? '')
  const [validationError, setValidationError] = useState<string | null>(null)

  const isEditing = !!initialValues

  function handleStageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStage = e.target.value as DealStage
    setStage(newStage)
    setProbability(String(STAGE_DEFAULT_PROBABILITY[newStage]))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError(null)
    if (!title.trim()) {
      setValidationError('Deal title is required')
      return
    }
    onSubmit({
      title: title.trim(),
      value: value ? Number(value) : undefined,
      stage,
      probability: probability ? Number(probability) : undefined,
      expected_close_date: closeDate || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {isEditing ? 'Edit Deal' : 'New Deal'}
      </h2>

      {(error ?? validationError) && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error ?? validationError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Deal Title *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
            Value ($)
          </label>
          <input
            id="value"
            type="number"
            min="0"
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="stage" className="block text-sm font-medium text-gray-700 mb-1">
            Stage
          </label>
          <select
            id="stage"
            value={stage}
            onChange={handleStageChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {DEAL_STAGES.map(s => (
              <option key={s} value={s}>{STAGE_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="probability" className="block text-sm font-medium text-gray-700 mb-1">
            Probability (%)
          </label>
          <input
            id="probability"
            type="number"
            min="0"
            max="100"
            value={probability}
            onChange={e => setProbability(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="close_date" className="block text-sm font-medium text-gray-700 mb-1">
            Expected Close Date
          </label>
          <input
            id="close_date"
            type="date"
            value={closeDate}
            onChange={e => setCloseDate(e.target.value)}
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
          {isEditing ? 'Save Changes' : 'Create Deal'}
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

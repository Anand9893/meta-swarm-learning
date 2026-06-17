import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDeals, useCreateDeal, useDeleteDeal } from '../api/deals'
import DealForm from '../components/deals/DealForm'
import KanbanBoard from '../components/deals/KanbanBoard'
import type { Deal, DealStage } from '../types/deal'
import { DEAL_STAGES } from '../types/deal'

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

type ViewMode = 'list' | 'kanban'

function DealRow({ deal, onDelete }: { deal: Deal; onDelete: (id: string) => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:border-gray-300 transition-colors">
      <div className="min-w-0 flex-1">
        <Link
          to={`/deals/${deal.id}`}
          className="text-sm font-semibold text-gray-900 hover:text-blue-600"
        >
          {deal.title}
        </Link>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
          {deal.value != null && <span>${deal.value.toLocaleString()}</span>}
          <span>{deal.probability}%</span>
          {deal.expected_close_date && (
            <span>Close: {new Date(deal.expected_close_date).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STAGE_STYLES[deal.stage]}`}>
          {STAGE_LABELS[deal.stage]}
        </span>
        <button
          onClick={() => onDelete(deal.id)}
          className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export default function DealsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [stageFilter, setStageFilter] = useState<DealStage | ''>('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const { data, isLoading } = useDeals({
    stage: stageFilter || undefined,
    page,
  })

  const { data: allDeals } = useDeals({ page_size: 100 })

  const createDeal = useCreateDeal()
  const deleteDeal = useDeleteDeal()

  const PAGE_SIZE = 20
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0

  async function handleCreate(formData: Parameters<typeof createDeal.mutateAsync>[0]) {
    setCreateError(null)
    try {
      await createDeal.mutateAsync(formData)
      setShowForm(false)
    } catch {
      setCreateError('Failed to create deal. Please try again.')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this deal?')) return
    await deleteDeal.mutateAsync(id)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-md border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              aria-pressed={viewMode === 'kanban'}
              className={`px-3 py-1.5 text-sm font-medium border-l border-gray-300 ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              Kanban
            </button>
          </div>
          <button
            onClick={() => { setShowForm(s => !s); setCreateError(null) }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            New Deal
          </button>
        </div>
      </div>

      {showForm && (
        <DealForm
          onSubmit={handleCreate}
          onCancel={() => { setShowForm(false); setCreateError(null) }}
          isLoading={createDeal.isPending}
          error={createError}
        />
      )}

      {viewMode === 'list' && (
        <>
          {/* Stage filter */}
          <div className="mb-4">
            <select
              aria-label="Filter by stage"
              value={stageFilter}
              onChange={e => { setStageFilter(e.target.value as DealStage | ''); setPage(1) }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Stages</option>
              {DEAL_STAGES.map(s => (
                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {isLoading && <p className="text-sm text-gray-500 py-4">Loading deals...</p>}

          {!isLoading && data?.items.length === 0 && (
            <p className="text-sm text-gray-500 py-8 text-center">No deals found.</p>
          )}

          <div className="space-y-2">
            {data?.items.map(deal => (
              <DealRow key={deal.id} deal={deal} onDelete={handleDelete} />
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
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}

      {viewMode === 'kanban' && allDeals && (
        <KanbanBoard deals={allDeals.items} />
      )}
    </div>
  )
}

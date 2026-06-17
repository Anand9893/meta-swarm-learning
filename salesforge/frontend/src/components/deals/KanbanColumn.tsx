import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import DealCard from './DealCard'
import type { Deal, DealStage } from '../../types/deal'

interface KanbanColumnProps {
  stage: DealStage
  label: string
  deals: Deal[]
  count: number
  totalValue: number
}

export default function KanbanColumn({ stage, label, deals, count, totalValue }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div className={`flex flex-col w-60 shrink-0 rounded-lg bg-gray-50 border ${isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          <span>{count} deal{count !== 1 ? 's' : ''}</span>
          {totalValue > 0 && <span>· ${totalValue.toLocaleString()}</span>}
        </div>
      </div>
      <div ref={setNodeRef} className="flex-1 p-2 space-y-2 min-h-[120px]">
        <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map(deal => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

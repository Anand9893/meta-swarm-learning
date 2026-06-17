import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Deal } from '../../types/deal'

interface DealCardProps {
  deal: Deal
}

export default function DealCard({ deal }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { stage: deal.stage },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white border border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
      data-testid={`deal-card-${deal.id}`}
    >
      <p className="text-sm font-medium text-gray-900 truncate">{deal.title}</p>
      <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500">
        {deal.value != null ? (
          <span className="font-medium text-gray-700">${deal.value.toLocaleString()}</span>
        ) : (
          <span>—</span>
        )}
        <span>{deal.probability}%</span>
      </div>
      {deal.expected_close_date && (
        <p className="mt-1 text-xs text-gray-400">
          Close: {new Date(deal.expected_close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      )}
    </div>
  )
}

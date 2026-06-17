import { useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useQueryClient } from '@tanstack/react-query'
import KanbanColumn from './KanbanColumn'
import type { Deal, DealStage } from '../../types/deal'
import { DEAL_STAGES, STAGE_DEFAULT_PROBABILITY } from '../../types/deal'
import { useUpdateDeal } from '../../api/deals'

const STAGE_LABELS: Record<DealStage, string> = {
  prospect: 'Prospect',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

interface KanbanBoardProps {
  deals: Deal[]
}

export default function KanbanBoard({ deals }: KanbanBoardProps) {
  const [localDeals, setLocalDeals] = useState(deals)
  const [dragError, setDragError] = useState<string | null>(null)
  const updateDeal = useUpdateDeal()
  const queryClient = useQueryClient()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const newStage = over.id as DealStage
    const currentDeal = localDeals.find(d => d.id === activeId)
    if (!currentDeal || currentDeal.stage === newStage) return

    const prevDeals = localDeals
    setLocalDeals(prev =>
      prev.map(d => d.id === activeId ? { ...d, stage: newStage } : d)
    )
    setDragError(null)

    updateDeal.mutate(
      { id: activeId, stage: newStage, probability: STAGE_DEFAULT_PROBABILITY[newStage] },
      {
        onError: () => {
          setLocalDeals(prevDeals)
          setDragError('Stage update failed — deal moved back.')
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['deals'] })
          queryClient.invalidateQueries({ queryKey: ['pipeline-summary'] })
        },
      }
    )
  }

  return (
    <div>
      {dragError && (
        <div role="alert" className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {dragError}
        </div>
      )}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {DEAL_STAGES.map(stage => {
            const stageDeals = localDeals.filter(d => d.stage === stage)
            const totalValue = stageDeals.reduce((sum, d) => sum + (d.value ?? 0), 0)
            return (
              <KanbanColumn
                key={stage}
                stage={stage}
                label={STAGE_LABELS[stage]}
                deals={stageDeals}
                count={stageDeals.length}
                totalValue={totalValue}
              />
            )
          })}
        </div>
      </DndContext>
    </div>
  )
}

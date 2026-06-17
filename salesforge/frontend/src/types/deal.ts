export type DealStage = 'prospect' | 'proposal' | 'negotiation' | 'won' | 'lost'

export const DEAL_STAGES: DealStage[] = ['prospect', 'proposal', 'negotiation', 'won', 'lost']

export const STAGE_DEFAULT_PROBABILITY: Record<DealStage, number> = {
  prospect: 10,
  proposal: 30,
  negotiation: 60,
  won: 100,
  lost: 0,
}

export interface Deal {
  id: string
  title: string
  value: number | null
  currency: string
  stage: DealStage
  probability: number
  expected_close_date: string | null
  contact_id: string | null
  company_id: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface DealListResponse {
  items: Deal[]
  total: number
  page: number
  page_size: number
}

export interface PipelineStageSummary {
  stage: DealStage
  count: number
  total_value: number
}

export interface DealCreate {
  title: string
  value?: number
  currency?: string
  stage?: DealStage
  probability?: number
  expected_close_date?: string
  contact_id?: string
  company_id?: string
}

export type DealUpdate = Partial<DealCreate>

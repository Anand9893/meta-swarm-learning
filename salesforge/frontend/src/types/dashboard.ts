export interface DashboardStats {
  leads_this_week: number
  pipeline_value: number
  deals_won_this_month: number
  deals_won_value_this_month: number
  overdue_activities: number
}

export interface PipelineStage {
  stage: string
  count: number
  total_value: number
}

export interface ActivityWithParent {
  id: string
  type: string
  title: string
  description: string | null
  due_date: string | null
  completed: boolean
  deal_id: string | null
  contact_id: string | null
  lead_id: string | null
  owner_id: string
  created_at: string
  updated_at: string
  linked_record_name: string | null
  linked_record_type: string | null
}

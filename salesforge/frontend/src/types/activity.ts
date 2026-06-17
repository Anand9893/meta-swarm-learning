export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task'

export interface Activity {
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
}

export interface ActivityListResponse {
  items: Activity[]
  total: number
  page: number
  page_size: number
}

export interface ActivityCreate {
  type: string
  title: string
  description?: string
  due_date?: string
  deal_id?: string
  contact_id?: string
  lead_id?: string
}

export type ActivityUpdate = Partial<ActivityCreate & { completed: boolean }>

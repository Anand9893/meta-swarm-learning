export interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  title: string | null
  company_id: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface LinkedDeal {
  id: string
  title: string
  stage: string
  value: number | null
  expected_close_date: string | null
}

export interface LinkedActivity {
  id: string
  type: string
  title: string
  due_date: string | null
  completed: boolean
  created_at: string
}

export interface ContactDetail extends Contact {
  deals: LinkedDeal[]
  activities: LinkedActivity[]
}

export interface ContactListResponse {
  items: Contact[]
  total: number
  page: number
  limit: number
}

export interface ContactCreate {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  title?: string
  company_id?: string
}

export interface ContactUpdate {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  title?: string
  company_id?: string | null
}

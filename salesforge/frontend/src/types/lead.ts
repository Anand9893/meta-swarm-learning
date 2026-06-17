export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'

export interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  company_name: string | null
  status: LeadStatus
  source: string | null
  notes: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface LeadListResponse {
  items: Lead[]
  total: number
  page: number
  limit: number
}

export interface LeadCreate {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  company_name?: string
  source?: string
  notes?: string
}

export interface LeadUpdate {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  company_name?: string
  source?: string
  notes?: string
  status?: LeadStatus
}

export interface LeadConvertRequest {
  create_company: boolean
  create_deal: boolean
  deal_title?: string
  deal_value?: number
}

export interface LeadConvertResponse {
  contact_id: string
  company_id: string | null
  deal_id: string | null
}

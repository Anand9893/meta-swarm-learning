export interface Company {
  id: string
  name: string
  website: string | null
  industry: string | null
  phone: string | null
  address: string | null
  notes: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface LinkedContact {
  id: string
  first_name: string
  last_name: string
  email: string | null
  title: string | null
}

export interface CompanyLinkedDeal {
  id: string
  title: string
  stage: string
  value: number | null
  expected_close_date: string | null
}

export interface CompanyDetail extends Company {
  contacts: LinkedContact[]
  deals: CompanyLinkedDeal[]
}

export interface CompanyListResponse {
  items: Company[]
  total: number
  page: number
  page_size: number
}

export interface CompanyCreate {
  name: string
  website?: string
  industry?: string
  phone?: string
  address?: string
  notes?: string
}

export type CompanyUpdate = Partial<CompanyCreate>

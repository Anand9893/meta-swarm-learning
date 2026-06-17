import { http, HttpResponse } from 'msw'
import type { Company, CompanyDetail } from '../../../src/types/company'

export const mockCompanies: Company[] = [
  {
    id: 'company-1',
    name: 'Acme Corp',
    website: 'https://acme.com',
    industry: 'Technology',
    phone: '555-0100',
    address: '123 Main St',
    notes: null,
    owner_id: 'user-1',
    created_at: '2026-06-17T10:00:00Z',
    updated_at: '2026-06-17T10:00:00Z',
  },
  {
    id: 'company-2',
    name: 'Globex Inc',
    website: null,
    industry: 'Finance',
    phone: null,
    address: null,
    notes: 'Key account',
    owner_id: 'user-1',
    created_at: '2026-06-16T09:00:00Z',
    updated_at: '2026-06-16T09:00:00Z',
  },
  {
    id: 'company-3',
    name: 'Initech',
    website: 'https://initech.com',
    industry: 'Retail',
    phone: '555-0300',
    address: null,
    notes: null,
    owner_id: 'user-1',
    created_at: '2026-06-15T08:00:00Z',
    updated_at: '2026-06-15T08:00:00Z',
  },
]

export const mockCompanyDetail: CompanyDetail = {
  ...mockCompanies[0],
  contacts: [
    {
      id: 'contact-1',
      first_name: 'Alice',
      last_name: 'Johnson',
      email: 'alice@acme.com',
      title: 'VP Sales',
    },
  ],
  deals: [
    {
      id: 'deal-1',
      title: 'Acme Enterprise Deal',
      stage: 'proposal',
      value: 50000,
      expected_close_date: '2026-09-30',
    },
  ],
}

function requireAuth(request: Request): boolean {
  return !!request.headers.get('Authorization')
}

export const companyHandlers = [
  http.get('/api/v1/companies', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const industry = url.searchParams.get('industry')
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const page_size = parseInt(url.searchParams.get('page_size') ?? '20', 10)

    let filtered = [...mockCompanies]
    if (industry) filtered = filtered.filter(c => c.industry === industry)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(c => c.name.toLowerCase().includes(q))
    }

    const total = filtered.length
    const items = filtered.slice((page - 1) * page_size, page * page_size)

    return HttpResponse.json({ items, total, page, page_size })
  }),

  http.post('/api/v1/companies', async ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json() as Record<string, unknown>
    const newCompany: Company = {
      id: 'new-company-id',
      name: body.name as string,
      website: (body.website as string) || null,
      industry: (body.industry as string) || null,
      phone: (body.phone as string) || null,
      address: (body.address as string) || null,
      notes: (body.notes as string) || null,
      owner_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return HttpResponse.json(newCompany, { status: 201 })
  }),

  http.get('/api/v1/companies/:id', ({ request, params }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    if (params.id === 'company-1') {
      return HttpResponse.json(mockCompanyDetail)
    }

    const company = mockCompanies.find(c => c.id === params.id)
    if (!company) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json({ ...company, contacts: [], deals: [] })
  }),

  http.patch('/api/v1/companies/:id', async ({ request, params }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const company = mockCompanies.find(c => c.id === params.id)
    if (!company) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    }

    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ ...company, ...body, updated_at: new Date().toISOString() })
  }),

  http.delete('/api/v1/companies/:id', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }
    return new HttpResponse(null, { status: 204 })
  }),
]

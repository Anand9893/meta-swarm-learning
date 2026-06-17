import { http, HttpResponse } from 'msw'
import type { Lead, LeadConvertResponse } from '../../../src/types/lead'

export const mockLeads: Lead[] = [
  {
    id: 'lead-1',
    first_name: 'Alice',
    last_name: 'Johnson',
    email: 'alice@acme.com',
    phone: '555-1234',
    company_name: 'Acme Corp',
    status: 'new',
    source: 'web',
    notes: null,
    owner_id: 'user-1',
    created_at: '2026-06-17T10:00:00Z',
    updated_at: '2026-06-17T10:00:00Z',
  },
  {
    id: 'lead-2',
    first_name: 'Bob',
    last_name: 'Smith',
    email: 'bob@globex.com',
    phone: null,
    company_name: 'Globex',
    status: 'qualified',
    source: 'referral',
    notes: 'Hot lead',
    owner_id: 'user-1',
    created_at: '2026-06-16T09:00:00Z',
    updated_at: '2026-06-16T09:00:00Z',
  },
  {
    id: 'lead-3',
    first_name: 'Carol',
    last_name: 'Davis',
    email: null,
    phone: '555-5678',
    company_name: null,
    status: 'converted',
    source: null,
    notes: null,
    owner_id: 'user-1',
    created_at: '2026-06-15T08:00:00Z',
    updated_at: '2026-06-15T08:00:00Z',
  },
]

function requireAuth(request: Request): boolean {
  return !!request.headers.get('Authorization')
}

export const leadHandlers = [
  http.get('/api/v1/leads', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const limit = parseInt(url.searchParams.get('limit') ?? '20', 10)

    let filtered = [...mockLeads]
    if (status) filtered = filtered.filter(l => l.status === status)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        l =>
          l.first_name.toLowerCase().includes(q) ||
          l.last_name.toLowerCase().includes(q) ||
          (l.email?.toLowerCase().includes(q) ?? false)
      )
    }

    const total = filtered.length
    const items = filtered.slice((page - 1) * limit, page * limit)

    return HttpResponse.json({ items, total, page, limit })
  }),

  http.post('/api/v1/leads', async ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json() as Record<string, unknown>
    const newLead: Lead = {
      id: 'new-lead-id',
      first_name: body.first_name as string,
      last_name: body.last_name as string,
      email: (body.email as string) || null,
      phone: (body.phone as string) || null,
      company_name: (body.company_name as string) || null,
      status: 'new',
      source: (body.source as string) || null,
      notes: (body.notes as string) || null,
      owner_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return HttpResponse.json(newLead, { status: 201 })
  }),

  http.get('/api/v1/leads/:id', ({ request, params }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const lead = mockLeads.find(l => l.id === params.id)
    if (!lead) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json(lead)
  }),

  http.patch('/api/v1/leads/:id', async ({ request, params }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const lead = mockLeads.find(l => l.id === params.id)
    if (!lead) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    }

    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      ...lead,
      ...body,
      updated_at: new Date().toISOString(),
    })
  }),

  http.delete('/api/v1/leads/:id', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/v1/leads/:id/convert', ({ request, params }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const lead = mockLeads.find(l => l.id === params.id)
    if (!lead) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    }
    if (lead.status === 'converted') {
      return HttpResponse.json({ detail: 'Lead already converted' }, { status: 400 })
    }

    const response: LeadConvertResponse = {
      contact_id: 'contact-new-1',
      company_id: lead.company_name ? 'company-new-1' : null,
      deal_id: null,
    }
    return HttpResponse.json(response)
  }),
]

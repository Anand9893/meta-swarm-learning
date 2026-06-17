import { http, HttpResponse } from 'msw'
import type { Deal, PipelineStageSummary } from '../../../src/types/deal'

export const mockDeals: Deal[] = [
  {
    id: 'deal-1',
    title: 'Acme Enterprise Deal',
    value: 50000,
    currency: 'USD',
    stage: 'proposal',
    probability: 30,
    expected_close_date: '2026-09-30',
    contact_id: 'contact-1',
    company_id: 'company-1',
    owner_id: 'user-1',
    created_at: '2026-06-17T10:00:00Z',
    updated_at: '2026-06-17T10:00:00Z',
  },
  {
    id: 'deal-2',
    title: 'Globex Starter Pack',
    value: 10000,
    currency: 'USD',
    stage: 'prospect',
    probability: 10,
    expected_close_date: null,
    contact_id: null,
    company_id: 'company-2',
    owner_id: 'user-1',
    created_at: '2026-06-16T09:00:00Z',
    updated_at: '2026-06-16T09:00:00Z',
  },
  {
    id: 'deal-3',
    title: 'Initech Renewal',
    value: 25000,
    currency: 'USD',
    stage: 'won',
    probability: 100,
    expected_close_date: '2026-06-01',
    contact_id: null,
    company_id: 'company-3',
    owner_id: 'user-1',
    created_at: '2026-06-15T08:00:00Z',
    updated_at: '2026-06-15T08:00:00Z',
  },
]

export const mockPipelineSummary: PipelineStageSummary[] = [
  { stage: 'prospect', count: 1, total_value: 10000 },
  { stage: 'proposal', count: 1, total_value: 50000 },
  { stage: 'negotiation', count: 0, total_value: 0 },
  { stage: 'won', count: 1, total_value: 25000 },
  { stage: 'lost', count: 0, total_value: 0 },
]

function requireAuth(request: Request): boolean {
  return !!request.headers.get('Authorization')
}

export const dealHandlers = [
  http.get('/api/v1/deals/pipeline-summary', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }
    return HttpResponse.json(mockPipelineSummary)
  }),

  http.get('/api/v1/deals', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const stage = url.searchParams.get('stage')
    const search = url.searchParams.get('search')
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const page_size = parseInt(url.searchParams.get('page_size') ?? '20', 10)

    let filtered = [...mockDeals]
    if (stage) filtered = filtered.filter(d => d.stage === stage)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(d => d.title.toLowerCase().includes(q))
    }

    const total = filtered.length
    const items = filtered.slice((page - 1) * page_size, page * page_size)

    return HttpResponse.json({ items, total, page, page_size })
  }),

  http.post('/api/v1/deals', async ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json() as Record<string, unknown>
    const newDeal: Deal = {
      id: 'new-deal-id',
      title: body.title as string,
      value: (body.value as number) || null,
      currency: (body.currency as string) || 'USD',
      stage: (body.stage as Deal['stage']) || 'prospect',
      probability: (body.probability as number) ?? 10,
      expected_close_date: (body.expected_close_date as string) || null,
      contact_id: (body.contact_id as string) || null,
      company_id: (body.company_id as string) || null,
      owner_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return HttpResponse.json(newDeal, { status: 201 })
  }),

  http.get('/api/v1/deals/:id', ({ request, params }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const deal = mockDeals.find(d => d.id === params.id)
    if (!deal) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json(deal)
  }),

  http.patch('/api/v1/deals/:id', async ({ request, params }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const deal = mockDeals.find(d => d.id === params.id)
    if (!deal) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    }

    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ ...deal, ...body, updated_at: new Date().toISOString() })
  }),

  http.delete('/api/v1/deals/:id', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }
    return new HttpResponse(null, { status: 204 })
  }),
]

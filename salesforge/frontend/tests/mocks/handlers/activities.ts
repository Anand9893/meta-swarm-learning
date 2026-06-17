import { http, HttpResponse } from 'msw'
import type { Activity } from '../../../src/types/activity'

export const mockActivities: Activity[] = [
  {
    id: 'activity-1',
    type: 'call',
    title: 'Discovery call with Alice',
    description: 'Initial discovery',
    due_date: '2026-06-20T14:00:00Z',
    completed: false,
    deal_id: 'deal-1',
    contact_id: 'contact-1',
    lead_id: null,
    owner_id: 'user-1',
    created_at: '2026-06-17T10:00:00Z',
    updated_at: '2026-06-17T10:00:00Z',
  },
  {
    id: 'activity-2',
    type: 'email',
    title: 'Follow up email',
    description: null,
    due_date: null,
    completed: true,
    deal_id: null,
    contact_id: 'contact-1',
    lead_id: null,
    owner_id: 'user-1',
    created_at: '2026-06-16T09:00:00Z',
    updated_at: '2026-06-16T09:00:00Z',
  },
  {
    id: 'activity-3',
    type: 'meeting',
    title: 'Overdue team sync',
    description: null,
    due_date: '2026-06-01T10:00:00Z',
    completed: false,
    deal_id: null,
    contact_id: null,
    lead_id: null,
    owner_id: 'user-1',
    created_at: '2026-06-01T09:00:00Z',
    updated_at: '2026-06-01T09:00:00Z',
  },
]

function requireAuth(request: Request): boolean {
  return !!request.headers.get('Authorization')
}

export const activityHandlers = [
  http.get('/api/v1/activities', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const completedParam = url.searchParams.get('completed')
    const dealId = url.searchParams.get('deal_id')
    const contactId = url.searchParams.get('contact_id')
    const leadId = url.searchParams.get('lead_id')
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const page_size = parseInt(url.searchParams.get('page_size') ?? '20', 10)

    let filtered = [...mockActivities]
    if (type) filtered = filtered.filter(a => a.type === type)
    if (completedParam !== null) {
      const completed = completedParam === 'true'
      filtered = filtered.filter(a => a.completed === completed)
    }
    if (dealId) filtered = filtered.filter(a => a.deal_id === dealId)
    if (contactId) filtered = filtered.filter(a => a.contact_id === contactId)
    if (leadId) filtered = filtered.filter(a => a.lead_id === leadId)

    const total = filtered.length
    const items = filtered.slice((page - 1) * page_size, page * page_size)

    return HttpResponse.json({ items, total, page, page_size })
  }),

  http.post('/api/v1/activities', async ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json() as Record<string, unknown>
    const newActivity: Activity = {
      id: 'new-activity-id',
      type: body.type as string,
      title: body.title as string,
      description: (body.description as string) || null,
      due_date: (body.due_date as string) || null,
      completed: false,
      deal_id: (body.deal_id as string) || null,
      contact_id: (body.contact_id as string) || null,
      lead_id: (body.lead_id as string) || null,
      owner_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return HttpResponse.json(newActivity, { status: 201 })
  }),

  http.get('/api/v1/activities/:id', ({ request, params }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const activity = mockActivities.find(a => a.id === params.id)
    if (!activity) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json(activity)
  }),

  http.patch('/api/v1/activities/:id', async ({ request, params }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const activity = mockActivities.find(a => a.id === params.id)
    if (!activity) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    }

    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ ...activity, ...body, updated_at: new Date().toISOString() })
  }),

  http.delete('/api/v1/activities/:id', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }
    return new HttpResponse(null, { status: 204 })
  }),
]

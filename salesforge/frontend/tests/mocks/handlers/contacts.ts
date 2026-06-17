import { http, HttpResponse } from 'msw'
import type { Contact, ContactDetail } from '../../../src/types/contact'

export const mockContacts: Contact[] = [
  {
    id: 'contact-1',
    first_name: 'Alice',
    last_name: 'Johnson',
    email: 'alice@acme.com',
    phone: '555-1234',
    title: 'VP Sales',
    company_id: 'company-1',
    owner_id: 'user-1',
    created_at: '2026-06-17T10:00:00Z',
    updated_at: '2026-06-17T10:00:00Z',
  },
  {
    id: 'contact-2',
    first_name: 'Bob',
    last_name: 'Smith',
    email: 'bob@globex.com',
    phone: null,
    title: 'Engineer',
    company_id: null,
    owner_id: 'user-1',
    created_at: '2026-06-16T09:00:00Z',
    updated_at: '2026-06-16T09:00:00Z',
  },
  {
    id: 'contact-3',
    first_name: 'Carol',
    last_name: 'Davis',
    email: null,
    phone: '555-5678',
    title: null,
    company_id: 'company-2',
    owner_id: 'user-1',
    created_at: '2026-06-15T08:00:00Z',
    updated_at: '2026-06-15T08:00:00Z',
  },
]

export const mockContactDetail: ContactDetail = {
  ...mockContacts[0],
  deals: [
    {
      id: 'deal-1',
      title: 'Acme Enterprise Deal',
      stage: 'proposal',
      value: 50000,
      expected_close_date: '2026-09-30',
    },
  ],
  activities: [
    {
      id: 'activity-1',
      type: 'call',
      title: 'Initial discovery call',
      due_date: '2026-06-20T14:00:00Z',
      completed: false,
      created_at: '2026-06-17T10:00:00Z',
    },
    {
      id: 'activity-2',
      type: 'email',
      title: 'Follow up email',
      due_date: null,
      completed: true,
      created_at: '2026-06-16T09:00:00Z',
    },
  ],
}

function requireAuth(request: Request): boolean {
  return !!request.headers.get('Authorization')
}

export const contactHandlers = [
  http.get('/api/v1/contacts', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const companyId = url.searchParams.get('company_id')
    const page = parseInt(url.searchParams.get('page') ?? '1', 10)
    const limit = parseInt(url.searchParams.get('limit') ?? '20', 10)

    let filtered = [...mockContacts]
    if (companyId) filtered = filtered.filter(c => c.company_id === companyId)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        c =>
          c.first_name.toLowerCase().includes(q) ||
          c.last_name.toLowerCase().includes(q) ||
          (c.email?.toLowerCase().includes(q) ?? false)
      )
    }

    const total = filtered.length
    const items = filtered.slice((page - 1) * limit, page * limit)

    return HttpResponse.json({ items, total, page, limit })
  }),

  http.post('/api/v1/contacts', async ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json() as Record<string, unknown>
    const newContact: Contact = {
      id: 'new-contact-id',
      first_name: body.first_name as string,
      last_name: body.last_name as string,
      email: (body.email as string) || null,
      phone: (body.phone as string) || null,
      title: (body.title as string) || null,
      company_id: (body.company_id as string) || null,
      owner_id: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return HttpResponse.json(newContact, { status: 201 })
  }),

  http.get('/api/v1/contacts/:id', ({ request, params }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    if (params.id === 'contact-1') {
      return HttpResponse.json(mockContactDetail)
    }

    const contact = mockContacts.find(c => c.id === params.id)
    if (!contact) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json({ ...contact, deals: [], activities: [] })
  }),

  http.patch('/api/v1/contacts/:id', async ({ request, params }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    const contact = mockContacts.find(c => c.id === params.id)
    if (!contact) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
    }

    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      ...contact,
      ...body,
      updated_at: new Date().toISOString(),
    })
  }),

  http.delete('/api/v1/contacts/:id', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }
    return new HttpResponse(null, { status: 204 })
  }),
]

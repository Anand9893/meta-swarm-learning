import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'

import LeadsPage from '../src/pages/LeadsPage'
import LeadDetailPage from '../src/pages/LeadDetailPage'

const mockRepUser = { id: 'user-1', email: 'rep@example.com', full_name: 'Test Rep', role: 'rep', is_active: true }

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderWithRouter(
  ui: React.ReactNode,
  {
    initialEntries = ['/'],
    token = 'fake-access-token',
    user = mockRepUser,
  }: {
    initialEntries?: string[]
    token?: string | null
    user?: object | null
  } = {}
) {
  localStorage.clear()
  if (token) {
    localStorage.setItem('sf_access_token', token)
    localStorage.setItem('sf_refresh_token', 'fake-refresh-token')
  }
  if (user) {
    localStorage.setItem('sf_user', JSON.stringify(user))
  }

  const client = makeClient()
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

afterEach(() => {
  localStorage.clear()
})

// ─── US1-AC3: Leads list shows status badge and source ──────────────────────

describe('LeadsPage — list rendering', () => {
  test('US1-AC3: renders all leads with names, status badges and source', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/:id" element={<div>Lead Detail</div>} />
      </Routes>,
      { initialEntries: ['/leads'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    expect(screen.getByText('Carol Davis')).toBeInTheDocument()

    // Status badges visible (each status also appears as a filter option, so multiple matches expected)
    expect(screen.getAllByText('New').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Qualified').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Converted').length).toBeGreaterThan(0)

    // Source visible
    expect(screen.getAllByText(/web/i).length).toBeGreaterThan(0)
  })

  test('renders "No leads found" when list is empty', async () => {
    server.use(
      http.get('/api/v1/leads', () =>
        HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 })
      )
    )

    renderWithRouter(
      <Routes>
        <Route path="/leads" element={<LeadsPage />} />
      </Routes>,
      { initialEntries: ['/leads'] }
    )

    await waitFor(() => {
      expect(screen.getByText(/no leads found/i)).toBeInTheDocument()
    })
  })
})

// ─── US4-AC1: Filter by status ───────────────────────────────────────────────

describe('LeadsPage — status filter', () => {
  test('US4-AC1: selecting a status filter shows only matching leads', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/:id" element={<div>Lead Detail</div>} />
      </Routes>,
      { initialEntries: ['/leads'] }
    )

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    // Change status filter to "qualified"
    const statusSelect = screen.getByRole('combobox', { name: /filter by status/i })
    await user.selectOptions(statusSelect, 'qualified')

    // Only Bob (qualified) should remain
    await waitFor(() => {
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    })
    expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument()
    expect(screen.queryByText('Carol Davis')).not.toBeInTheDocument()
  })

  test('US4-AC3: clearing status filter shows all leads again', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/:id" element={<div>Lead Detail</div>} />
      </Routes>,
      { initialEntries: ['/leads'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    const statusSelect = screen.getByRole('combobox', { name: /filter by status/i })
    await user.selectOptions(statusSelect, 'qualified')

    await waitFor(() => {
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument()
    })

    // Clear filter
    await user.selectOptions(statusSelect, '')

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
  })
})

// ─── US4-AC2: Search ──────────────────────────────────────────────────────────

describe('LeadsPage — search', () => {
  test('US4-AC2: searching by name filters results', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/:id" element={<div>Lead Detail</div>} />
      </Routes>,
      { initialEntries: ['/leads'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    const searchInput = screen.getByRole('textbox', { name: /search leads/i })
    await user.type(searchInput, 'Alice')
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument()
    expect(screen.queryByText('Carol Davis')).not.toBeInTheDocument()
  })
})

// ─── US4-AC4: Pagination ─────────────────────────────────────────────────────

describe('LeadsPage — pagination', () => {
  test('US4-AC4: shows pagination controls when total exceeds page limit', async () => {
    // Return 25 leads (> 20 limit) so pagination should appear
    const manyLeads = Array.from({ length: 20 }, (_, i) => ({
      id: `lead-page1-${i}`,
      first_name: `Rep${i}`,
      last_name: 'Lead',
      email: null,
      phone: null,
      company_name: null,
      status: 'new' as const,
      source: null,
      notes: null,
      owner_id: 'user-1',
      created_at: '2026-06-17T10:00:00Z',
      updated_at: '2026-06-17T10:00:00Z',
    }))

    server.use(
      http.get('/api/v1/leads', ({ request }) => {
        const url = new URL(request.url)
        const page = parseInt(url.searchParams.get('page') ?? '1', 10)
        const limit = parseInt(url.searchParams.get('limit') ?? '20', 10)
        const items = page === 1 ? manyLeads : []
        return HttpResponse.json({ items, total: 25, page, limit })
      })
    )

    renderWithRouter(
      <Routes>
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/:id" element={<div>Lead Detail</div>} />
      </Routes>,
      { initialEntries: ['/leads'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Rep0 Lead')).toBeInTheDocument()
    })

    // Pagination controls visible
    const pagination = screen.getByRole('navigation', { name: /pagination/i })
    expect(within(pagination).getByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(within(pagination).getByRole('button', { name: /next/i })).toBeInTheDocument()
    expect(within(pagination).getByText(/page 1 of 2/i)).toBeInTheDocument()
  })

  test('Previous button is disabled on page 1', async () => {
    server.use(
      http.get('/api/v1/leads', () =>
        HttpResponse.json({ items: [], total: 25, page: 1, limit: 20 })
      )
    )

    renderWithRouter(
      <Routes>
        <Route path="/leads" element={<LeadsPage />} />
      </Routes>,
      { initialEntries: ['/leads'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument()
    })

    const prevBtn = screen.getByRole('button', { name: /previous/i })
    expect(prevBtn).toBeDisabled()
  })
})

// ─── US1: New Lead form ───────────────────────────────────────────────────────

describe('LeadsPage — new lead form', () => {
  test('US1: clicking "New Lead" shows the form', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/:id" element={<div>Lead Detail</div>} />
      </Routes>,
      { initialEntries: ['/leads'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new lead/i }))

    expect(screen.getByRole('button', { name: /create lead/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
  })

  test('US1-AC2: submitting form without first name shows validation error', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/:id" element={<div>Lead Detail</div>} />
      </Routes>,
      { initialEntries: ['/leads'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new lead/i }))
    await user.type(screen.getByLabelText(/last name/i), 'TestLast')
    await user.click(screen.getByRole('button', { name: /create lead/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/first name is required/i)
    })
  })

  test('US1-AC1: valid form submission creates a lead and hides form', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/:id" element={<div>Lead Detail</div>} />
      </Routes>,
      { initialEntries: ['/leads'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new lead/i }))
    await user.type(screen.getByLabelText(/first name/i), 'Dan')
    await user.type(screen.getByLabelText(/last name/i), 'Brown')
    await user.type(screen.getByLabelText(/email/i), 'dan@example.com')
    await user.click(screen.getByRole('button', { name: /create lead/i }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /create lead/i })).not.toBeInTheDocument()
    })
  })
})

// ─── LeadDetailPage: convert lead ────────────────────────────────────────────

describe('LeadDetailPage — convert', () => {
  test('US3-AC4: successful convert redirects to contact detail page', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/leads/:id" element={<LeadDetailPage />} />
        <Route path="/contacts/:id" element={<div>Contact Detail Page</div>} />
      </Routes>,
      { initialEntries: ['/leads/lead-1'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /convert/i })).toBeInTheDocument()
    })

    // Open modal
    await user.click(screen.getByRole('button', { name: /convert/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Submit conversion
    const convertBtn = within(screen.getByRole('dialog')).getByRole('button', {
      name: /^convert$/i,
    })
    await user.click(convertBtn)

    await waitFor(() => {
      expect(screen.getByText('Contact Detail Page')).toBeInTheDocument()
    })
  })

  test('US3-AC5: server error during convert shows error message', async () => {
    server.use(
      http.post('/api/v1/leads/:id/convert', () =>
        HttpResponse.json({ detail: 'Internal Server Error' }, { status: 500 })
      )
    )

    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/leads/:id" element={<LeadDetailPage />} />
      </Routes>,
      { initialEntries: ['/leads/lead-1'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /convert/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /convert/i }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const convertBtn = within(screen.getByRole('dialog')).getByRole('button', {
      name: /^convert$/i,
    })
    await user.click(convertBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/conversion failed/i)
    })
    // Modal should still be open (no navigation)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  test('edge case: converted lead has no Convert button', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/leads/:id" element={<LeadDetailPage />} />
      </Routes>,
      { initialEntries: ['/leads/lead-3'] }
    )

    await waitFor(() => {
      // Carol Davis appears in both heading and breadcrumb
      expect(screen.getByRole('heading', { name: /carol davis/i })).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /convert/i })).not.toBeInTheDocument()
  })

  test('Convert modal shows lead contact info', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/leads/:id" element={<LeadDetailPage />} />
        <Route path="/contacts/:id" element={<div>Contact Detail Page</div>} />
      </Routes>,
      { initialEntries: ['/leads/lead-1'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /convert/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /convert/i }))

    const dialog = await screen.findByRole('dialog')
    // Name + email both match /alice/i, so use getAllByText
    expect(within(dialog).getAllByText(/alice/i).length).toBeGreaterThan(0)
    expect(within(dialog).getByLabelText(/create company/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/create deal/i)).toBeInTheDocument()
  })
})

// ─── LeadDetailPage: edit ────────────────────────────────────────────────────

describe('LeadDetailPage — edit', () => {
  test('Edit button toggles the edit form', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/leads/:id" element={<LeadDetailPage />} />
      </Routes>,
      { initialEntries: ['/leads/lead-1'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /edit/i }))

    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  test('US2-AC3: update leading to 403 shows error', async () => {
    server.use(
      http.patch('/api/v1/leads/:id', () =>
        HttpResponse.json({ detail: 'Not authorized' }, { status: 403 })
      )
    )

    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/leads/:id" element={<LeadDetailPage />} />
      </Routes>,
      { initialEntries: ['/leads/lead-1'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /edit/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to update/i)
    })
  })
})

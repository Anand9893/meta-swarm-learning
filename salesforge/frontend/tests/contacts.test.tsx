import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'

import ContactsPage from '../src/pages/ContactsPage'
import ContactDetailPage from '../src/pages/ContactDetailPage'

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
  }: {
    initialEntries?: string[]
    token?: string | null
  } = {}
) {
  localStorage.clear()
  if (token) {
    localStorage.setItem('sf_access_token', token)
    localStorage.setItem('sf_refresh_token', 'fake-refresh-token')
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

// ─── ContactsPage — list rendering ──────────────────────────────────────────

describe('ContactsPage — list rendering', () => {
  test('US1-AC2: renders contacts list with names and email', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contacts/:id" element={<div>Contact Detail</div>} />
      </Routes>,
      { initialEntries: ['/contacts'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    expect(screen.getByText('Carol Davis')).toBeInTheDocument()
    expect(screen.getByText('alice@acme.com')).toBeInTheDocument()
  })

  test('renders empty state when no contacts', async () => {
    server.use(
      http.get('/api/v1/contacts', () =>
        HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 })
      )
    )

    renderWithRouter(
      <Routes>
        <Route path="/contacts" element={<ContactsPage />} />
      </Routes>,
      { initialEntries: ['/contacts'] }
    )

    await waitFor(() => {
      expect(screen.getByText(/no contacts found/i)).toBeInTheDocument()
    })
  })
})

// ─── ContactsPage — search ──────────────────────────────────────────────────

describe('ContactsPage — search', () => {
  test('searching by name filters results', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contacts/:id" element={<div>Contact Detail</div>} />
      </Routes>,
      { initialEntries: ['/contacts'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    const searchInput = screen.getByRole('textbox', { name: /search contacts/i })
    await user.type(searchInput, 'Alice')
    await user.click(screen.getByRole('button', { name: /^search$/i }))

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument()
  })
})

// ─── ContactsPage — new contact form ────────────────────────────────────────

describe('ContactsPage — new contact form', () => {
  test('clicking "New Contact" shows the form', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contacts/:id" element={<div>Contact Detail</div>} />
      </Routes>,
      { initialEntries: ['/contacts'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new contact/i }))

    expect(screen.getByRole('button', { name: /create contact/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
  })

  test('submitting form without first name shows validation error', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contacts/:id" element={<div>Contact Detail</div>} />
      </Routes>,
      { initialEntries: ['/contacts'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new contact/i }))
    await user.type(screen.getByLabelText(/last name/i), 'TestLast')
    await user.click(screen.getByRole('button', { name: /create contact/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/first name is required/i)
    })
  })

  test('valid form submission creates a contact and hides form', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contacts/:id" element={<div>Contact Detail</div>} />
      </Routes>,
      { initialEntries: ['/contacts'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new contact/i }))
    await user.type(screen.getByLabelText(/first name/i), 'Dan')
    await user.type(screen.getByLabelText(/last name/i), 'Brown')
    await user.click(screen.getByRole('button', { name: /create contact/i }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /create contact/i })).not.toBeInTheDocument()
    })
  })
})

// ─── ContactsPage — pagination ───────────────────────────────────────────────

describe('ContactsPage — pagination', () => {
  test('shows pagination controls when total exceeds page limit', async () => {
    const manyContacts = Array.from({ length: 20 }, (_, i) => ({
      id: `contact-page1-${i}`,
      first_name: `Rep${i}`,
      last_name: 'Contact',
      email: null,
      phone: null,
      title: null,
      company_id: null,
      owner_id: 'user-1',
      created_at: '2026-06-17T10:00:00Z',
      updated_at: '2026-06-17T10:00:00Z',
    }))

    server.use(
      http.get('/api/v1/contacts', ({ request }) => {
        const url = new URL(request.url)
        const page = parseInt(url.searchParams.get('page') ?? '1', 10)
        const limit = parseInt(url.searchParams.get('limit') ?? '20', 10)
        const items = page === 1 ? manyContacts : []
        return HttpResponse.json({ items, total: 25, page, limit })
      })
    )

    renderWithRouter(
      <Routes>
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contacts/:id" element={<div>Contact Detail</div>} />
      </Routes>,
      { initialEntries: ['/contacts'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Rep0 Contact')).toBeInTheDocument()
    })

    const pagination = screen.getByRole('navigation', { name: /pagination/i })
    expect(within(pagination).getByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(within(pagination).getByRole('button', { name: /next/i })).toBeInTheDocument()
    expect(within(pagination).getByText(/page 1 of 2/i)).toBeInTheDocument()
  })
})

// ─── ContactDetailPage — detail view ─────────────────────────────────────────

describe('ContactDetailPage — detail view', () => {
  test('US1-AC4: renders full contact detail with fields, deals, and activities', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
      </Routes>,
      { initialEntries: ['/contacts/contact-1'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /alice johnson/i })).toBeInTheDocument()
    })

    // Contact fields
    expect(screen.getByText('alice@acme.com')).toBeInTheDocument()
    expect(screen.getByText('VP Sales')).toBeInTheDocument()
    expect(screen.getByText('555-1234')).toBeInTheDocument()

    // Deals list
    expect(screen.getByText('Acme Enterprise Deal')).toBeInTheDocument()

    // Activities timeline
    expect(screen.getByText('Initial discovery call')).toBeInTheDocument()
    expect(screen.getByText('Follow up email')).toBeInTheDocument()
  })

  test('US4-AC2: empty state shown when no activities', async () => {
    server.use(
      http.get('/api/v1/contacts/:id', () =>
        HttpResponse.json({
          ...{
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
          deals: [],
          activities: [],
        })
      )
    )

    renderWithRouter(
      <Routes>
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
      </Routes>,
      { initialEntries: ['/contacts/contact-2'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /bob smith/i })).toBeInTheDocument()
    })

    expect(screen.getByText(/no activities yet/i)).toBeInTheDocument()
  })

  test('US4-AC1: activities shown in reverse-chronological order', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
      </Routes>,
      { initialEntries: ['/contacts/contact-1'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Initial discovery call')).toBeInTheDocument()
    })

    const activityItems = screen.getAllByTestId('activity-item')
    // First item should be the more recent one (activity-1, created at Jun 17)
    expect(activityItems[0]).toHaveTextContent('Initial discovery call')
    expect(activityItems[1]).toHaveTextContent('Follow up email')
  })
})

// ─── ContactDetailPage — edit ─────────────────────────────────────────────────

describe('ContactDetailPage — edit', () => {
  test('Edit button toggles the edit form', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
      </Routes>,
      { initialEntries: ['/contacts/contact-1'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /edit/i }))

    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
  })

  test('update failure shows error message', async () => {
    server.use(
      http.patch('/api/v1/contacts/:id', () =>
        HttpResponse.json({ detail: 'Not authorized' }, { status: 403 })
      )
    )

    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
      </Routes>,
      { initialEntries: ['/contacts/contact-1'] }
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

  test('delete navigates to contacts list', async () => {
    const user = userEvent.setup()
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderWithRouter(
      <Routes>
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
        <Route path="/contacts" element={<div>Contacts List Page</div>} />
      </Routes>,
      { initialEntries: ['/contacts/contact-1'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByText('Contacts List Page')).toBeInTheDocument()
    })

    vi.restoreAllMocks()
  })
})

// ─── ActivityTimeline — reusable component ────────────────────────────────────

describe('ActivityTimeline', () => {
  test('US4-AC3: "Log Activity" button is present on contact detail', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
      </Routes>,
      { initialEntries: ['/contacts/contact-1'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /alice johnson/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /log activity/i })).toBeInTheDocument()
  })
})

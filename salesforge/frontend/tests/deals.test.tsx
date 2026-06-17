import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'

import DealsPage from '../src/pages/DealsPage'
import DealDetailPage from '../src/pages/DealDetailPage'

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

afterEach(() => { localStorage.clear() })

// ─── DealsPage — list view ────────────────────────────────────────────────────

describe('DealsPage — list view', () => {
  test('renders deals with titles and stages', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/deals" element={<DealsPage />} />
        <Route path="/deals/:id" element={<div>Deal Detail</div>} />
      </Routes>,
      { initialEntries: ['/deals'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Acme Enterprise Deal')).toBeInTheDocument()
    })

    expect(screen.getByText('Globex Starter Pack')).toBeInTheDocument()
    expect(screen.getByText('Initech Renewal')).toBeInTheDocument()
  })

  test('renders empty state when no deals', async () => {
    server.use(
      http.get('/api/v1/deals', () =>
        HttpResponse.json({ items: [], total: 0, page: 1, page_size: 20 })
      )
    )

    renderWithRouter(
      <Routes>
        <Route path="/deals" element={<DealsPage />} />
      </Routes>,
      { initialEntries: ['/deals'] }
    )

    await waitFor(() => {
      expect(screen.getByText(/no deals found/i)).toBeInTheDocument()
    })
  })

  test('stage filter shows only matching deals', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/deals" element={<DealsPage />} />
        <Route path="/deals/:id" element={<div>Deal Detail</div>} />
      </Routes>,
      { initialEntries: ['/deals'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Acme Enterprise Deal')).toBeInTheDocument()
    })

    const stageSelect = screen.getByRole('combobox', { name: /filter by stage/i })
    await user.selectOptions(stageSelect, 'won')

    await waitFor(() => {
      expect(screen.getByText('Initech Renewal')).toBeInTheDocument()
    })
    expect(screen.queryByText('Acme Enterprise Deal')).not.toBeInTheDocument()
  })
})

// ─── DealsPage — Kanban board ─────────────────────────────────────────────────

describe('DealsPage — Kanban board', () => {
  test('US2-AC2: Kanban button switches to board view with all 5 stage columns', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/deals" element={<DealsPage />} />
      </Routes>,
      { initialEntries: ['/deals'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /kanban/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /kanban/i }))

    // All 5 stage columns should be visible
    await waitFor(() => {
      expect(screen.getByText('Prospect')).toBeInTheDocument()
    })
    expect(screen.getByText('Proposal')).toBeInTheDocument()
    expect(screen.getByText('Negotiation')).toBeInTheDocument()
    expect(screen.getByText('Won')).toBeInTheDocument()
    expect(screen.getByText('Lost')).toBeInTheDocument()
  })
})

// ─── DealsPage — new deal form ────────────────────────────────────────────────

describe('DealsPage — new deal form', () => {
  test('clicking "New Deal" shows the form', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/deals" element={<DealsPage />} />
      </Routes>,
      { initialEntries: ['/deals'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new deal/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new deal/i }))

    expect(screen.getByRole('button', { name: /create deal/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/deal title/i)).toBeInTheDocument()
  })

  test('submitting form without title shows validation error', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/deals" element={<DealsPage />} />
      </Routes>,
      { initialEntries: ['/deals'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new deal/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new deal/i }))
    await user.click(screen.getByRole('button', { name: /create deal/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/deal title is required/i)
    })
  })
})

// ─── DealDetailPage ────────────────────────────────────────────────────────────

describe('DealDetailPage', () => {
  test('renders deal title, stage, and activities section', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/deals/:id" element={<DealDetailPage />} />
      </Routes>,
      { initialEntries: ['/deals/deal-1'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /acme enterprise deal/i })).toBeInTheDocument()
    })

    expect(screen.getByText('Proposal')).toBeInTheDocument()
    expect(screen.getByText('$50,000 USD')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log activity/i })).toBeInTheDocument()
  })

  test('shows "No activities yet." when deal has no activities', async () => {
    server.use(
      http.get('/api/v1/activities', () =>
        HttpResponse.json({ items: [], total: 0, page: 1, page_size: 20 })
      )
    )

    renderWithRouter(
      <Routes>
        <Route path="/deals/:id" element={<DealDetailPage />} />
      </Routes>,
      { initialEntries: ['/deals/deal-1'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /acme enterprise deal/i })).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText(/no activities yet/i)).toBeInTheDocument()
    })
  })

  test('Edit button shows the edit form', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/deals/:id" element={<DealDetailPage />} />
      </Routes>,
      { initialEntries: ['/deals/deal-1'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /edit/i }))

    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })
})

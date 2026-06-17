import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'

import CompaniesPage from '../src/pages/CompaniesPage'
import CompanyDetailPage from '../src/pages/CompanyDetailPage'

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

// ─── CompaniesPage — list rendering ──────────────────────────────────────────

describe('CompaniesPage — list rendering', () => {
  test('renders companies with names and industry', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/companies/:id" element={<div>Company Detail</div>} />
      </Routes>,
      { initialEntries: ['/companies'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    expect(screen.getByText('Globex Inc')).toBeInTheDocument()
    expect(screen.getByText('Initech')).toBeInTheDocument()
    expect(screen.getAllByText('Technology').length).toBeGreaterThan(0)
  })

  test('renders empty state when no companies', async () => {
    server.use(
      http.get('/api/v1/companies', () =>
        HttpResponse.json({ items: [], total: 0, page: 1, page_size: 20 })
      )
    )

    renderWithRouter(
      <Routes>
        <Route path="/companies" element={<CompaniesPage />} />
      </Routes>,
      { initialEntries: ['/companies'] }
    )

    await waitFor(() => {
      expect(screen.getByText(/no companies found/i)).toBeInTheDocument()
    })
  })
})

// ─── CompaniesPage — industry filter ─────────────────────────────────────────

describe('CompaniesPage — industry filter', () => {
  test('US3-AC1: selecting an industry filter shows only matching companies', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/companies/:id" element={<div>Company Detail</div>} />
      </Routes>,
      { initialEntries: ['/companies'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    const industrySelect = screen.getByRole('combobox', { name: /filter by industry/i })
    await user.selectOptions(industrySelect, 'Technology')

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })
    expect(screen.queryByText('Globex Inc')).not.toBeInTheDocument()
  })
})

// ─── CompaniesPage — new company form ────────────────────────────────────────

describe('CompaniesPage — new company form', () => {
  test('clicking "New Company" shows the form', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/companies/:id" element={<div>Company Detail</div>} />
      </Routes>,
      { initialEntries: ['/companies'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new company/i }))

    expect(screen.getByRole('button', { name: /create company/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument()
  })

  test('submitting form without name shows validation error', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/companies" element={<CompaniesPage />} />
      </Routes>,
      { initialEntries: ['/companies'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new company/i }))
    await user.click(screen.getByRole('button', { name: /create company/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/company name is required/i)
    })
  })
})

// ─── CompanyDetailPage — tabs ─────────────────────────────────────────────────

describe('CompanyDetailPage — tabs', () => {
  test('renders company name and Overview tab by default', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/companies/:id" element={<CompanyDetailPage />} />
      </Routes>,
      { initialEntries: ['/companies/company-1'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /acme corp/i })).toBeInTheDocument()
    })

    expect(screen.getByText('Technology')).toBeInTheDocument()
  })

  test('US1-AC2: Contacts tab shows linked contacts', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/companies/:id" element={<CompanyDetailPage />} />
      </Routes>,
      { initialEntries: ['/companies/company-1'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /acme corp/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /contacts/i }))

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })
  })

  test('US1-AC2: Deals tab shows linked deals', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/companies/:id" element={<CompanyDetailPage />} />
      </Routes>,
      { initialEntries: ['/companies/company-1'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /acme corp/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /deals/i }))

    await waitFor(() => {
      expect(screen.getByText('Acme Enterprise Deal')).toBeInTheDocument()
    })
  })

  test('US2-AC3: empty state in Contacts tab when no contacts', async () => {
    server.use(
      http.get('/api/v1/companies/:id', () =>
        HttpResponse.json({
          id: 'company-2',
          name: 'Globex Inc',
          website: null,
          industry: 'Finance',
          phone: null,
          address: null,
          notes: null,
          owner_id: 'user-1',
          created_at: '2026-06-16T09:00:00Z',
          updated_at: '2026-06-16T09:00:00Z',
          contacts: [],
          deals: [],
        })
      )
    )

    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/companies/:id" element={<CompanyDetailPage />} />
      </Routes>,
      { initialEntries: ['/companies/company-2'] }
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /globex inc/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /contacts/i }))

    await waitFor(() => {
      expect(screen.getByText(/no contacts linked/i)).toBeInTheDocument()
    })
  })
})

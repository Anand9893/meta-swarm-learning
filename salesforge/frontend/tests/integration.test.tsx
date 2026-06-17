import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

import Layout from '../src/components/shared/Layout'
import ProtectedRoute from '../src/components/shared/ProtectedRoute'
import DashboardPage from '../src/pages/DashboardPage'
import LeadsPage from '../src/pages/LeadsPage'
import ContactsPage from '../src/pages/ContactsPage'
import CompaniesPage from '../src/pages/CompaniesPage'
import DealsPage from '../src/pages/DealsPage'
import ActivitiesPage from '../src/pages/ActivitiesPage'

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

const FAKE_USER = JSON.stringify({
  id: 'user-1',
  email: 'rep@test.com',
  full_name: 'Test Rep',
  role: 'rep',
  is_active: true,
})

function renderApp(path: string, authenticated = true) {
  localStorage.clear()
  if (authenticated) {
    localStorage.setItem('sf_access_token', 'fake-access-token')
    localStorage.setItem('sf_refresh_token', 'fake-refresh-token')
    localStorage.setItem('sf_user', FAKE_USER)
  }

  return render(
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/activities" element={<ActivitiesPage />} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

afterEach(() => {
  localStorage.clear()
})

// ─── Navigation Shell ────────────────────────────────────────────────────────

describe('App shell — navigation', () => {
  test('authenticated user sees all nav links', async () => {
    renderApp('/dashboard')
    await waitFor(() => {
      expect(screen.getByText('SalesForge')).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Leads' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contacts' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Companies' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Deals' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Activities' })).toBeInTheDocument()
  })

  test('unauthenticated user is redirected to /login', async () => {
    renderApp('/dashboard', false)
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })
  })

  test('Log out button is visible', async () => {
    renderApp('/dashboard')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
    })
  })
})

// ─── Module Smoke Tests ──────────────────────────────────────────────────────

describe.each([
  ['/dashboard', 'Dashboard'],
  ['/leads', 'Leads'],
  ['/contacts', 'Contacts'],
  ['/companies', 'Companies'],
  ['/deals', 'Deals'],
  ['/activities', 'Activities'],
])('smoke — %s', (path) => {
  test(`${path} renders without crashing`, async () => {
    renderApp(path)
    await waitFor(() => {
      expect(screen.getByText('SalesForge')).toBeInTheDocument()
    })
  })
})

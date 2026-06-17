import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'

import DashboardPage from '../src/pages/DashboardPage'

// Recharts requires ResizeObserver
if (!global.ResizeObserver) {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

const mockRepUser = { id: 'user-1', email: 'rep@example.com', full_name: 'Test Rep', role: 'rep', is_active: true }

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderDashboard({
  token = 'fake-access-token',
  user = mockRepUser,
}: {
  token?: string | null
  user?: object | null
} = {}) {
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
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

afterEach(() => { localStorage.clear() })

// ─── DashboardPage — KPI tiles ────────────────────────────────────────────────

describe('DashboardPage — KPI tiles', () => {
  test('US1-AC1: renders all KPI tiles with correct values', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getAllByTestId('kpi-tile').length).toBeGreaterThanOrEqual(4)
    })

    // KPI values from mockDashboardStats
    expect(screen.getByText('5')).toBeInTheDocument()   // leads_this_week
    expect(screen.getByText('$85,000')).toBeInTheDocument()  // pipeline_value
    expect(screen.getByText('1')).toBeInTheDocument()   // deals_won_this_month
    expect(screen.getByText('3')).toBeInTheDocument()   // overdue_activities
  })

  test('KPI tile labels are visible', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText(/new leads this week/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/pipeline value/i)).toBeInTheDocument()
    expect(screen.getByText(/deals won/i)).toBeInTheDocument()
    expect(screen.getByText(/overdue activities/i)).toBeInTheDocument()
  })
})

// ─── DashboardPage — pipeline chart ──────────────────────────────────────────

describe('DashboardPage — pipeline chart', () => {
  test('US2-AC2: pipeline chart renders', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByTestId('pipeline-chart')).toBeInTheDocument()
    })
  })
})

// ─── DashboardPage — recent activities ───────────────────────────────────────

describe('DashboardPage — recent activities', () => {
  test('US3-AC1: renders recent activities with title and linked record name', async () => {
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Discovery call')).toBeInTheDocument()
    })

    expect(screen.getByText('Follow up email')).toBeInTheDocument()
    // linked_record_name is in a <span> with trailing " · " so use regex
    expect(screen.getByText(/acme enterprise deal/i)).toBeInTheDocument()
    expect(screen.getByText(/alice johnson/i)).toBeInTheDocument()
  })

  test('US3-AC1: shows empty state when no recent activities', async () => {
    server.use(
      http.get('/api/v1/dashboard/recent-activities', () =>
        HttpResponse.json([])
      )
    )

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText(/no recent activities/i)).toBeInTheDocument()
    })
  })
})

// ─── DashboardPage — loading state ───────────────────────────────────────────

describe('DashboardPage — loading state', () => {
  test('shows loading indicator while fetching', () => {
    // Delay the stats response so we see the loading state
    server.use(
      http.get('/api/v1/dashboard/stats', async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return HttpResponse.json({
          leads_this_week: 5,
          pipeline_value: 85000,
          deals_won_this_month: 1,
          deals_won_value_this_month: 25000,
          overdue_activities: 3,
        })
      })
    )

    renderDashboard()

    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument()
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'

import ActivitiesPage from '../src/pages/ActivitiesPage'
import ActivityForm from '../src/components/activities/ActivityForm'
import ActivityListItem from '../src/components/activities/ActivityListItem'

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

// ─── ActivitiesPage — list rendering ─────────────────────────────────────────

describe('ActivitiesPage — list rendering', () => {
  test('renders activities list with titles', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/activities" element={<ActivitiesPage />} />
      </Routes>,
      { initialEntries: ['/activities'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Discovery call with Alice')).toBeInTheDocument()
    })

    expect(screen.getByText('Follow up email')).toBeInTheDocument()
    expect(screen.getByText('Overdue team sync')).toBeInTheDocument()
  })

  test('renders empty state when no activities', async () => {
    server.use(
      http.get('/api/v1/activities', () =>
        HttpResponse.json({ items: [], total: 0, page: 1, page_size: 20 })
      )
    )

    renderWithRouter(
      <Routes>
        <Route path="/activities" element={<ActivitiesPage />} />
      </Routes>,
      { initialEntries: ['/activities'] }
    )

    await waitFor(() => {
      expect(screen.getByText(/no activities found/i)).toBeInTheDocument()
    })
  })
})

// ─── ActivitiesPage — type filter ────────────────────────────────────────────

describe('ActivitiesPage — type filter', () => {
  test('US3-AC1: filter by type shows only matching activities', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/activities" element={<ActivitiesPage />} />
      </Routes>,
      { initialEntries: ['/activities'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Discovery call with Alice')).toBeInTheDocument()
    })

    const typeSelect = screen.getByRole('combobox', { name: /filter by type/i })
    await user.selectOptions(typeSelect, 'call')

    await waitFor(() => {
      expect(screen.getByText('Discovery call with Alice')).toBeInTheDocument()
    })
    expect(screen.queryByText('Follow up email')).not.toBeInTheDocument()
  })
})

// ─── ActivitiesPage — new activity form ──────────────────────────────────────

describe('ActivitiesPage — new activity form', () => {
  test('clicking "New Activity" shows the form', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/activities" element={<ActivitiesPage />} />
      </Routes>,
      { initialEntries: ['/activities'] }
    )

    await waitFor(() => {
      expect(screen.getByText('Discovery call with Alice')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new activity/i }))

    expect(screen.getByRole('button', { name: /log activity/i })).toBeInTheDocument()
    // Use exact role name to avoid ambiguity with the "Filter by type" dropdown
    expect(screen.getByRole('combobox', { name: 'Type *' })).toBeInTheDocument()
    expect(screen.getByLabelText(/^title \*/i)).toBeInTheDocument()
  })
})

// ─── ActivityListItem — overdue indicator ─────────────────────────────────────

describe('ActivityListItem — overdue indicator', () => {
  test('US2-AC3: shows "Overdue" badge for past-due incomplete activity', () => {
    const overdueActivity = {
      id: 'act-overdue',
      type: 'meeting',
      title: 'Missed meeting',
      description: null,
      due_date: '2020-01-01T10:00:00Z',
      completed: false,
      deal_id: null,
      contact_id: null,
      lead_id: null,
      owner_id: 'user-1',
      created_at: '2020-01-01T09:00:00Z',
      updated_at: '2020-01-01T09:00:00Z',
    }

    render(
      <ActivityListItem
        activity={overdueActivity}
        onToggleComplete={vi.fn()}
      />
    )

    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })

  test('does not show "Overdue" badge for completed activity', () => {
    const completedOverdue = {
      id: 'act-done',
      type: 'call',
      title: 'Done call',
      description: null,
      due_date: '2020-01-01T10:00:00Z',
      completed: true,
      deal_id: null,
      contact_id: null,
      lead_id: null,
      owner_id: 'user-1',
      created_at: '2020-01-01T09:00:00Z',
      updated_at: '2020-01-01T09:00:00Z',
    }

    render(
      <ActivityListItem
        activity={completedOverdue}
        onToggleComplete={vi.fn()}
      />
    )

    expect(screen.queryByText('Overdue')).not.toBeInTheDocument()
  })

  test('US2-AC1: checkbox is visible and clickable', () => {
    const activity = {
      id: 'act-1',
      type: 'call',
      title: 'Test call',
      description: null,
      due_date: null,
      completed: false,
      deal_id: null,
      contact_id: null,
      lead_id: null,
      owner_id: 'user-1',
      created_at: '2026-06-17T10:00:00Z',
      updated_at: '2026-06-17T10:00:00Z',
    }

    const onToggle = vi.fn()
    render(<ActivityListItem activity={activity} onToggleComplete={onToggle} />)

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
    checkbox.click()
    expect(onToggle).toHaveBeenCalledWith('act-1', true)
  })
})

// ─── ActivityForm — validation ────────────────────────────────────────────────

describe('ActivityForm — validation', () => {
  test('shows validation error when type is missing', async () => {
    const user = userEvent.setup()
    render(
      <ActivityForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    await user.type(screen.getByLabelText(/title/i), 'Test')
    await user.click(screen.getByRole('button', { name: /log activity/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/activity type is required/i)
  })

  test('shows validation error when title is missing', async () => {
    const user = userEvent.setup()
    render(
      <ActivityForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const typeSelect = screen.getByLabelText(/type/i)
    await user.selectOptions(typeSelect, 'call')
    await user.click(screen.getByRole('button', { name: /log activity/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/activity title is required/i)
  })

  test('US1-AC4: ActivityForm pre-fills deal_id as hidden field', () => {
    render(
      <ActivityForm
        dealId="deal-123"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const hiddenInput = document.querySelector('input[name="deal_id"]') as HTMLInputElement
    expect(hiddenInput).toBeInTheDocument()
    expect(hiddenInput.value).toBe('deal-123')
  })
})

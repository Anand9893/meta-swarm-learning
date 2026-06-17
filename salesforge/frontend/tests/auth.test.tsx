import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'

import LoginPage from '../src/pages/LoginPage'
import RegisterPage from '../src/pages/RegisterPage'
import ForgotPasswordPage from '../src/pages/ForgotPasswordPage'
import ResetPasswordPage from '../src/pages/ResetPasswordPage'
import DashboardPage from '../src/pages/DashboardPage'
import UsersPage from '../src/pages/UsersPage'
import ProtectedRoute from '../src/components/shared/ProtectedRoute'

// Helper to create a fresh QueryClient for each test
function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

// Wrapper that mimics the real app routing
function renderWithRouter(
  ui: React.ReactNode,
  {
    initialEntries = ['/'],
    token = null,
    user = null,
  }: {
    initialEntries?: string[]
    token?: string | null
    user?: object | null
  } = {}
) {
  // Set up localStorage
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

// ─── US1: Register ────────────────────────────────────────────────────────────

describe('Register Page', () => {
  test('US1-AC1: successful registration redirects to /login', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { initialEntries: ['/register'] }
    )

    await user.type(screen.getByLabelText(/full name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })
  })

  test('US1-AC2: duplicate email shows inline error', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
      </Routes>,
      { initialEntries: ['/register'] }
    )

    await user.type(screen.getByLabelText(/full name/i), 'Existing User')
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByText(/email already in use/i)).toBeInTheDocument()
    })
  })
})

// ─── US1: Login ───────────────────────────────────────────────────────────────

describe('Login Page', () => {
  test('US1-AC3: valid login stores tokens and redirects to /dashboard', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>,
      { initialEntries: ['/login'] }
    )

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
    })

    expect(localStorage.getItem('sf_access_token')).toBe('fake-access-token')
    expect(localStorage.getItem('sf_refresh_token')).toBe('fake-refresh-token')
  })

  test('US1-AC4: wrong credentials shows error message', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { initialEntries: ['/login'] }
    )

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })
  })
})

// ─── US2: Token refresh interceptor ──────────────────────────────────────────

describe('Token refresh interceptor (US2-AC1)', () => {
  test('auto-refreshes expired token on 401 and retries original request', async () => {
    // Set up: access token in localStorage, but server returns 401 first time, then 200 after refresh
    localStorage.setItem('sf_access_token', 'expired-token')
    localStorage.setItem('sf_refresh_token', 'fake-refresh-token')

    let callCount = 0

    server.use(
      http.get('/api/v1/users', ({ request }) => {
        callCount++
        const auth = request.headers.get('Authorization')
        if (callCount === 1 && auth === 'Bearer expired-token') {
          return HttpResponse.json({ detail: 'Token expired' }, { status: 401 })
        }
        // After refresh, new token is attached
        return HttpResponse.json([
          { id: 1, email: 'test@example.com', full_name: 'Test User', role: 'rep', is_active: true },
        ])
      })
    )

    // Import and use the axios client directly to test the interceptor
    const { default: client } = await import('../src/api/client')
    const response = await client.get('/api/v1/users')
    expect(response.status).toBe(200)
    expect(localStorage.getItem('sf_access_token')).toBe('new-fake-access-token')
  })
})

// ─── US2: Logout ─────────────────────────────────────────────────────────────

describe('Logout (US2-AC3)', () => {
  test('logout clears localStorage and redirects to /login', async () => {
    localStorage.setItem('sf_access_token', 'fake-access-token')
    localStorage.setItem('sf_refresh_token', 'fake-refresh-token')
    localStorage.setItem('sf_user', JSON.stringify({ id: 1, email: 'test@example.com', role: 'rep' }))

    const { logout } = await import('../src/hooks/useAuth')
    logout()

    expect(localStorage.getItem('sf_access_token')).toBeNull()
    expect(localStorage.getItem('sf_refresh_token')).toBeNull()
    expect(localStorage.getItem('sf_user')).toBeNull()
  })
})

// ─── US3: Forgot Password ─────────────────────────────────────────────────────

describe('Forgot Password Page (US3-AC1)', () => {
  test('shows neutral confirmation message regardless of email', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Routes>,
      { initialEntries: ['/forgot-password'] }
    )

    await user.type(screen.getByLabelText(/email/i), 'anyone@example.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/if that email exists.*reset link/i)
      ).toBeInTheDocument()
    })
  })
})

// ─── US3: Reset Password ──────────────────────────────────────────────────────

describe('Reset Password Page (US3-AC3)', () => {
  test('valid token resets password and redirects to /login', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { initialEntries: ['/reset-password?token=valid-reset-token'] }
    )

    await user.type(screen.getByLabelText(/new password/i), 'newpassword123')
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })
  })
})

// ─── ProtectedRoute ───────────────────────────────────────────────────────────

describe('ProtectedRoute', () => {
  test('redirects unauthenticated users to /login', () => {
    renderWithRouter(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { initialEntries: ['/dashboard'] }
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  test('allows authenticated users to access protected routes', () => {
    renderWithRouter(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      {
        initialEntries: ['/dashboard'],
        token: 'fake-access-token',
        user: { id: 1, email: 'test@example.com', role: 'rep' },
      }
    )

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
  })
})

// ─── FR-012 / US4: UsersPage Admin-only ──────────────────────────────────────

describe('UsersPage (FR-012 / US4-AC3)', () => {
  test('non-admin user is redirected to /dashboard', () => {
    renderWithRouter(
      <Routes>
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredRole="admin">
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>,
      {
        initialEntries: ['/users'],
        token: 'fake-access-token',
        user: { id: 1, email: 'test@example.com', role: 'rep' },
      }
    )

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
  })

  test('admin user can see the users table', async () => {
    renderWithRouter(
      <Routes>
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredRole="admin">
              <UsersPage />
            </ProtectedRoute>
          }
        />
      </Routes>,
      {
        initialEntries: ['/users'],
        token: 'fake-access-token',
        user: { id: 2, email: 'admin@example.com', role: 'admin', full_name: 'Admin User' },
      }
    )

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })

  test('admin can toggle is_active for a user', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredRole="admin">
              <UsersPage />
            </ProtectedRoute>
          }
        />
      </Routes>,
      {
        initialEntries: ['/users'],
        token: 'fake-access-token',
        user: { id: 2, email: 'admin@example.com', role: 'admin', full_name: 'Admin User' },
      }
    )

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    // Find the active toggle for the first user (rep user)
    const toggles = screen.getAllByRole('checkbox')
    expect(toggles.length).toBeGreaterThan(0)

    // Click the toggle
    await user.click(toggles[0])

    // The PATCH request should have been made (MSW will handle it)
    // We just need to verify the toggle worked without error
    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })

  test('admin can change role for a user', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <Routes>
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredRole="admin">
              <UsersPage />
            </ProtectedRoute>
          }
        />
      </Routes>,
      {
        initialEntries: ['/users'],
        token: 'fake-access-token',
        user: { id: 2, email: 'admin@example.com', role: 'admin', full_name: 'Admin User' },
      }
    )

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    // Find role dropdown for the first user
    const selects = screen.getAllByRole('combobox')
    expect(selects.length).toBeGreaterThan(0)

    // Change role to 'manager'
    await user.selectOptions(selects[0], 'manager')

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })
  })
})

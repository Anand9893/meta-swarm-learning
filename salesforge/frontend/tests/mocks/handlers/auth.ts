import { http, HttpResponse } from 'msw'
import type { User, TokenResponse } from '../../../src/types/auth'

const fakeUser: User = {
  id: 1,
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'rep',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
}

const adminUser: User = {
  id: 2,
  email: 'admin@example.com',
  full_name: 'Admin User',
  role: 'admin',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
}

const fakeTokens: TokenResponse = {
  access_token: 'fake-access-token',
  refresh_token: 'fake-refresh-token',
  token_type: 'bearer',
}

export const authHandlers = [
  http.post('/api/v1/auth/register', async ({ request }) => {
    const body = await request.json() as { email: string; password: string; full_name: string }
    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        { detail: 'Email already in use' },
        { status: 400 }
      )
    }
    const newUser: User = {
      id: 3,
      email: body.email,
      full_name: body.full_name,
      role: 'rep',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    }
    return HttpResponse.json(newUser, { status: 201 })
  }),

  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json(fakeTokens)
    }
    if (body.email === 'admin@example.com' && body.password === 'adminpass') {
      return HttpResponse.json({
        ...fakeTokens,
        access_token: 'fake-admin-access-token',
      })
    }
    return HttpResponse.json(
      { detail: 'Invalid credentials' },
      { status: 401 }
    )
  }),

  http.post('/api/v1/auth/refresh', async ({ request }) => {
    const body = await request.json() as { refresh_token: string }
    if (body.refresh_token === 'fake-refresh-token') {
      return HttpResponse.json({
        access_token: 'new-fake-access-token',
        token_type: 'bearer',
      })
    }
    return HttpResponse.json({ detail: 'Invalid refresh token' }, { status: 401 })
  }),

  http.post('/api/v1/auth/logout', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/v1/auth/forgot-password', () => {
    return HttpResponse.json({ message: 'If that email exists, a reset link was sent.' })
  }),

  http.post('/api/v1/auth/reset-password', async ({ request }) => {
    const body = await request.json() as { token: string; new_password: string }
    if (body.token === 'valid-reset-token') {
      return HttpResponse.json({ message: 'Password reset successful' })
    }
    return HttpResponse.json({ detail: 'Invalid or expired token' }, { status: 400 })
  }),

  http.get('/api/v1/users', ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (!auth || !auth.startsWith('Bearer ')) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }
    return HttpResponse.json([fakeUser, adminUser])
  }),

  http.patch('/api/v1/users/:id', async ({ request, params }) => {
    const auth = request.headers.get('Authorization')
    if (!auth || !auth.startsWith('Bearer ')) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }
    const body = await request.json() as { role?: string; is_active?: boolean }
    const updatedUser = { ...fakeUser, id: Number(params.id), ...body }
    return HttpResponse.json(updatedUser)
  }),
]

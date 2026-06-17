import type { User, UserRole } from '../types/auth'

export interface AuthState {
  user: User | null
  role: UserRole | null
  isAdmin: boolean
  isManager: boolean
  isAuthenticated: boolean
}

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('sf_user')
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function useAuth(): AuthState {
  const token = localStorage.getItem('sf_access_token')
  const user = token ? getStoredUser() : null
  const role = user?.role ?? null

  return {
    user,
    role,
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isAuthenticated: !!token,
  }
}

// Standalone logout function (used outside React components, e.g. tests)
export function logout(): void {
  localStorage.removeItem('sf_access_token')
  localStorage.removeItem('sf_refresh_token')
  localStorage.removeItem('sf_user')
}

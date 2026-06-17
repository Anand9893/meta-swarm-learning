import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { UserRole } from '../../types/auth'

interface ProtectedRouteProps {
  requiredRole?: UserRole
  children?: React.ReactNode
}

export default function ProtectedRoute({ requiredRole, children }: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  // If children are provided (used as a wrapper), render them
  if (children) {
    return <>{children}</>
  }

  // Otherwise act as a layout route
  return <Outlet />
}

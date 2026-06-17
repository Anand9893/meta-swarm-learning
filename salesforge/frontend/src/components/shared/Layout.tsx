import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth, logout } from '../../hooks/useAuth'

export default function Layout() {
  const { isAdmin, user } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">SalesForge</h1>
          {user && (
            <p className="text-sm text-gray-500 mt-1">{user.full_name}</p>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/leads"
            className={({ isActive }) =>
              `block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            Leads
          </NavLink>
          <NavLink
            to="/contacts"
            className={({ isActive }) =>
              `block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            Contacts
          </NavLink>
          <NavLink
            to="/companies"
            className={({ isActive }) =>
              `block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            Companies
          </NavLink>
          <NavLink
            to="/deals"
            className={({ isActive }) =>
              `block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            Deals
          </NavLink>
          <NavLink
            to="/activities"
            className={({ isActive }) =>
              `block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            Activities
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              Users
            </NavLink>
          )}
        </nav>
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}

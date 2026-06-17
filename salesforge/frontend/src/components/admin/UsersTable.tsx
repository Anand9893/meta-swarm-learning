import { useUsers, useUpdateUser } from '../../api/users'
import type { UserRole } from '../../types/auth'

const ROLES: UserRole[] = ['admin', 'manager', 'rep']

export default function UsersTable() {
  const { data: users, isLoading, error } = useUsers()
  const updateUser = useUpdateUser()

  if (isLoading) {
    return <div className="text-gray-500">Loading users...</div>
  }

  if (error) {
    return <div className="text-red-500">Failed to load users.</div>
  }

  if (!users || users.length === 0) {
    return <div className="text-gray-500">No users found.</div>
  }

  function handleRoleChange(id: number, role: UserRole) {
    updateUser.mutate({ id, data: { role } })
  }

  function handleActiveToggle(id: number, isActive: boolean) {
    updateUser.mutate({ id, data: { is_active: !isActive } })
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 bg-white shadow rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Active
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {user.full_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {user.email}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                  className="block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
                  aria-label={`Role for ${user.email}`}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <input
                  type="checkbox"
                  checked={user.is_active}
                  onChange={() => handleActiveToggle(user.id, user.is_active)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  aria-label={`Active status for ${user.email}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

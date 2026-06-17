import UsersTable from '../components/admin/UsersTable'

export default function UsersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">User Management</h1>
      <UsersTable />
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useResetPassword } from '../api/auth'
import axios from 'axios'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const resetPassword = useResetPassword()
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await resetPassword.mutateAsync({ token, new_password: newPassword })
      navigate('/login')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail as string | undefined
        setError(detail ?? 'Failed to reset password. The link may be invalid or expired.')
      } else {
        setError('An error occurred. Please try again.')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-md">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {!token && (
            <div className="rounded-md bg-yellow-50 p-4">
              <p className="text-sm text-yellow-700">
                No reset token found. Please use the link from your email.
              </p>
            </div>
          )}
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={resetPassword.isPending || !token}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
          </button>
          <p className="text-center text-sm text-gray-600">
            <Link to="/login" className="text-blue-600 hover:text-blue-500">
              Back to login
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

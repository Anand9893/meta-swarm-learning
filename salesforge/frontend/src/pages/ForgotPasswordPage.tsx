import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForgotPassword } from '../api/auth'

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await forgotPassword.mutateAsync({ email })
    } finally {
      // Always show neutral confirmation regardless of outcome
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-md text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
          <p className="text-gray-600">
            If that email exists, a reset link was sent. Please check your inbox.
          </p>
          <Link to="/login" className="text-blue-600 hover:text-blue-500 text-sm">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-md">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Forgot your password?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={forgotPassword.isPending}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {forgotPassword.isPending ? 'Sending...' : 'Send Reset Link'}
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

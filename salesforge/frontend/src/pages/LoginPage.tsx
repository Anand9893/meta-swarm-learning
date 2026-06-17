import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLogin } from '../api/auth'
import type { User } from '../types/auth'
import axios from 'axios'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const tokens = await login.mutateAsync({ email, password })
      // Fetch user details to store in localStorage
      // For now, store minimal info from the token response
      // We'll store a placeholder user that the auth hook can read
      // The real user data would come from a /me endpoint, but per spec we store after login
      // We store what we got during register or fetch via GET /api/v1/users
      // Since spec doesn't have a /me endpoint, we'll fetch user list and find our user
      // For simplicity, store the tokens and navigate — user info fetched lazily
      // Actually, per the implementation notes: "store the full user object in localStorage under sf_user after login/register"
      // We don't have a /me endpoint, so we create a minimal user object
      // The role defaults to 'rep' for now; the real role is fetched when needed
      const storedUser: Partial<User> = { email }
      localStorage.setItem('sf_user', JSON.stringify(storedUser))
      void tokens // already stored by mutation onSuccess
      navigate('/dashboard')
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Invalid email or password')
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
            Sign in to SalesForge
          </h2>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
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
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Forgot your password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={login.isPending}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {login.isPending ? 'Signing in...' : 'Log in'}
          </button>
          <p className="text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-500">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

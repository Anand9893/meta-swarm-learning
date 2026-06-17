import axios from 'axios'

const client = axios.create({
  baseURL: '/',
})

// Request interceptor: attach Bearer token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('sf_access_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401 with token refresh
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean }
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('sf_refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', {
            refresh_token: refreshToken,
          })
          localStorage.setItem('sf_access_token', data.access_token)
          original.headers['Authorization'] = `Bearer ${data.access_token}`
          return client(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default client

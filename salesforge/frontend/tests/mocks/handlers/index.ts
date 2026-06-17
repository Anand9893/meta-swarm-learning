import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/v1/', () => HttpResponse.json({ status: 'ok' }))
]

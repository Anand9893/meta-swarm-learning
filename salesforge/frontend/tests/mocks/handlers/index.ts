import { http, HttpResponse } from 'msw'
import { authHandlers } from './auth'
import { leadHandlers } from './leads'
import { contactHandlers } from './contacts'

export const handlers = [
  http.get('/api/v1/', () => HttpResponse.json({ status: 'ok' })),
  ...authHandlers,
  ...leadHandlers,
  ...contactHandlers,
]

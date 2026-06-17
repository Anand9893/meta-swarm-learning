import { http, HttpResponse } from 'msw'
import { authHandlers } from './auth'
import { leadHandlers } from './leads'
import { contactHandlers } from './contacts'
import { companyHandlers } from './companies'
import { dealHandlers } from './deals'
import { activityHandlers } from './activities'
import { dashboardHandlers } from './dashboard'

export const handlers = [
  http.get('/api/v1/', () => HttpResponse.json({ status: 'ok' })),
  ...authHandlers,
  ...leadHandlers,
  ...contactHandlers,
  ...companyHandlers,
  ...dealHandlers,
  ...activityHandlers,
  ...dashboardHandlers,
]

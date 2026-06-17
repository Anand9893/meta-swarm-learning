import { http, HttpResponse } from 'msw'
import type { DashboardStats, PipelineStage, ActivityWithParent } from '../../../src/types/dashboard'

export const mockDashboardStats: DashboardStats = {
  leads_this_week: 5,
  pipeline_value: 85000,
  deals_won_this_month: 1,
  deals_won_value_this_month: 25000,
  overdue_activities: 3,
}

export const mockPipelineStages: PipelineStage[] = [
  { stage: 'prospect', count: 1, total_value: 10000 },
  { stage: 'proposal', count: 1, total_value: 50000 },
  { stage: 'negotiation', count: 0, total_value: 0 },
  { stage: 'won', count: 1, total_value: 25000 },
  { stage: 'lost', count: 0, total_value: 0 },
]

export const mockRecentActivities: ActivityWithParent[] = [
  {
    id: 'activity-1',
    type: 'call',
    title: 'Discovery call',
    description: null,
    due_date: null,
    completed: false,
    deal_id: 'deal-1',
    contact_id: null,
    lead_id: null,
    owner_id: 'user-1',
    created_at: '2026-06-17T10:00:00Z',
    updated_at: '2026-06-17T10:00:00Z',
    linked_record_name: 'Acme Enterprise Deal',
    linked_record_type: 'deal',
  },
  {
    id: 'activity-2',
    type: 'email',
    title: 'Follow up email',
    description: null,
    due_date: null,
    completed: true,
    deal_id: null,
    contact_id: 'contact-1',
    lead_id: null,
    owner_id: 'user-1',
    created_at: '2026-06-16T09:00:00Z',
    updated_at: '2026-06-16T09:00:00Z',
    linked_record_name: 'Alice Johnson',
    linked_record_type: 'contact',
  },
]

function requireAuth(request: Request): boolean {
  return !!request.headers.get('Authorization')
}

export const dashboardHandlers = [
  http.get('/api/v1/dashboard/stats', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }
    return HttpResponse.json(mockDashboardStats)
  }),

  http.get('/api/v1/dashboard/pipeline-by-stage', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }
    return HttpResponse.json(mockPipelineStages)
  }),

  http.get('/api/v1/dashboard/recent-activities', ({ request }) => {
    if (!requireAuth(request)) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }
    return HttpResponse.json(mockRecentActivities)
  }),
]

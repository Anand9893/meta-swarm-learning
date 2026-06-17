import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type {
  Activity,
  ActivityListResponse,
  ActivityCreate,
  ActivityUpdate,
} from '../types/activity'

interface ActivityQueryParams {
  type?: string
  completed?: boolean
  deal_id?: string
  contact_id?: string
  lead_id?: string
  page?: number
  page_size?: number
}

export function useActivities(params: ActivityQueryParams = {}) {
  const { type, completed, deal_id, contact_id, lead_id, page = 1, page_size = 20 } = params
  return useQuery({
    queryKey: ['activities', { type, completed, deal_id, contact_id, lead_id, page, page_size }],
    queryFn: () => {
      const qs = new URLSearchParams()
      if (type) qs.set('type', type)
      if (completed !== undefined) qs.set('completed', String(completed))
      if (deal_id) qs.set('deal_id', deal_id)
      if (contact_id) qs.set('contact_id', contact_id)
      if (lead_id) qs.set('lead_id', lead_id)
      qs.set('page', String(page))
      qs.set('page_size', String(page_size))
      return client.get<ActivityListResponse>(`/api/v1/activities?${qs}`).then(r => r.data)
    },
  })
}

export function useActivity(id: string) {
  return useQuery({
    queryKey: ['activities', id],
    queryFn: () => client.get<Activity>(`/api/v1/activities/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

export function useCreateActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ActivityCreate) =>
      client.post<Activity>('/api/v1/activities', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities'] })
    },
  })
}

export function useUpdateActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & ActivityUpdate) =>
      client.patch<Activity>(`/api/v1/activities/${id}`, data).then(r => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['activities'] })
      qc.setQueryData(['activities', updated.id], updated)
    },
  })
}

export function useDeleteActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.delete(`/api/v1/activities/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities'] })
    },
  })
}

export function useToggleComplete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      client.patch<Activity>(`/api/v1/activities/${id}`, { completed }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activities'] })
    },
  })
}

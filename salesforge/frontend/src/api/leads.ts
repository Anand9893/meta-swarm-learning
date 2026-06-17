import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type {
  Lead,
  LeadListResponse,
  LeadCreate,
  LeadUpdate,
  LeadConvertRequest,
  LeadConvertResponse,
} from '../types/lead'

interface LeadQueryParams {
  search?: string
  status?: string
  page?: number
  limit?: number
}

export function useLeads(params: LeadQueryParams = {}) {
  const { search, status, page = 1, limit = 20 } = params
  return useQuery({
    queryKey: ['leads', { search, status, page, limit }],
    queryFn: () => {
      const qs = new URLSearchParams()
      if (search) qs.set('search', search)
      if (status) qs.set('status', status)
      qs.set('page', String(page))
      qs.set('limit', String(limit))
      return client.get<LeadListResponse>(`/api/v1/leads?${qs}`).then(r => r.data)
    },
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: () => client.get<Lead>(`/api/v1/leads/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: LeadCreate) =>
      client.post<Lead>('/api/v1/leads', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & LeadUpdate) =>
      client.patch<Lead>(`/api/v1/leads/${id}`, data).then(r => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.setQueryData(['leads', updated.id], updated)
    },
  })
}

export function useDeleteLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.delete(`/api/v1/leads/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useConvertLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & LeadConvertRequest) =>
      client
        .post<LeadConvertResponse>(`/api/v1/leads/${id}/convert`, data)
        .then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

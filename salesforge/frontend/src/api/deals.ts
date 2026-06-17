import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type {
  Deal,
  DealListResponse,
  DealCreate,
  DealUpdate,
  DealStage,
  PipelineStageSummary,
} from '../types/deal'

interface DealQueryParams {
  stage?: DealStage
  search?: string
  page?: number
  page_size?: number
}

export function useDeals(params: DealQueryParams = {}) {
  const { stage, search, page = 1, page_size = 20 } = params
  return useQuery({
    queryKey: ['deals', { stage, search, page, page_size }],
    queryFn: () => {
      const qs = new URLSearchParams()
      if (stage) qs.set('stage', stage)
      if (search) qs.set('search', search)
      qs.set('page', String(page))
      qs.set('page_size', String(page_size))
      return client.get<DealListResponse>(`/api/v1/deals?${qs}`).then(r => r.data)
    },
  })
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ['deals', id],
    queryFn: () => client.get<Deal>(`/api/v1/deals/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

export function usePipelineSummary() {
  return useQuery({
    queryKey: ['pipeline-summary'],
    queryFn: () =>
      client.get<PipelineStageSummary[]>('/api/v1/deals/pipeline-summary').then(r => r.data),
  })
}

export function useCreateDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: DealCreate) =>
      client.post<Deal>('/api/v1/deals', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
      qc.invalidateQueries({ queryKey: ['pipeline-summary'] })
    },
  })
}

export function useUpdateDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & DealUpdate) =>
      client.patch<Deal>(`/api/v1/deals/${id}`, data).then(r => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['deals'] })
      qc.invalidateQueries({ queryKey: ['pipeline-summary'] })
      qc.setQueryData(['deals', updated.id], updated)
    },
  })
}

export function useDeleteDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.delete(`/api/v1/deals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
      qc.invalidateQueries({ queryKey: ['pipeline-summary'] })
    },
  })
}

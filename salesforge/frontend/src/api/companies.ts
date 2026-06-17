import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type {
  Company,
  CompanyDetail,
  CompanyListResponse,
  CompanyCreate,
  CompanyUpdate,
} from '../types/company'

interface CompanyQueryParams {
  search?: string
  industry?: string
  page?: number
  page_size?: number
}

export function useCompanies(params: CompanyQueryParams = {}) {
  const { search, industry, page = 1, page_size = 20 } = params
  return useQuery({
    queryKey: ['companies', { search, industry, page, page_size }],
    queryFn: () => {
      const qs = new URLSearchParams()
      if (search) qs.set('search', search)
      if (industry) qs.set('industry', industry)
      qs.set('page', String(page))
      qs.set('page_size', String(page_size))
      return client.get<CompanyListResponse>(`/api/v1/companies?${qs}`).then(r => r.data)
    },
  })
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: () => client.get<CompanyDetail>(`/api/v1/companies/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

export function useCreateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CompanyCreate) =>
      client.post<Company>('/api/v1/companies', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}

export function useUpdateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & CompanyUpdate) =>
      client.patch<Company>(`/api/v1/companies/${id}`, data).then(r => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      qc.setQueryData(['companies', updated.id], updated)
    },
  })
}

export function useDeleteCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.delete(`/api/v1/companies/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}

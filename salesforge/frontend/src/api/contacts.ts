import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type {
  Contact,
  ContactDetail,
  ContactListResponse,
  ContactCreate,
  ContactUpdate,
} from '../types/contact'

interface ContactQueryParams {
  search?: string
  company_id?: string
  page?: number
  limit?: number
}

export function useContacts(params: ContactQueryParams = {}) {
  const { search, company_id, page = 1, limit = 20 } = params
  return useQuery({
    queryKey: ['contacts', { search, company_id, page, limit }],
    queryFn: () => {
      const qs = new URLSearchParams()
      if (search) qs.set('search', search)
      if (company_id) qs.set('company_id', company_id)
      qs.set('page', String(page))
      qs.set('limit', String(limit))
      return client.get<ContactListResponse>(`/api/v1/contacts?${qs}`).then(r => r.data)
    },
  })
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: () => client.get<ContactDetail>(`/api/v1/contacts/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ContactCreate) =>
      client.post<Contact>('/api/v1/contacts', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useUpdateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & ContactUpdate) =>
      client.patch<Contact>(`/api/v1/contacts/${id}`, data).then(r => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.setQueryData(['contacts', updated.id], updated)
    },
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.delete(`/api/v1/contacts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

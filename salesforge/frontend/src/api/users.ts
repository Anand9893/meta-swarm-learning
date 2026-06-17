import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import client from './client'
import type { User, UpdateUserRequest } from '../types/auth'

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => client.get<User[]>('/api/v1/users').then((r) => r.data),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) =>
      client.patch<User>(`/api/v1/users/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

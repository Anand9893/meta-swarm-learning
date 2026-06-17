import { useQuery } from '@tanstack/react-query'
import client from './client'
import type { DashboardStats, PipelineStage, ActivityWithParent } from '../types/dashboard'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () =>
      client.get<DashboardStats>('/api/v1/dashboard/stats').then(r => r.data),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}

export function usePipelineByStage() {
  return useQuery({
    queryKey: ['dashboard', 'pipeline'],
    queryFn: () =>
      client.get<PipelineStage[]>('/api/v1/dashboard/pipeline-by-stage').then(r => r.data),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}

export function useRecentActivities() {
  return useQuery({
    queryKey: ['dashboard', 'activities'],
    queryFn: () =>
      client.get<ActivityWithParent[]>('/api/v1/dashboard/recent-activities').then(r => r.data),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}

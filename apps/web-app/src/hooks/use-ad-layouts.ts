import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { ZoneConfig } from './use-ad-zones';

export interface AdLayout {
  _id: string;
  name: string;
  zones: ZoneConfig[];
  sidebarWidth: number;
  isActive: boolean;
  createdAt: string;
}

export function useAdLayouts() {
  return useQuery<{ layouts: AdLayout[] }>({
    queryKey: ['ad-layouts'],
    queryFn: () => api.get('/api/community/ads/layouts'),
  });
}

export function useCreateAdLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; zones?: ZoneConfig[]; sidebarWidth?: number }) =>
      api.post('/api/community/ads/layouts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-layouts'] });
    },
  });
}

export function useActivateAdLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/community/ads/layouts/${id}/activate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-layouts'] });
      queryClient.invalidateQueries({ queryKey: ['ad-zones'] });
    },
  });
}

export function useDuplicateAdLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/community/ads/layouts/${id}/duplicate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-layouts'] });
    },
  });
}

export function useDeleteAdLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/community/ads/layouts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-layouts'] });
    },
  });
}

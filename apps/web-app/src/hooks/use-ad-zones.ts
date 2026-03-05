import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface ZoneConfig {
  id: 'content-top' | 'content-bottom' | 'sidebar-top' | 'sidebar-bottom';
  adType: 'rectangle' | 'square';
  width: number;   // 0 = 100%
  height: number;  // px
  isActive: boolean;
}

const DEFAULT_ZONES: ZoneConfig[] = [
  { id: 'content-top', adType: 'rectangle', width: 0, height: 90, isActive: true },
  { id: 'sidebar-bottom', adType: 'square', width: 0, height: 250, isActive: true },
];

export function useAdZones() {
  return useQuery<{ zones: ZoneConfig[] }>({
    queryKey: ['ad-zones'],
    queryFn: () => api.get('/api/community/ads/zones'),
    staleTime: 10 * 60 * 1000,
    placeholderData: { zones: DEFAULT_ZONES },
  });
}

export function useSaveAdZones() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (zones: ZoneConfig[]) =>
      api.put('/api/community/ads/zones', { zones }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-zones'] });
    },
  });
}

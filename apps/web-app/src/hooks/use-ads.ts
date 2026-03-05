import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface Ad {
  _id: string;
  type: 'rectangle' | 'square';
  title: string;
  imageUrl: string;
  link: string;
  linkTarget: '_blank' | '_self';
  altText: string;
  isActive: boolean;
  order: number;
  createdAt: string;
}

// Aktive Ads laden (öffentlich)
export function useAds(type?: 'rectangle' | 'square') {
  return useQuery<{ ads: Ad[] }>({
    queryKey: ['ads', type],
    queryFn: () => {
      const params = type ? `?type=${type}` : '';
      return api.get(`/api/community/ads${params}`);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Alle Ads (Admin)
export function useAllAds(type?: 'rectangle' | 'square') {
  return useQuery<{ ads: Ad[] }>({
    queryKey: ['ads', 'all', type],
    queryFn: () => {
      const params = type ? `?type=${type}` : '';
      return api.get(`/api/community/ads/all${params}`);
    },
    staleTime: 0,
  });
}

// Ad erstellen
export function useCreateAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Ad, '_id' | 'createdAt'>) =>
      api.post('/api/community/ads', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
    },
  });
}

// Ad aktualisieren
export function useUpdateAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Ad> }) =>
      api.put(`/api/community/ads/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
    },
  });
}

// Ad löschen
export function useDeleteAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/community/ads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
    },
  });
}

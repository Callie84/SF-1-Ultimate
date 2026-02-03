// /apps/web-app/src/hooks/use-strains.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface Strain {
  _id: string;
  name: string;
  slug: string;
  type: 'indica' | 'sativa' | 'hybrid' | 'autoflower';
  genetics?: string;
  description?: string;
  thc?: number;
  cbd?: number;
  cbg?: number;
  terpenes?: Record<string, number>;
  totalTerpenes?: number;
  effects?: string[];
  aromas?: string[];
  flavors?: string[];
  imageUrl?: string;
  source?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StrainsResponse {
  strains: Strain[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface UseStrainsOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
}

export function useStrains(options: UseStrainsOptions = {}) {
  return useQuery<StrainsResponse>({
    queryKey: ['strains', options],
    queryFn: () => {
      const params = new URLSearchParams();
      if (options.page) params.set('page', options.page.toString());
      if (options.limit) params.set('limit', options.limit.toString());
      if (options.search) params.set('search', options.search);
      if (options.type) params.set('type', options.type);
      return api.get<StrainsResponse>(`/api/community/strains?${params.toString()}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useStrain(id: string | null) {
  return useQuery<Strain>({
    queryKey: ['strain', id],
    queryFn: () => api.get<Strain>(`/api/community/strains/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStrainSearch(search: string, limit: number = 10) {
  return useQuery<StrainsResponse>({
    queryKey: ['strains', 'search', search, limit],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('search', search);
      params.set('limit', limit.toString());
      return api.get<StrainsResponse>(`/api/community/strains?${params.toString()}`);
    },
    enabled: search.length >= 2,
    staleTime: 30 * 1000,
  });
}

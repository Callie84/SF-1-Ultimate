import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { Grow } from '@/types/journal';

// Query Keys
export const journalKeys = {
  all: ['journal'] as const,
  grows: () => [...journalKeys.all, 'grows'] as const,
  grow: (id: string) => [...journalKeys.all, 'grow', id] as const,
  entries: (growId: string) => [...journalKeys.all, 'entries', growId] as const,
  entry: (id: string) => [...journalKeys.all, 'entry', id] as const,
};

// Get all grows
export function useGrows() {
  return useQuery({
    queryKey: journalKeys.grows(),
    queryFn: async () => {
      // api-client returns data directly (response interceptor)
      const data = await api.get('/api/journal/grows');
      return data;
    },
  });
}

// Get single grow
export function useGrow(id: string) {
  return useQuery({
    queryKey: journalKeys.grow(id),
    queryFn: async () => {
      const data = await api.get(`/api/journal/grows/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// Create grow - uses backend schema (different from Grow type)
export function useCreateGrow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (growData: {
      strainName: string;
      breeder?: string;
      type: 'feminized' | 'autoflower' | 'regular' | 'clone';
      environment: 'indoor' | 'outdoor' | 'greenhouse';
      medium?: string;
      startDate: string;
      isPublic?: boolean;
      tags?: string[];
    }) => {
      const data = await api.post('/api/journal/grows', growData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.grows() });
    },
  });
}

// Update grow
export function useUpdateGrow(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (growData: Partial<Grow>) => {
      const data = await api.patch(`/api/journal/grows/${id}`, growData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.grow(id) });
      queryClient.invalidateQueries({ queryKey: journalKeys.grows() });
    },
  });
}

// Delete grow
export function useDeleteGrow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/journal/grows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.grows() });
    },
  });
}

// Get entries for a grow
export function useEntries(growId: string) {
  return useQuery({
    queryKey: journalKeys.entries(growId),
    queryFn: async () => {
      const data = await api.get(`/api/journal/grows/${growId}/entries`);
      return data;
    },
    enabled: !!growId,
  });
}

// Create entry
export function useCreateEntry(growId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryData: any) => {
      const data = await api.post(`/api/journal/grows/${growId}/entries`, entryData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.entries(growId) });
      queryClient.invalidateQueries({ queryKey: journalKeys.grow(growId) });
    },
  });
}

// Update entry
export function useUpdateEntry(id: string, growId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryData: any) => {
      const data = await api.patch(`/api/journal/entries/${id}`, entryData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.entry(id) });
      queryClient.invalidateQueries({ queryKey: journalKeys.entries(growId) });
    },
  });
}

// Delete entry
export function useDeleteEntry(growId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/journal/entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.entries(growId) });
    },
  });
}

// Toggle reaction
export function useToggleReaction(entryId: string, growId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (type: 'LIKE' | 'LOVE' | 'FIRE' | 'CURIOUS') => {
      const data = await api.post(`/api/journal/entries/${entryId}/reactions`, { type });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.entries(growId) });
    },
  });
}

// Get comments
export function useComments(entryId: string) {
  return useQuery({
    queryKey: [...journalKeys.all, 'comments', entryId],
    queryFn: async () => {
      const data = await api.get(`/api/journal/entries/${entryId}/comments`);
      return data;
    },
    enabled: !!entryId,
  });
}

// Create comment
export function useCreateComment(entryId: string, growId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const data = await api.post(`/api/journal/entries/${entryId}/comments`, { content });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...journalKeys.all, 'comments', entryId] });
      queryClient.invalidateQueries({ queryKey: journalKeys.entries(growId) });
    },
  });
}

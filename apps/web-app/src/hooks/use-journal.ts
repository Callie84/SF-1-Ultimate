import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { Grow, ApiGrow, ApiEntry, CreateEntryData } from '@/types/journal';

// Public user info by userId (username + avatar)
export function useUserById(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-by-id', userId],
    queryFn: async () => {
      const data = await api.get(`/api/auth/users/by-id/${userId}`);
      return data as { id: string; username: string; avatar: string | null };
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 min cache
  });
}

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

// Get clones of a grow (Session 44)
export function useGrowClones(growId: string) {
  return useQuery({
    queryKey: [...journalKeys.all, 'clones', growId],
    queryFn: async () => {
      const data = await api.get(`/api/journal/grows/${growId}/clones`);
      return data;
    },
    enabled: !!growId,
    staleTime: 2 * 60 * 1000,
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
      motherGrowId?: string;
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
    mutationFn: async (entryData: CreateEntryData) => {
      const data = await api.post(`/api/journal/grows/${growId}/entries`, entryData);
      return data as { entry: ApiEntry };
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
    mutationFn: async (entryData: Partial<CreateEntryData>) => {
      const data = await api.patch(`/api/journal/entries/${id}`, entryData);
      return data as { entry: ApiEntry };
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

// Mark grow as harvested
export function useHarvestGrow(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      harvestDate: string;
      yieldWet?: number;
      yieldDry?: number;
      growAreaM2?: number;
      quality?: number;
    }) => {
      const result = await api.post(`/api/journal/grows/${id}/harvest`, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.grow(id) });
      queryClient.invalidateQueries({ queryKey: journalKeys.grows() });
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

// Public grows feed (infinite / paginated)
export function usePublicFeed(options?: {
  sortBy?: string;
  status?: string;
  environment?: string;
  medium?: string;
  lightType?: string;
  difficulty?: string;
  limit?: number;
  userId?: string;
}) {
  const sortBy = options?.sortBy || 'recent';
  const status = options?.status || '';
  const environment = options?.environment || '';
  const medium = options?.medium || '';
  const lightType = options?.lightType || '';
  const difficulty = options?.difficulty || '';
  const limit = options?.limit || 12;
  const userId = options?.userId || '';

  return useInfiniteQuery({
    queryKey: [...journalKeys.all, 'feed', sortBy, status, environment, medium, lightType, difficulty, userId],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        sortBy,
        limit: String(limit),
        skip: String(pageParam),
        ...(status && status !== 'all' ? { status } : {}),
        ...(environment && environment !== 'all' ? { environment } : {}),
        ...(medium && medium !== 'all' ? { medium } : {}),
        ...(lightType && lightType !== 'all' ? { lightType } : {}),
        ...(difficulty && difficulty !== 'all' ? { difficulty } : {}),
        ...(userId ? { userId } : {}),
      });
      const data = await api.get(`/api/journal/feed/?${params}`);
      return data as { grows: ApiGrow[]; total: number };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.flatMap(p => p.grows).length;
      return loaded < lastPage.total ? loaded : undefined;
    },
    staleTime: 2 * 60 * 1000,
    initialPageParam: 0,
  });
}

// Following feed (grows from followed users) — requires auth
export function useFollowingFeed(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: [...journalKeys.all, 'feed', 'following'],
    queryFn: async ({ pageParam = 0 }) => {
      const data = await api.get(`/api/journal/feed/following?limit=12&skip=${pageParam}`);
      return data as { grows: ApiGrow[]; total: number };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.flatMap(p => p.grows).length;
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    initialPageParam: 0,
  });
}

// Grows for a specific strain
export function useStrainFeed(strainId: string | undefined) {
  return useInfiniteQuery({
    queryKey: [...journalKeys.all, 'feed', 'strain', strainId],
    queryFn: async ({ pageParam = 0 }) => {
      const data = await api.get(`/api/journal/feed/strain/${strainId}?limit=12&skip=${pageParam}`);
      return data as { grows: ApiGrow[]; total: number };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.flatMap(p => p.grows).length;
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled: !!strainId,
    staleTime: 5 * 60 * 1000,
    initialPageParam: 0,
  });
}

// Public grow entries (no auth required)
export function usePublicEntries(growId: string) {
  return useQuery({
    queryKey: [...journalKeys.all, 'public-entries', growId],
    queryFn: async () => {
      const data = await api.get(`/api/journal/grows/${growId}/entries`);
      return data;
    },
    enabled: !!growId,
  });
}

// Toggle grow visibility (public/private)
export function useToggleVisibility(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (isPublic: boolean) => {
      const data = await api.patch(`/api/journal/grows/${id}`, { isPublic });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.grow(id) });
      queryClient.invalidateQueries({ queryKey: journalKeys.grows() });
    },
  });
}

// Upload photo to entry
export function useUploadPhoto(entryId: string, growId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption?: string }) => {
      const formData = new FormData();
      formData.append('photo', file);
      if (caption) formData.append('caption', caption);
      const data = await api.post(`/api/journal/entries/${entryId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.entries(growId) });
    },
  });
}

// Delete photo
export function useDeletePhoto(growId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photoId: string) => {
      await api.delete(`/api/journal/photos/${photoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.entries(growId) });
    },
  });
}

// Upload photo to grow gallery (via media-service URL)
export function useAddGrowPhoto(growId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ url, thumbnailUrl, caption }: { url: string; thumbnailUrl?: string; caption?: string }) => {
      const data = await api.post(`/api/grows/${growId}/photos`, { url, thumbnailUrl, caption });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.grow(growId) });
    },
  });
}

// Delete photo from grow gallery
export function useDeleteGrowPhoto(growId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photoId: string) => {
      await api.delete(`/api/grows/${growId}/photos/${photoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.grow(growId) });
    },
  });
}

// Create comment (for journal entries)
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

// ── Grow Social (Likes + Comments) ──────────────────────────────────────────

// Get reactions for a grow (includes userReaction if logged in)
export function useGrowReactions(growId: string) {
  return useQuery({
    queryKey: [...journalKeys.all, 'reactions', growId],
    queryFn: async () => {
      const data = await api.get(`/api/journal/grows/${growId}/reactions`);
      return data;
    },
    enabled: !!growId,
  });
}

// Toggle like (uses 'fire' reaction type as the like)
export function useLikeGrow(growId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const data = await api.post(`/api/journal/grows/${growId}/react`, { type: 'fire' });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...journalKeys.all, 'reactions', growId] });
      queryClient.invalidateQueries({ queryKey: [...journalKeys.all, 'feed'] });
      queryClient.invalidateQueries({ queryKey: journalKeys.grow(growId) });
    },
  });
}

// Get comments for a grow
export function useGrowComments(growId: string) {
  return useQuery({
    queryKey: [...journalKeys.all, 'grow-comments', growId],
    queryFn: async () => {
      const data = await api.get(`/api/journal/grows/${growId}/comments`);
      return data;
    },
    enabled: !!growId,
  });
}

// Add a comment to a grow (with optional parentId for replies)
export function useAddGrowComment(growId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const data = await api.post(`/api/journal/grows/${growId}/comment`, { content, parentId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...journalKeys.all, 'grow-comments', growId] });
      queryClient.invalidateQueries({ queryKey: journalKeys.grow(growId) });
    },
  });
}

// Timelapse frames für einen Grow
export function useTimelapse(growId: string | null) {
  return useQuery({
    queryKey: [...journalKeys.all, 'timelapse', growId],
    queryFn: async () => {
      const data = await api.get(`/api/journal/grows/${growId}/timelapse`);
      return data as {
        growId: string;
        strainName: string;
        frameCount: number;
        frames: Array<{ url: string; thumbnailUrl: string; caption: string; date: string; source: 'entry' | 'gallery' }>;
      };
    },
    enabled: !!growId,
    staleTime: 5 * 60 * 1000,
  });
}

// Delete a grow comment
export function useDeleteGrowComment(growId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/api/journal/grows/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...journalKeys.all, 'grow-comments', growId] });
      queryClient.invalidateQueries({ queryKey: journalKeys.grow(growId) });
    },
  });
}

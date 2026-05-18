// /apps/web-app/src/hooks/use-follows.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface FollowStats {
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

interface FollowersResponse {
  followers: string[];
  total: number;
  hasMore: boolean;
}

interface FollowingResponse {
  following: string[];
  total: number;
  hasMore: boolean;
}

interface SuggestionsResponse {
  suggestions: string[];
}

export function useFollowStats(userId: string | undefined) {
  return useQuery<FollowStats>({
    queryKey: ['follow-stats', userId],
    queryFn: () => api.get<FollowStats>(`/api/community/follows/stats/${userId}`),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useIsFollowing(userId: string | undefined) {
  return useQuery<{ isFollowing: boolean }>({
    queryKey: ['is-following', userId],
    queryFn: () => api.get<{ isFollowing: boolean }>(`/api/community/follows/check/${userId}`),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useFollowers(userId: string | undefined, options?: { skip?: number; limit?: number }) {
  return useQuery<FollowersResponse>({
    queryKey: ['followers', userId, options],
    queryFn: () => {
      const params = new URLSearchParams();
      if (options?.skip) params.set('skip', options.skip.toString());
      if (options?.limit) params.set('limit', options.limit.toString());
      return api.get<FollowersResponse>(`/api/community/follows/followers/${userId}?${params.toString()}`);
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useFollowing(userId: string | undefined, options?: { skip?: number; limit?: number }) {
  return useQuery<FollowingResponse>({
    queryKey: ['following', userId, options],
    queryFn: () => {
      const params = new URLSearchParams();
      if (options?.skip) params.set('skip', options.skip.toString());
      if (options?.limit) params.set('limit', options.limit.toString());
      return api.get<FollowingResponse>(`/api/community/follows/following/${userId}?${params.toString()}`);
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useFollowSuggestions(limit?: number) {
  return useQuery<SuggestionsResponse>({
    queryKey: ['follow-suggestions', limit],
    queryFn: () => {
      const params = new URLSearchParams();
      if (limit) params.set('limit', limit.toString());
      return api.get<SuggestionsResponse>(`/api/community/follows/suggestions?${params.toString()}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useFollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      api.post(`/api/community/follows/${userId}`),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['follow-stats', userId] });
      queryClient.invalidateQueries({ queryKey: ['is-following', userId] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['follow-suggestions'] });
    },
  });
}

export function useUnfollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/api/community/follows/${userId}`),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['follow-stats', userId] });
      queryClient.invalidateQueries({ queryKey: ['is-following', userId] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['follow-suggestions'] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api-client';
import { Thread, Reply, ApiThread, ApiReply, ThreadListResponse } from '@/types/community';

// Query Keys
export const communityKeys = {
  all: ['community'] as const,
  categories: () => [...communityKeys.all, 'categories'] as const,
  threads: (categoryId?: string) => [...communityKeys.all, 'threads', categoryId] as const,
  thread: (id: string) => [...communityKeys.all, 'thread', id] as const,
  replies: (threadId: string) => [...communityKeys.all, 'replies', threadId] as const,
};

// Get all categories
export function useCategories() {
  return useQuery({
    queryKey: communityKeys.categories(),
    queryFn: async () => {
      const data = await api.get('/api/community/categories');
      return data;
    },
  });
}

// Get threads (optionally filtered by category)
export function useThreads(categoryId?: string, filters?: Record<string, string | number | boolean>) {
  return useQuery({
    queryKey: communityKeys.threads(categoryId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryId) params.append('categoryId', categoryId);
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          params.append(key, String(value));
        });
      }
      const data = await api.get(`/api/community/threads?${params}`);
      return data;
    },
  });
}

// Get single thread
export function useThread(id: string) {
  return useQuery({
    queryKey: communityKeys.thread(id),
    queryFn: async () => {
      const data = await api.get(`/api/community/threads/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// Create thread
export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadData: Partial<Thread>) => {
      const data = await api.post('/api/community/threads', threadData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
  });
}

// Update thread
export function useUpdateThread(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadData: Partial<Thread>) => {
      const data = await api.patch(`/api/community/threads/${id}`, threadData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.thread(id) });
      queryClient.invalidateQueries({ queryKey: communityKeys.threads() });
    },
  });
}

// Delete thread
export function useDeleteThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/community/threads/${id}`);
      return id;
    },
    onSuccess: (id: string) => {
      queryClient.invalidateQueries({ queryKey: communityKeys.threads() });
      toast('Thread gelöscht', {
        duration: 10000,
        action: {
          label: 'Rückgängig',
          onClick: async () => {
            try {
              await api.patch(`/api/community/threads/${id}/restore`);
              queryClient.invalidateQueries({ queryKey: communityKeys.threads() });
              toast.success('Thread wiederhergestellt');
            } catch {
              toast.error('Fehler beim Wiederherstellen des Threads');
            }
          },
        },
      });
    },
  });
}

// Get replies for a thread
export function useReplies(threadId: string) {
  return useQuery({
    queryKey: communityKeys.replies(threadId),
    queryFn: async () => {
      const data = await api.get(`/api/community/threads/${threadId}/replies`);
      return data;
    },
    enabled: !!threadId,
  });
}

// Create reply
export function useCreateReply(threadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (replyData: Partial<Reply>) => {
      const data = await api.post(`/api/community/threads/${threadId}/replies`, replyData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.replies(threadId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.thread(threadId) });
    },
  });
}

// Update reply
export function useUpdateReply(id: string, threadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (replyData: Partial<Reply>) => {
      const data = await api.patch(`/api/community/replies/${id}`, replyData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.replies(threadId) });
    },
  });
}

// Delete reply
export function useDeleteReply(threadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/community/replies/${id}`);
      return id;
    },
    onSuccess: (id: string) => {
      queryClient.invalidateQueries({ queryKey: communityKeys.replies(threadId) });
      toast('Reply gelöscht', {
        duration: 10000,
        action: {
          label: 'Rückgängig',
          onClick: async () => {
            try {
              await api.patch(`/api/community/replies/${id}/restore`);
              queryClient.invalidateQueries({ queryKey: communityKeys.replies(threadId) });
              toast.success('Reply wiederhergestellt');
            } catch {
              toast.error('Fehler beim Wiederherstellen der Reply');
            }
          },
        },
      });
    },
  });
}

// Vote on thread
export function useVoteThread(threadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (type: 'upvote' | 'downvote') => {
      const data = await api.post('/api/community/vote', {
        targetId: threadId,
        targetType: 'thread',
        type,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.thread(threadId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.threads() });
    },
  });
}

// Vote on reply
export function useVoteReply(replyId: string, threadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (type: 'upvote' | 'downvote') => {
      const data = await api.post('/api/community/vote', {
        targetId: replyId,
        targetType: 'reply',
        type,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.replies(threadId) });
    },
  });
}

// Get user's votes for a batch of item IDs (to show highlighted state)
export function useUserVotesBatch(ids: string[]) {
  return useQuery({
    queryKey: [...communityKeys.all, 'votes', ids.join(',')],
    queryFn: async () => {
      const data = await api.post('/api/community/votes/batch', { targetIds: ids });
      return (data as { votes: Record<string, 'upvote' | 'downvote'> }).votes;
    },
    enabled: ids.length > 0,
    staleTime: 30 * 1000,
  });
}

// Search threads via community service
export function useSearchThreads(query: string) {
  return useQuery({
    queryKey: [...communityKeys.all, 'search', query],
    queryFn: async () => {
      const data = await api.get(`/api/community/threads/search?q=${encodeURIComponent(query)}&limit=20`);
      return data as ThreadListResponse;
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });
}

// Accept reply (mark as solution)
export function useAcceptReply(threadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (replyId: string) => {
      const data = await api.post(`/api/community/replies/${replyId}/accept`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.replies(threadId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.thread(threadId) });
    },
  });
}

// Inhalt melden (Thread oder Reply)
export function useReportContent() {
  return useMutation({
    mutationFn: async (data: {
      targetId: string;
      targetType: 'thread' | 'reply';
      reason: 'spam' | 'abuse' | 'harassment' | 'illegal' | 'misinformation' | 'other';
      description?: string;
    }) => {
      const result = await api.post('/api/community/moderation/reports', data);
      return result;
    },
  });
}

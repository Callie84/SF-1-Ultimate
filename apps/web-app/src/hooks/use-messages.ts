// /apps/web-app/src/hooks/use-messages.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  readAt?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  participants: string[];
  lastMessageId?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCounts: Record<string, number>;
  deletedBy: string[];
  createdAt: string;
  updatedAt: string;
}

interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
  hasMore: boolean;
}

interface MessagesResponse {
  messages: Message[];
  total: number;
  hasMore: boolean;
}

interface UnreadCountResponse {
  count: number;
}

export function useConversations(options?: { skip?: number; limit?: number }) {
  return useQuery<ConversationsResponse>({
    queryKey: ['conversations', options],
    queryFn: () => {
      const params = new URLSearchParams();
      if (options?.skip) params.set('skip', options.skip.toString());
      if (options?.limit) params.set('limit', options.limit.toString());
      return api.get<ConversationsResponse>(`/api/community/messages/conversations?${params.toString()}`);
    },
    staleTime: 30 * 1000,
  });
}

export function useMessages(conversationId: string | null, options?: { skip?: number; limit?: number }) {
  return useQuery<MessagesResponse>({
    queryKey: ['messages', conversationId, options],
    queryFn: () => {
      const params = new URLSearchParams();
      if (options?.skip) params.set('skip', options.skip.toString());
      if (options?.limit) params.set('limit', options.limit.toString());
      return api.get<MessagesResponse>(`/api/community/messages/conversation/${conversationId}?${params.toString()}`);
    },
    enabled: !!conversationId,
    staleTime: 10 * 1000,
  });
}

export function useUnreadMessageCount() {
  return useQuery<UnreadCountResponse>({
    queryKey: ['messages', 'unread-count'],
    queryFn: () => api.get<UnreadCountResponse>('/api/community/messages/unread-count'),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ receiverId, content }: { receiverId: string; content: string }) =>
      api.post<{ message: Message; conversation: Conversation }>('/api/community/messages/send', {
        receiverId,
        content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useMarkMessagesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      api.post(`/api/community/messages/conversation/${conversationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
    },
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      api.post<{ conversation: Conversation }>(`/api/community/messages/start/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      api.delete(`/api/community/messages/conversation/${conversationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) =>
      api.delete(`/api/community/messages/${messageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

// /apps/web-app/src/hooks/use-notifications.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface Notification {
  _id: string;
  userId: string;
  type: 'comment' | 'reply' | 'reaction' | 'follow' | 'mention' | 'price_alert' | 'milestone' | 'badge' | 'system';
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  relatedUrl?: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  hasMore: boolean;
}

interface UnreadCountResponse {
  count: number;
}

export function useNotifications(options?: { limit?: number; unreadOnly?: boolean }) {
  return useQuery<NotificationsResponse>({
    queryKey: ['notifications', options],
    queryFn: () => {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.unreadOnly) params.set('unreadOnly', 'true');
      return api.get<NotificationsResponse>(`/api/notifications?${params.toString()}`);
    },
    staleTime: 30 * 1000, // 30 Sekunden
  });
}

export function useUnreadCount() {
  return useQuery<UnreadCountResponse>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<UnreadCountResponse>('/api/notifications/unread-count'),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Alle 60 Sekunden aktualisieren
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      api.patch(`/api/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post('/api/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      api.delete(`/api/notifications/${notificationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

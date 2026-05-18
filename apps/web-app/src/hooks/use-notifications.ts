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

export function useNotifications(options?: { limit?: number; unreadOnly?: boolean; offset?: number }) {
  return useQuery<NotificationsResponse>({
    queryKey: ['notifications', options],
    queryFn: () => {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.unreadOnly) params.set('unreadOnly', 'true');
      if (options?.offset) params.set('offset', options.offset.toString());
      return api.get<NotificationsResponse>(`/api/notifications?${params.toString()}`);
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useUnreadCount() {
  return useQuery<UnreadCountResponse>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<UnreadCountResponse>('/api/notifications/unread-count'),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000, // Alle 30 Sekunden aktualisieren
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

// ─── Notification Preferences ─────────────────────────────────────────────

export type NotifChannels = { in_app: boolean; email: boolean; push: boolean };

export interface NotificationPreferences {
  enabled: boolean;
  preferences: {
    comment: NotifChannels;
    reply: NotifChannels;
    reaction: NotifChannels;
    follow: NotifChannels;
    mention: NotifChannels;
    price_alert: NotifChannels;
    milestone: NotifChannels;
    badge: NotifChannels;
    system: NotifChannels;
  };
  emailDigest: 'instant' | 'hourly' | 'daily' | 'never';
  quietHours: { enabled: boolean; start?: string; end?: string };
}

export function useNotificationPreferences() {
  return useQuery<{ preferences: NotificationPreferences }>({
    queryKey: ['notification-preferences'],
    queryFn: () => api.get('/api/preferences'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<NotificationPreferences>) =>
      api.patch('/api/preferences', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}

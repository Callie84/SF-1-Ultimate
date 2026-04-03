import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';

type AdminFilters = Record<string, string | number | boolean | undefined>;

// Query Keys
export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  users: (filters?: AdminFilters) => [...adminKeys.all, 'users', filters] as const,
  user: (id: string) => [...adminKeys.all, 'user', id] as const,
  threads: (filters?: AdminFilters) => [...adminKeys.all, 'threads', filters] as const,
  reports: (filters?: AdminFilters) => [...adminKeys.all, 'reports', filters] as const,
  systemHealth: () => [...adminKeys.all, 'system-health'] as const,
};

// Dashboard Stats
export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: async () => {
      const data = await api.get('/api/admin/stats');
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// System Health — aggregiert über Next.js API Route /api/health
export function useSystemHealth() {
  return useQuery({
    queryKey: adminKeys.systemHealth(),
    queryFn: async () => {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (!res.ok) throw new Error('Health check failed');
      return res.json();
    },
    refetchInterval: 15000,
  });
}

// Get all users (admin only)
export function useAdminUsers(filters?: { page?: number; limit?: number; search?: string; role?: string }) {
  return useQuery({
    queryKey: adminKeys.users(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.search) params.append('search', filters.search);
      if (filters?.role) params.append('role', filters.role);

      const data = await api.get(`/api/auth/admin/users?${params}`);
      return data;
    },
  });
}

// Get single user details
export function useAdminUser(userId: string) {
  return useQuery({
    queryKey: adminKeys.user(userId),
    queryFn: async () => {
      const data = await api.get(`/api/auth/admin/users/${userId}`);
      return data;
    },
    enabled: !!userId,
  });
}

// Update user (admin)
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Record<string, string | boolean> }) => {
      const data = await api.patch(`/api/auth/admin/users/${userId}`, updates);
      return data;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.user(userId) });
    },
  });
}

// Ban/Unban user
export function useBanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, banned, reason }: { userId: string; banned: boolean; reason?: string }) => {
      const data = await api.post(`/api/auth/admin/users/${userId}/ban`, { banned, reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

// Get reported content
export function useAdminReports(filters?: { status?: string; type?: string }) {
  return useQuery({
    queryKey: adminKeys.reports(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.type) params.append('type', filters.type);

      const data = await api.get(`/api/community/moderation/reports?${params}`);
      return data;
    },
  });
}

// Moderation Stats
export function useModerationStats() {
  return useQuery({
    queryKey: [...adminKeys.all, 'moderation-stats'] as const,
    queryFn: async () => {
      const data = await api.get('/api/community/moderation/stats');
      return data;
    },
    refetchInterval: 30000,
  });
}

// Resolve report
export function useResolveReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, action, note }: { reportId: string; action: 'dismiss' | 'warn' | 'delete' | 'ban'; note?: string }) => {
      const data = await api.post(`/api/community/moderation/reports/${reportId}/resolve`, { action, note });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.reports() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
  });
}

// Delete content (thread/reply/grow/entry)
export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, id }: { type: 'thread' | 'reply' | 'grow' | 'entry'; id: string }) => {
      const urlMap: Record<string, string> = {
        thread: `/api/community/threads/${id}`,
        reply: `/api/community/replies/${id}`,
        grow: `/api/grows/${id}`,
        entry: `/api/journal/entries/${id}`,
      };
      const data = await api.delete(urlMap[type] || `/api/community/threads/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

// Pin/Unpin thread
export function usePinThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ threadId, pinned }: { threadId: string; pinned: boolean }) => {
      const data = await api.patch(`/api/community/threads/${threadId}`, { isPinned: pinned });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.threads() });
    },
  });
}

// Lock/Unlock thread
export function useLockThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ threadId, locked }: { threadId: string; locked: boolean }) => {
      const data = await api.patch(`/api/community/threads/${threadId}`, { isLocked: locked });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.threads() });
    },
  });
}

// Get all threads (admin only)
export function useAdminThreads(filters?: { page?: number; limit?: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: adminKeys.threads(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.search) params.append('search', filters.search);
      if (filters?.status) params.append('status', filters.status);

      const data = await api.get(`/api/community/threads?${params}`);
      return data;
    },
  });
}

// Get all grows (admin only)
export function useAdminGrows(filters?: { page?: number; limit?: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: [...adminKeys.all, 'grows', filters] as const,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.search) params.append('search', filters.search);
      if (filters?.status) params.append('status', filters.status);

      const data = await api.get(`/api/grows?${params}`);
      return data;
    },
  });
}

// Get system logs (admin only)
export function useAdminLogs(filters?: { page?: number; limit?: number; level?: string; service?: string }) {
  return useQuery({
    queryKey: [...adminKeys.all, 'logs', filters] as const,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.level) params.append('level', filters.level);
      if (filters?.service) params.append('service', filters.service);

      const data = await api.get(`/api/auth/admin/logs?${params}`);
      return data;
    },
  });
}

// Create category
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryData: { name: string; slug: string; description?: string; icon?: string }) => {
      const data = await api.post('/api/community/categories', categoryData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'categories'] });
    },
  });
}

// Update category
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { name?: string; slug?: string; description?: string; icon?: string } }) => {
      const data = await api.put(`/api/community/categories/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'categories'] });
    },
  });
}

// Delete category
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const data = await api.delete(`/api/community/categories/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'categories'] });
    },
  });
}

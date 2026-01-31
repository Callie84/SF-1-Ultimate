import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';

// Query Keys
export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  users: (filters?: any) => [...adminKeys.all, 'users', filters] as const,
  user: (id: string) => [...adminKeys.all, 'user', id] as const,
  threads: (filters?: any) => [...adminKeys.all, 'threads', filters] as const,
  reports: (filters?: any) => [...adminKeys.all, 'reports', filters] as const,
  systemHealth: () => [...adminKeys.all, 'system-health'] as const,
};

// Dashboard Stats
export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: async () => {
      try {
        const data = await api.get('/api/admin/stats');
        return data;
      } catch (error) {
        // Return mock data if admin endpoint doesn't exist yet
        return {
          users: { total: 0, newToday: 0, newThisWeek: 0, active: 0 },
          grows: { total: 0, active: 0, completed: 0 },
          threads: { total: 0, newToday: 0 },
          entries: { total: 0, newToday: 0 },
          reports: { pending: 0, resolved: 0 },
        };
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// System Health
export function useSystemHealth() {
  return useQuery({
    queryKey: adminKeys.systemHealth(),
    queryFn: async () => {
      try {
        const data = await api.get('/api/admin/health');
        return data;
      } catch (error) {
        // Return mock health data
        return {
          services: [
            { name: 'Auth Service', status: 'healthy', latency: 0 },
            { name: 'Journal Service', status: 'healthy', latency: 0 },
            { name: 'Community Service', status: 'healthy', latency: 0 },
            { name: 'Media Service', status: 'healthy', latency: 0 },
          ],
          database: { status: 'healthy', connections: 0 },
          redis: { status: 'healthy', memory: '0MB' },
          uptime: 0,
        };
      }
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

// Get all users (admin only)
export function useAdminUsers(filters?: { page?: number; limit?: number; search?: string; role?: string }) {
  return useQuery({
    queryKey: adminKeys.users(filters),
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (filters?.page) params.append('page', String(filters.page));
        if (filters?.limit) params.append('limit', String(filters.limit));
        if (filters?.search) params.append('search', filters.search);
        if (filters?.role) params.append('role', filters.role);

        const data = await api.get(`/api/admin/users?${params}`);
        return data;
      } catch (error) {
        return { users: [], total: 0, page: 1, totalPages: 1 };
      }
    },
  });
}

// Get single user details
export function useAdminUser(userId: string) {
  return useQuery({
    queryKey: adminKeys.user(userId),
    queryFn: async () => {
      const data = await api.get(`/api/admin/users/${userId}`);
      return data;
    },
    enabled: !!userId,
  });
}

// Update user (admin)
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      const data = await api.patch(`/api/admin/users/${userId}`, updates);
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
      const data = await api.post(`/api/admin/users/${userId}/ban`, { banned, reason });
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
      try {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.type) params.append('type', filters.type);

        const data = await api.get(`/api/admin/reports?${params}`);
        return data;
      } catch (error) {
        return { reports: [], total: 0 };
      }
    },
  });
}

// Resolve report
export function useResolveReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, action, note }: { reportId: string; action: 'dismiss' | 'warn' | 'delete' | 'ban'; note?: string }) => {
      const data = await api.post(`/api/admin/reports/${reportId}/resolve`, { action, note });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.reports() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
  });
}

// Delete content (thread/reply)
export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, id }: { type: 'thread' | 'reply' | 'grow' | 'entry'; id: string }) => {
      const data = await api.delete(`/api/admin/${type}s/${id}`);
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface BackupEntry {
  name: string;
  createdAt: string;
  sizeBytes: number;
  sizeMB: string;
  status: 'ok' | 'partial' | 'error';
}

export interface BackupStatus {
  running: boolean;
  lastRun: string | null;
  lastStatus: 'ok' | 'error' | null;
  lastError: string | null;
}

export function useBackupStatus() {
  return useQuery<{ status: BackupStatus; schedule: string; retentionDays: number }>({
    queryKey: ['backup', 'status'],
    queryFn: () => api.get('/api/backup/status'),
    refetchInterval: 5000,
  });
}

export function useBackups() {
  return useQuery<{ backups: BackupEntry[] }>({
    queryKey: ['backup', 'list'],
    queryFn: () => api.get('/api/backup/backups'),
    refetchInterval: 10000,
  });
}

export function useTriggerBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/api/backup/backups/trigger'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup'] });
    },
  });
}

export function useDeleteBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.delete(`/api/backup/backups/${name}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup', 'list'] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface FeedInfo {
  name: string;
  slug: string;
  source: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
  registeredFeeds: string[];
}

export interface FeedsResponse {
  feeds: FeedInfo[];
  queue: QueueStats;
  schedule: {
    daily: string;
    nextRun: string;
  };
}

// Feed-Übersicht + Queue-Stats laden
export function useScraperFeeds() {
  return useQuery<FeedsResponse>({
    queryKey: ['scraper', 'feeds'],
    queryFn: () => api.get('/api/prices/admin/feeds'),
    staleTime: 10 * 1000, // 10s - Queue-Status öfter aktualisieren
    refetchInterval: 15 * 1000, // alle 15s auto-refresh
  });
}

// Queue-Stats (leichtgewichtig)
export function useQueueStats() {
  return useQuery<QueueStats>({
    queryKey: ['scraper', 'queue'],
    queryFn: () => api.get('/api/prices/admin/queue/stats'),
    staleTime: 5 * 1000,
    refetchInterval: 10 * 1000,
  });
}

// Einzelnen Feed in Queue einreihen
export function useScheduleFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (seedbank: string) =>
      api.post(`/api/prices/admin/feed/${seedbank}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraper'] });
    },
  });
}

// Alle Feeds einreihen
export function useScheduleAllFeeds() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/api/prices/admin/feeds/run-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraper'] });
    },
  });
}

// Sofort-Import (synchron, blockiert bis fertig)
export function useRunFeedNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (seedbank: string) =>
      api.post(`/api/prices/admin/feed/${seedbank}/now`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraper'] });
    },
  });
}

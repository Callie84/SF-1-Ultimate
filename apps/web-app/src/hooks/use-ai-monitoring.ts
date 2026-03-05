// /apps/web-app/src/hooks/use-ai-monitoring.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface DayStats {
  date: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  byEndpoint: {
    chat: number;
    diagnose: number;
    advice: number;
  };
  byModel: {
    'gpt-4o': { inputTokens: number; outputTokens: number };
    'gpt-4o-mini': { inputTokens: number; outputTokens: number };
  };
}

export interface MonthStats {
  month: string;
  requests: number;
  costUsd: number;
}

export interface AIMonitoringData {
  today: DayStats;
  last7Days: DayStats[];
  last30Summary: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
  };
  currentMonth: MonthStats;
  lastMonth: MonthStats;
}

export function useAiMonitoring() {
  return useQuery<AIMonitoringData>({
    queryKey: ['ai-monitoring'],
    queryFn: async () => {
      const data = await apiClient.get('/api/ai/admin/stats');
      return data;
    },
    refetchInterval: 60000, // jede Minute
    staleTime: 30000,
  });
}

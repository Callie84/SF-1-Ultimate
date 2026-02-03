// /apps/web-app/src/hooks/use-analytics.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

// ============================================
// Types
// ============================================

export interface AuthAnalytics {
  users: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    active: number;
    verified: number;
    banned: number;
  };
  roleDistribution: Array<{ role: string; count: number }>;
  registrationTrend: Array<{ date: string; count: number }>;
}

export interface CommunityAnalytics {
  threads: {
    total: number;
    today: number;
    thisWeek: number;
    totalViews: number;
    avgViews: number;
    avgReplies: number;
    avgUpvotes: number;
  };
  replies: {
    total: number;
    today: number;
    bestAnswers: number;
  };
  topThreads: Array<{
    _id: string;
    title: string;
    viewCount: number;
    replyCount: number;
    upvoteCount: number;
    engagementScore: number;
    createdAt: string;
    categoryId?: string;
  }>;
  trends: Array<{
    _id: string;
    threads: number;
    views: number;
    replies: number;
  }>;
  categories: Array<{
    _id: string;
    name: string;
    slug: string;
    threadCount: number;
    postCount: number;
  }>;
}

export interface JournalAnalytics {
  grows: {
    total: number;
    active: number;
    completed: number;
    thisWeek: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    avgYield: number;
    avgEfficiency: number;
  };
  entries: {
    total: number;
    today: number;
    withPhotos: number;
  };
  topGrows: Array<{
    _id: string;
    strainName: string;
    environment: string;
    status: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    yieldDry?: number;
    efficiency?: number;
    popularityScore: number;
    createdAt: string;
  }>;
  trends: Array<{
    _id: string;
    grows: number;
    views: number;
    likes: number;
  }>;
  byEnvironment: Record<string, number>;
}

export interface GamificationAnalytics {
  users: {
    total: number;
    active24h: number;
    active7d: number;
    active30d: number;
    avgLevel: number;
    avgXP: number;
    avgReputation: number;
    avgStreak: number;
    totalXP: number;
  };
  levelDistribution: Array<{
    level: string;
    count: number;
  }>;
  topContributors: Array<{
    userId: string;
    level: number;
    xp: number;
    reputation: number;
    totalPosts: number;
    totalReplies: number;
    helpfulAnswers: number;
    currentStreak: number;
  }>;
  activityTrends: Array<{
    _id: string;
    events: number;
    xpAwarded: number;
  }>;
  eventsByType: Array<{
    _id: string;
    count: number;
    totalXP: number;
  }>;
}

export interface SearchAnalytics {
  popularSearches: Array<{
    query: string;
    count: number;
  }>;
  totalSearches: number;
}

export interface CombinedAnalytics {
  auth?: AuthAnalytics;
  community?: CommunityAnalytics;
  journal?: JournalAnalytics;
  gamification?: GamificationAnalytics;
  search?: SearchAnalytics;
}

// ============================================
// Hooks
// ============================================

export function useAuthAnalytics() {
  return useQuery<AuthAnalytics>({
    queryKey: ['analytics', 'auth'],
    queryFn: () => api.get<AuthAnalytics>('/api/auth/analytics'),
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}

export function useCommunityAnalytics() {
  return useQuery<CommunityAnalytics>({
    queryKey: ['analytics', 'community'],
    queryFn: () => api.get<CommunityAnalytics>('/api/community/analytics'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useJournalAnalytics() {
  return useQuery<JournalAnalytics>({
    queryKey: ['analytics', 'journal'],
    queryFn: () => api.get<JournalAnalytics>('/api/journal/analytics'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useGamificationAnalytics() {
  return useQuery<GamificationAnalytics>({
    queryKey: ['analytics', 'gamification'],
    queryFn: () => api.get<GamificationAnalytics>('/api/gamification/analytics'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSearchAnalytics() {
  return useQuery<SearchAnalytics>({
    queryKey: ['analytics', 'search'],
    queryFn: () => api.get<SearchAnalytics>('/api/search/analytics'),
    staleTime: 5 * 60 * 1000,
  });
}

// Combined Hook für das Dashboard
export function useAnalyticsDashboard() {
  const auth = useAuthAnalytics();
  const community = useCommunityAnalytics();
  const journal = useJournalAnalytics();
  const gamification = useGamificationAnalytics();
  const search = useSearchAnalytics();

  return {
    data: {
      auth: auth.data,
      community: community.data,
      journal: journal.data,
      gamification: gamification.data,
      search: search.data,
    } as CombinedAnalytics,
    isLoading: auth.isLoading || community.isLoading || journal.isLoading ||
               gamification.isLoading || search.isLoading,
    isError: auth.isError || community.isError || journal.isError ||
             gamification.isError || search.isError,
    errors: {
      auth: auth.error,
      community: community.error,
      journal: journal.error,
      gamification: gamification.error,
      search: search.error,
    },
    refetch: () => {
      auth.refetch();
      community.refetch();
      journal.refetch();
      gamification.refetch();
      search.refetch();
    },
  };
}

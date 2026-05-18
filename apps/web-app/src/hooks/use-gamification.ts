import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface GamificationProfile {
  userId: string;
  xp: number;
  level: number;
  xpToNextLevel: number;
  reputation: number;
  badges: string[];
  achievements: string[];
  totalGrows: number;
  totalHarvests: number;
  totalYield: number;
  totalPosts: number;
  totalReplies: number;
  helpfulAnswers: number;
  currentStreak: number;
  longestStreak: number;
  globalRank?: number;
}

interface AchievementItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  badgeId?: string;
  unlocked: boolean;
  unlockedAt?: string;
}

interface GamificationResponse {
  profile: GamificationProfile;
  achievements: {
    unlocked: AchievementItem[];
    locked: AchievementItem[];
    total: number;
    unlockedCount: number;
  };
}

export function useGamificationProfile(userId: string | undefined) {
  return useQuery<GamificationResponse>({
    queryKey: ['gamification', 'profile', userId],
    queryFn: () => api.get<GamificationResponse>(`/api/gamification/profile/${userId}`),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

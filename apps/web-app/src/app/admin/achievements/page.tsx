'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  ArrowLeft,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Users,
  Star,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirement: { type: string; value: number };
  unlockedCount: number;
  isActive: boolean;
  createdAt: string;
}

const RARITY_COLORS: Record<string, string> = {
  legendary: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950',
  epic: 'border-purple-500 bg-purple-50 dark:bg-purple-950',
  rare: 'border-blue-500 bg-blue-50 dark:bg-blue-950',
  common: 'border-border',
};

const RARITY_BADGE: Record<string, string> = {
  legendary: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  epic: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  rare: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  common: '',
};

const CATEGORY_LABELS: Record<string, string> = {
  grow: 'Grow',
  social: 'Social',
  community: 'Community',
  milestone: 'Meilenstein',
  special: 'Special',
};

export default function AchievementsAdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-achievements'],
    queryFn: () =>
      api.get<{ achievements: Achievement[]; totalUsers: number }>(
        '/api/gamification/admin/achievements'
      ),
    enabled: !!user && user.role === 'ADMIN',
    staleTime: 60 * 1000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['admin-gamification-stats'],
    queryFn: () =>
      api.get<{
        totalProfiles: number;
        totalAchievements: number;
        activeAchievements: number;
        totalBadges: number;
        xpStats: { totalXP: number; avgXP: number; maxXP: number };
      }>('/api/gamification/admin/stats'),
    enabled: !!user && user.role === 'ADMIN',
    staleTime: 60 * 1000,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch<{ id: string; isActive: boolean }>(
        `/api/gamification/admin/achievements/${id}/toggle`,
        {}
      ),
    onSuccess: (result) => {
      toast.success(result.isActive ? 'Achievement aktiviert' : 'Achievement deaktiviert');
      queryClient.invalidateQueries({ queryKey: ['admin-achievements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-gamification-stats'] });
    },
    onError: () => toast.error('Fehler beim Umschalten'),
  });

  const achievements = data?.achievements || [];
  const totalUsers = data?.totalUsers || 0;
  const stats = statsData;

  // Group by category
  const byCategory = achievements.reduce<Record<string, Achievement[]>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});

  if (authLoading || (!user && !authLoading)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Achievements & Gamification
            </h1>
            <p className="text-muted-foreground">
              Übersicht aller Achievements und Gamification-Statistiken
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">{stats.totalProfiles}</div>
                    <div className="text-xs text-muted-foreground">Gamification-Profile</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.activeAchievements} / {stats.totalAchievements}</div>
                    <div className="text-xs text-muted-foreground">Achievements (aktiv)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.totalBadges}</div>
                    <div className="text-xs text-muted-foreground">Badges</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {stats.xpStats.totalXP.toLocaleString('de-DE')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Gesamt-XP · Ø {Math.round(stats.xpStats.avgXP).toLocaleString('de-DE')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Achievements by Category */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : achievements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Keine Achievements in der Datenbank</p>
              <p className="text-sm text-muted-foreground mt-1">
                Achievements werden automatisch beim ersten Grow/Event erstellt
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(byCategory).map(([category, items]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{CATEGORY_LABELS[category] || category} ({items.length})</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {items.filter((a) => a.isActive).length} aktiv
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {items.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                        RARITY_COLORS[achievement.rarity],
                        !achievement.isActive && 'opacity-50'
                      )}
                    >
                      {/* Icon + Name */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl flex-shrink-0" title={achievement.id}>
                          {achievement.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{achievement.name}</span>
                            <Badge className={RARITY_BADGE[achievement.rarity]} variant="secondary">
                              {achievement.rarity}
                            </Badge>
                            {!achievement.isActive && (
                              <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                                Deaktiviert
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {achievement.description}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span>{achievement.requirement.type}: {achievement.requirement.value}</span>
                            <span>·</span>
                            <span>{achievement.xpReward} XP</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="text-right flex-shrink-0 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">
                          {achievement.unlockedCount.toLocaleString('de-DE')}
                        </div>
                        <div>
                          {totalUsers > 0
                            ? `${Math.round((achievement.unlockedCount / totalUsers) * 100)}%`
                            : '—'}
                        </div>
                        <div>freigeschaltet</div>
                      </div>

                      {/* Toggle */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleMutation.mutate(achievement.id)}
                        disabled={toggleMutation.isPending}
                        title={achievement.isActive ? 'Deaktivieren' : 'Aktivieren'}
                        className="flex-shrink-0"
                      >
                        {achievement.isActive ? (
                          <ToggleRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}

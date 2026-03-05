'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, TrendingUp, Loader2, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/auth-provider';

interface LeaderboardUser {
  userId: string;
  username?: string;
  displayName?: string;
  xp: number;
  level: number;
  reputation: number;
  globalRank?: number;
  badgeCount?: number;
  achievementCount?: number;
}

type Metric = 'xp' | 'reputation' | 'level';

const METRIC_CONFIG: Record<Metric, { label: string; icon: React.ReactNode; valueKey: keyof LeaderboardUser }> = {
  xp: { label: 'XP', icon: <TrendingUp className="h-4 w-4" />, valueKey: 'xp' },
  reputation: { label: 'Reputation', icon: <Star className="h-4 w-4" />, valueKey: 'reputation' },
  level: { label: 'Level', icon: <Trophy className="h-4 w-4" />, valueKey: 'level' },
};

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />;
  return <span className="text-sm text-muted-foreground font-medium w-5 text-center">{rank}</span>;
}

export default function LeaderboardPage() {
  const [metric, setMetric] = useState<Metric>('xp');
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', metric],
    queryFn: () =>
      api.get<{ metric: string; users: LeaderboardUser[]; count: number }>(
        `/api/gamification/profile/leaderboard?metric=${metric}&limit=50`
      ),
    staleTime: 5 * 60 * 1000,
  });

  const users = data?.users || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
            Bestenliste
          </h1>
          <p className="text-muted-foreground">Die aktivsten Mitglieder der Community</p>
        </div>

        {/* Metric Switcher */}
        <div className="flex gap-2">
          {(Object.entries(METRIC_CONFIG) as [Metric, (typeof METRIC_CONFIG)[Metric]][]).map(
            ([m, cfg]) => (
              <Button
                key={m}
                variant={metric === m ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMetric(m)}
              >
                {cfg.icon}
                <span className="ml-1.5">{cfg.label}</span>
              </Button>
            )
          )}
        </div>

        {/* Top 3 Podium */}
        {!isLoading && users.length >= 3 && (
          <div className="grid grid-cols-3 gap-3">
            {/* 2nd */}
            <div className="flex flex-col items-center gap-2 pt-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xl font-bold border-2 border-slate-400">
                {(users[1].displayName || users[1].username || '?').charAt(0).toUpperCase()}
              </div>
              <Medal className="h-5 w-5 text-slate-400" />
              <div className="text-center">
                <p className="font-semibold text-sm truncate max-w-[80px]">
                  {users[1].displayName || users[1].username || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {((users[1][METRIC_CONFIG[metric].valueKey] as number) || 0).toLocaleString('de-DE')}
                </p>
              </div>
            </div>
            {/* 1st */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 text-2xl font-bold border-4 border-yellow-500 shadow-lg">
                {(users[0].displayName || users[0].username || '?').charAt(0).toUpperCase()}
              </div>
              <Medal className="h-6 w-6 text-yellow-500" />
              <div className="text-center">
                <p className="font-bold truncate max-w-[90px]">
                  {users[0].displayName || users[0].username || 'User'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {((users[0][METRIC_CONFIG[metric].valueKey] as number) || 0).toLocaleString('de-DE')}
                </p>
              </div>
            </div>
            {/* 3rd */}
            <div className="flex flex-col items-center gap-2 pt-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 text-lg font-bold border-2 border-amber-700">
                {(users[2].displayName || users[2].username || '?').charAt(0).toUpperCase()}
              </div>
              <Medal className="h-5 w-5 text-amber-700" />
              <div className="text-center">
                <p className="font-semibold text-sm truncate max-w-[80px]">
                  {users[2].displayName || users[2].username || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {((users[2][METRIC_CONFIG[metric].valueKey] as number) || 0).toLocaleString('de-DE')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Full List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Top {Math.min(users.length, 50)} — {METRIC_CONFIG[metric].label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Noch keine Einträge vorhanden
              </p>
            ) : (
              <div className="space-y-2">
                {users.map((u, idx) => {
                  const rank = idx + 1;
                  const isCurrentUser = user?.id === u.userId;
                  const value = (u[METRIC_CONFIG[metric].valueKey] as number) || 0;

                  return (
                    <Link
                      key={u.userId}
                      href={u.username ? `/profile/${u.username}` : '#'}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-accent',
                        isCurrentUser && 'border-primary bg-primary/5'
                      )}
                    >
                      <div className="flex w-6 items-center justify-center flex-shrink-0">
                        <RankMedal rank={rank} />
                      </div>

                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
                        {(u.displayName || u.username || '?').charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {u.displayName || u.username || 'User'}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-xs">Du</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Lvl {u.level}</span>
                          {u.badgeCount !== undefined && u.badgeCount > 0 && (
                            <span>{u.badgeCount} Badges</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-primary">
                          {value.toLocaleString('de-DE')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {METRIC_CONFIG[metric].label}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// /apps/web-app/src/app/admin/analytics/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useAnalyticsDashboard } from '@/hooks/use-analytics';
import {
  StatCard,
  StatGrid,
  TrafficChart,
  TopContentTable,
  PopularSearches,
  UserDistribution,
} from '@/components/analytics';
import {
  Users,
  MessageSquare,
  Eye,
  Sprout,
  Search,
  TrendingUp,
  Award,
  Activity,
} from 'lucide-react';

export default function AnalyticsDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data, isLoading, isError, refetch } = useAnalyticsDashboard();

  // Admin-Check
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  if (authLoading || (!user || user.role !== 'ADMIN')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="ml-3 text-muted-foreground">Lade Daten...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <p className="text-destructive">Fehler beim Laden der Analytics-Daten.</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  const { auth, community, journal, gamification, search } = data;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Activity className="w-4 h-4" />
          Aktualisieren
        </button>
      </div>

      {/* Hauptstatistiken */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Übersicht</h2>
        <StatGrid>
          <StatCard
            title="Benutzer gesamt"
            value={auth?.users.total || 0}
            subtitle={`${auth?.users.active || 0} aktiv`}
            icon={<Users className="w-5 h-5" />}
          />
          <StatCard
            title="Neue heute"
            value={auth?.users.today || 0}
            subtitle={`${auth?.users.thisWeek || 0} diese Woche`}
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <StatCard
            title="Threads"
            value={community?.threads.total || 0}
            subtitle={`${community?.threads.today || 0} heute`}
            icon={<MessageSquare className="w-5 h-5" />}
          />
          <StatCard
            title="Grows"
            value={journal?.grows.total || 0}
            subtitle={`${journal?.grows.active || 0} aktiv`}
            icon={<Sprout className="w-5 h-5" />}
          />
        </StatGrid>
      </section>

      {/* Engagement */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Engagement</h2>
        <StatGrid>
          <StatCard
            title="Aktive 24h"
            value={gamification?.users.active24h || 0}
            icon={<Activity className="w-5 h-5" />}
          />
          <StatCard
            title="Aktive 7d"
            value={gamification?.users.active7d || 0}
            icon={<Activity className="w-5 h-5" />}
          />
          <StatCard
            title="Durchschn. Level"
            value={gamification?.users.avgLevel?.toFixed(1) || '0'}
            icon={<Award className="w-5 h-5" />}
          />
          <StatCard
            title="Views gesamt"
            value={community?.threads.totalViews || 0}
            icon={<Eye className="w-5 h-5" />}
          />
        </StatGrid>
      </section>

      {/* Trends Chart */}
      {community?.trends && community.trends.length > 0 && (
        <section className="mb-8">
          <TrafficChart
            title="Community-Trends (30 Tage)"
            data={community.trends.map(t => ({ date: t._id, threads: t.threads, views: t.views, replies: t.replies }))}
            lines={[
              { dataKey: 'threads', name: 'Threads', color: '#22c55e' },
              { dataKey: 'views', name: 'Views', color: '#3b82f6' },
              { dataKey: 'replies', name: 'Replies', color: '#f97316' },
            ]}
          />
        </section>
      )}

      {/* Top Content und Suchen */}
      <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopContentTable
          title="Top Threads"
          type="threads"
          threads={community?.topThreads}
        />
        <TopContentTable
          title="Top Grows"
          type="grows"
          grows={journal?.topGrows}
        />
      </section>

      {/* Beliebte Suchen und Verteilung */}
      <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PopularSearches
          searches={search?.popularSearches || []}
          totalSearches={search?.totalSearches}
        />
        <UserDistribution
          title="Level-Verteilung"
          type="level"
          levelDistribution={gamification?.levelDistribution}
        />
      </section>

      {/* Rollen-Verteilung */}
      {auth?.roleDistribution && (
        <section className="mb-8">
          <UserDistribution
            title="Rollen-Verteilung"
            type="role"
            roleDistribution={auth.roleDistribution}
          />
        </section>
      )}

      {/* Gamification Activity Trends */}
      {gamification?.activityTrends && gamification.activityTrends.length > 0 && (
        <section className="mb-8">
          <TrafficChart
            title="Aktivitäts-Trends (30 Tage)"
            data={gamification.activityTrends.map(item => ({
              date: item._id,
              events: item.events,
              xp: item.xpAwarded,
            }))}
            lines={[
              { dataKey: 'events', name: 'Events', color: '#8b5cf6' },
              { dataKey: 'xp', name: 'XP vergeben', color: '#22c55e' },
            ]}
          />
        </section>
      )}
    </div>
  );
}

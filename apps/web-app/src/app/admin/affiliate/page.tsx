'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Loader2,
  MousePointerClick,
  TrendingUp,
  Sprout,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface AffiliateStats {
  period: string;
  total: number;
  clicksPerDay: { date: string; count: number }[];
  topSeedbanks: { seedbank: string; count: number }[];
  topStrains: { slug: string; name: string; count: number }[];
}

type Period = '7d' | '30d' | '90d';

function useAffiliateStats(period: Period) {
  return useQuery<AffiliateStats>({
    queryKey: ['admin', 'affiliate-stats', period],
    queryFn: () => apiClient.get(`/api/prices/affiliate/stats?period=${period}`),
    refetchInterval: 60000,
  });
}

export default function AdminAffiliatePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [period, setPeriod] = useState<Period>('30d');
  const { data, isLoading } = useAffiliateStats(period);

  useEffect(() => {
    if (!authLoading && user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <Card className="flex flex-col items-center justify-center py-16">
          <Shield className="mb-4 h-16 w-16 text-destructive" />
          <h3 className="mb-2 text-xl font-semibold">Zugriff verweigert</h3>
          <Button asChild>
            <Link href="/dashboard">Zurück zum Dashboard</Link>
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  const maxDayCount = data ? Math.max(...data.clicksPerDay.map((d) => d.count), 1) : 1;
  const totalBankClicks = data?.topSeedbanks.reduce((s, b) => s + b.count, 0) || 1;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Affiliate-Dashboard</h1>
            <p className="text-muted-foreground">
              Klick-Tracking für Seedbank-Weiterleitungen (MongoDB-persistent)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border overflow-hidden text-sm">
              {(['7d', '30d', '90d'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 transition-colors ${
                    period === p
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin">← Admin</Link>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamt-Klicks</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : (data?.total ?? 0).toLocaleString('de-DE')}
              </div>
              <p className="text-xs text-muted-foreground">Im Zeitraum ({period})</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktive Seedbanks</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : data?.topSeedbanks.length ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Mit Klicks (Top 5)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktive Strains</CardTitle>
              <Sprout className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : data?.topStrains.length ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Mit Klicks (Top 5)</p>
            </CardContent>
          </Card>
        </div>

        {/* Klicks pro Tag — Bar Chart (CSS) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Klicks pro Tag
            </CardTitle>
            <CardDescription>Zeitreihe der letzten {period}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex items-end gap-0.5 h-32 overflow-x-auto pb-2">
                {data?.clicksPerDay.map((d) => {
                  const heightPct = Math.max((d.count / maxDayCount) * 100, d.count > 0 ? 4 : 1);
                  const label = d.date.slice(5); // MM-DD
                  return (
                    <div
                      key={d.date}
                      className="flex flex-col items-center gap-1 flex-1 min-w-[6px] group relative"
                    >
                      <div
                        className="w-full bg-primary/70 hover:bg-primary rounded-sm transition-colors cursor-default"
                        style={{ height: `${heightPct}%` }}
                        title={`${d.date}: ${d.count} Klicks`}
                      />
                      {/* Tooltip on hover */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border text-xs px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                        {d.count}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!isLoading && data && data.total === 0 && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                Noch keine Klicks über den neuen Redirect-Endpoint erfasst.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Seedbanks */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Seedbanks</CardTitle>
              <CardDescription>Klicks im Zeitraum {period}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !data?.topSeedbanks.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Keine Daten für diesen Zeitraum
                </p>
              ) : (
                <div className="space-y-3">
                  {data.topSeedbanks.map((s) => {
                    const pct = Math.round((s.count / totalBankClicks) * 100);
                    return (
                      <div key={s.seedbank} className="flex items-center gap-3">
                        <div className="w-28 shrink-0 text-sm font-medium truncate capitalize">
                          {s.seedbank.replace(/-/g, ' ')}
                        </div>
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="w-20 text-right text-xs text-muted-foreground shrink-0">
                          {s.count.toLocaleString('de-DE')} ({pct}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Strains */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Strains</CardTitle>
              <CardDescription>Klicks im Zeitraum {period}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !data?.topStrains.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Keine Daten für diesen Zeitraum
                </p>
              ) : (
                <div className="space-y-2">
                  {data.topStrains.map((s, i) => (
                    <div key={s.slug || i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground text-sm w-5 shrink-0">{i + 1}.</span>
                        <Link
                          href={`/strains/${s.slug}`}
                          className="text-sm font-medium hover:underline truncate"
                        >
                          {s.name || s.slug}
                        </Link>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {s.count.toLocaleString('de-DE')} Klicks
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <ExternalLink className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground mb-1">Redirect-Endpoint</p>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  GET /api/prices/affiliate/redirect?to=URL&amp;seedbank=NAME&amp;strain=ID&amp;strainName=NAME
                </code>
                <p className="mt-1.5">
                  Affiliate-Links auf Strain-Detailseiten und Preislisten nutzen diesen Endpoint.
                  Jeder Klick wird in MongoDB mit Seedbank, Strain, IP und User-Agent gespeichert.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

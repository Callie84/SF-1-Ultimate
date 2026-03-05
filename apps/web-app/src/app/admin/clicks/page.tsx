'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Loader2, MousePointerClick, TrendingUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ClickStats {
  clicks: Record<string, number>;
  total: number;
}

function useClickStats() {
  return useQuery<ClickStats>({
    queryKey: ['admin', 'click-stats'],
    queryFn: () => apiClient.get('/api/prices/clicks/stats'),
    refetchInterval: 30000,
  });
}

export default function AdminClicksPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data, isLoading } = useClickStats();

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
          <Button asChild><Link href="/dashboard">Zurück zum Dashboard</Link></Button>
        </Card>
      </DashboardLayout>
    );
  }

  // Parse click entries into structured rows
  const rows = data
    ? Object.entries(data.clicks).map(([key, count]) => {
        const parts = key.split(':');
        const seed = parts[0] || '—';
        const bank = parts[1] || '—';
        return { key, seed, bank, count };
      }).sort((a, b) => b.count - a.count)
    : [];

  const totalClicks = rows.reduce((sum, r) => sum + r.count, 0);

  // Aggregate by seedbank
  const byBank: Record<string, number> = {};
  for (const row of rows) {
    byBank[row.bank] = (byBank[row.bank] || 0) + row.count;
  }
  const topBanks = Object.entries(byBank).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Affiliate-Klicks</h1>
            <p className="text-muted-foreground">
              Click-Tracking der Seedbank-Weiterleitungen (gesamt, kumulativ)
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/admin">← Admin</Link>
          </Button>
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
                {isLoading ? '...' : totalClicks.toLocaleString('de-DE')}
              </div>
              <p className="text-xs text-muted-foreground">Alle Zeit</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Einzigartige Produkte</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : rows.length}
              </div>
              <p className="text-xs text-muted-foreground">Seed × Seedbank Kombinationen</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktive Seedbanks</CardTitle>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : Object.keys(byBank).length}
              </div>
              <p className="text-xs text-muted-foreground">Mit mindestens 1 Klick</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Seedbanks */}
        {topBanks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Seedbanks</CardTitle>
              <CardDescription>Klicks nach Seedbank aggregiert</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topBanks.map(([bank, count]) => {
                  const pct = totalClicks > 0 ? Math.round((count / totalClicks) * 100) : 0;
                  return (
                    <div key={bank} className="flex items-center gap-3">
                      <div className="w-32 shrink-0 font-medium text-sm truncate capitalize">
                        {bank.replace(/-/g, ' ')}
                      </div>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-20 text-right text-sm text-muted-foreground shrink-0">
                        {count.toLocaleString('de-DE')} ({pct}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full Table */}
        <Card>
          <CardHeader>
            <CardTitle>Alle Klicks (Top 50)</CardTitle>
            <CardDescription>Sortiert nach Gesamtklicks</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <MousePointerClick className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Noch keine Klick-Daten vorhanden.</p>
                <p className="text-sm mt-1">Klicks werden erfasst, wenn User auf Seedbank-Links klicken.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4">#</th>
                      <th className="text-left py-2 pr-4">Seed</th>
                      <th className="text-left py-2 pr-4">Seedbank</th>
                      <th className="text-right py-2">Klicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.key} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-4 font-medium max-w-[200px] truncate">{row.seed}</td>
                        <td className="py-2 pr-4">
                          <Badge variant="secondary" className="capitalize">
                            {row.bank.replace(/-/g, ' ')}
                          </Badge>
                        </td>
                        <td className="py-2 text-right font-bold text-primary">
                          {row.count.toLocaleString('de-DE')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

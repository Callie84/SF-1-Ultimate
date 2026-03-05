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
  Store,
  Package,
  TrendingDown,
  Clock,
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

interface Seedbank {
  slug: string;
  name: string;
  priceCount: number;
  seedCount: number;
  avgPrice: number;
  minPrice: number;
  inStockCount: number;
  lastImport: string | null;
  hasFeed: boolean;
  isActive: boolean;
}

const FEED_META: Record<string, { tier: number; commission: string; website: string }> = {
  'fastbuds':          { tier: 1, commission: 'bis 50%',  website: 'fastbuds.com' },
  'zamnesia':          { tier: 1, commission: 'bis 33%',  website: 'zamnesia.com' },
  'weed-seed-shop':    { tier: 1, commission: '30% flat', website: 'weedseedshop.com' },
  'sensi-seeds':       { tier: 2, commission: '20–30%',   website: 'sensiseeds.com' },
  'dutch-passion':     { tier: 2, commission: '20–30%',   website: 'dutch-passion.com' },
  'seedsman':          { tier: 3, commission: '15–20%',   website: 'seedsman.com' },
  'royal-queen-seeds': { tier: 3, commission: '15–20%',   website: 'royalqueenseeds.de' },
  'greenhouse-seeds':  { tier: 4, commission: '–',        website: 'greenhouse-seeds.com' },
  'paradise-seeds':    { tier: 4, commission: '–',        website: 'paradise-seeds.com' },
  'anesia-seeds':      { tier: 4, commission: '–',        website: 'anesia-seeds.com' },
  'mr-hanf':           { tier: 4, commission: '–',        website: 'mr-hanf.com' },
};

const TIER_COLORS: Record<number, string> = {
  1: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  2: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  3: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  4: 'bg-muted text-muted-foreground',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SeedbankAdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-seedbanks'],
    queryFn: () => api.get<{ seedbanks: Seedbank[] }>('/api/prices/admin/seedbanks'),
    staleTime: 2 * 60 * 1000,
    enabled: !!user && user.role === 'ADMIN',
  });

  const toggleMutation = useMutation({
    mutationFn: (slug: string) =>
      api.patch<{ slug: string; isActive: boolean; message: string }>(
        `/api/prices/admin/seedbanks/${slug}/toggle`,
        {}
      ),
    onSuccess: (result) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: ['admin-seedbanks'] });
    },
    onError: () => toast.error('Fehler beim Umschalten'),
  });

  const seedbanks = data?.seedbanks || [];
  const totalSeeds = seedbanks.reduce((sum, s) => sum + s.seedCount, 0);
  const totalPrices = seedbanks.reduce((sum, s) => sum + s.priceCount, 0);
  const activeFeeds = seedbanks.filter((s) => s.hasFeed && s.priceCount > 0).length;
  const activeSeedbanks = seedbanks.filter((s) => s.isActive !== false).length;

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Store className="h-8 w-8" />
                Seedbank-Verwaltung
              </h1>
              <p className="text-muted-foreground">
                Übersicht aller Affiliate-Seedbanks und ihrer Datenbankstatistiken
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{seedbanks.length}</div>
              <div className="text-sm text-muted-foreground">Seedbanks gesamt</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{activeSeedbanks}</div>
              <div className="text-sm text-muted-foreground">Aktiv / {activeFeeds} mit Daten</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalSeeds.toLocaleString('de-DE')}</div>
              <div className="text-sm text-muted-foreground">Seeds in DB</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalPrices.toLocaleString('de-DE')}</div>
              <div className="text-sm text-muted-foreground">Preiseinträge</div>
            </CardContent>
          </Card>
        </div>

        {/* Seedbank Table */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Seedbanks ({seedbanks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {seedbanks.map((bank) => {
                  const meta = FEED_META[bank.slug];
                  const tier = meta?.tier ?? 4;
                  const hasData = bank.priceCount > 0;
                  const isActive = bank.isActive !== false; // default true

                  return (
                    <div
                      key={bank.slug}
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border transition-colors ${
                        isActive ? 'hover:bg-accent/50' : 'opacity-60 bg-muted/30'
                      }`}
                    >
                      {/* Left: Name + Meta */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                          <Store className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{bank.name || bank.slug}</span>
                            {!isActive && (
                              <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
                                Deaktiviert
                              </Badge>
                            )}
                            {meta && (
                              <Badge className={TIER_COLORS[tier]} variant="secondary">
                                Tier {tier}
                              </Badge>
                            )}
                            {meta && meta.commission !== '–' && (
                              <Badge variant="outline" className="text-xs">
                                {meta.commission} Provision
                              </Badge>
                            )}
                          </div>
                          {meta && (
                            <p className="text-xs text-muted-foreground mt-0.5">{meta.website}</p>
                          )}
                        </div>
                      </div>

                      {/* Middle: Stats */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>{bank.seedCount.toLocaleString('de-DE')} Seeds</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TrendingDown className="h-4 w-4 text-muted-foreground" />
                          <span>
                            ab {bank.minPrice > 0 ? `${bank.minPrice.toFixed(2)} €` : '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground text-xs">
                            {bank.lastImport ? formatDate(bank.lastImport) : 'Nie importiert'}
                          </span>
                        </div>
                      </div>

                      {/* Right: Status + Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {hasData ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs">{bank.priceCount.toLocaleString('de-DE')} Preise</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <XCircle className="h-4 w-4" />
                            <span className="text-xs">Keine Daten</span>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleMutation.mutate(bank.slug)}
                          disabled={toggleMutation.isPending}
                          title={isActive ? 'Deaktivieren' : 'Aktivieren'}
                          className={isActive ? 'text-green-600 border-green-300 hover:bg-green-50' : 'text-red-600 border-red-300 hover:bg-red-50'}
                        >
                          {isActive ? (
                            <ToggleRight className="h-4 w-4" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/scraper`}>
                            Import
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Link to Scraper */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-3">
              Feed-Importe und Queue-Verwaltung findest du im Feed-Importer Dashboard.
            </p>
            <Button asChild>
              <Link href="/admin/scraper">Feed-Importer öffnen</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

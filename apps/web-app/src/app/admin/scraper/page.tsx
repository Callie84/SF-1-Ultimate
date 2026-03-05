'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Play,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Database,
  Activity,
  Calendar,
  ChevronRight,
  Shield,
  SkipForward,
  ListOrdered,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import {
  useScraperFeeds,
  useScheduleFeed,
  useScheduleAllFeeds,
  useRunFeedNow,
  FeedInfo,
} from '@/hooks/use-scraper';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Tier-Info pro Feed
const FEED_META: Record<string, { tier: number; commission: string; website: string; color: string }> = {
  'fastbuds':          { tier: 1, commission: 'bis 50%',   website: 'fastbuds.com',         color: 'text-green-500' },
  'zamnesia':          { tier: 1, commission: 'bis 33%',   website: 'zamnesia.com',          color: 'text-green-500' },
  'weed-seed-shop':    { tier: 1, commission: '30% flat',  website: 'weedseedshop.com',      color: 'text-green-500' },
  'sensi-seeds':       { tier: 2, commission: '20–30%',    website: 'sensiseeds.com',        color: 'text-blue-500' },
  'dutch-passion':     { tier: 2, commission: '20–30%',    website: 'dutch-passion.com',     color: 'text-blue-500' },
  'seedsman':          { tier: 3, commission: '15–20%',    website: 'seedsman.com',          color: 'text-yellow-500' },
  'royal-queen-seeds': { tier: 3, commission: '15–20%',    website: 'royalqueenseeds.de',    color: 'text-yellow-500' },
  'greenhouse-seeds':  { tier: 4, commission: '–',         website: 'greenhouse-seeds.com',  color: 'text-muted-foreground' },
  'paradise-seeds':    { tier: 4, commission: '–',         website: 'paradise-seeds.com',    color: 'text-muted-foreground' },
  'anesia-seeds':      { tier: 4, commission: '–',         website: 'anesia-seeds.com',      color: 'text-muted-foreground' },
  'mr-hanf':           { tier: 4, commission: '–',         website: 'mr-hanf.com',           color: 'text-muted-foreground' },
};

const TIER_LABELS: Record<number, string> = {
  1: 'Tier 1 – Top Provision',
  2: 'Tier 2 – Gut',
  3: 'Tier 3 – Solide',
  4: 'Tier 4 – Weitere',
};

const SOURCE_LABELS: Record<string, string> = {
  html: 'HTML/Cheerio',
  api: 'API/JSON',
  csv: 'CSV Feed',
  playwright: 'Browser/Playwright',
};

function formatRelativeTime(isoString: string): string {
  const diff = new Date(isoString).getTime() - Date.now();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

function FeedCard({
  feed,
  onQueue,
  onRunNow,
  isQueuing,
  isRunning,
}: {
  feed: FeedInfo;
  onQueue: () => void;
  onRunNow: () => void;
  isQueuing: boolean;
  isRunning: boolean;
}) {
  const meta = FEED_META[feed.slug] || { tier: 4, commission: '–', website: '', color: 'text-muted-foreground' };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{feed.name}</CardTitle>
            <CardDescription className="text-xs mt-0.5 truncate">{meta.website}</CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn('text-[10px] shrink-0', meta.color)}
          >
            Tier {meta.tier}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* Infos */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/50 rounded px-2 py-1.5">
            <div className="text-muted-foreground">Quelle</div>
            <div className="font-medium mt-0.5">
              {SOURCE_LABELS[feed.source] || feed.source}
            </div>
          </div>
          <div className="bg-muted/50 rounded px-2 py-1.5">
            <div className="text-muted-foreground">Provision</div>
            <div className={cn('font-medium mt-0.5', meta.color)}>
              {meta.commission}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={onQueue}
            disabled={isQueuing || isRunning}
          >
            {isQueuing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <ListOrdered className="h-3 w-3 mr-1" />
            )}
            In Queue
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs"
            onClick={onRunNow}
            disabled={isQueuing || isRunning}
          >
            {isRunning ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Zap className="h-3 w-3 mr-1" />
            )}
            Sofort
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminScraperPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data, isLoading, refetch } = useScraperFeeds();
  const scheduleFeed = useScheduleFeed();
  const scheduleAll = useScheduleAllFeeds();
  const runNow = useRunFeedNow();

  const [runningFeed, setRunningFeed] = useState<string | null>(null);
  const [queuingFeed, setQueuingFeed] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || user.role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const feeds = data?.feeds || [];
  const queue = data?.queue;

  // Nach Tier gruppieren
  const tiers: Record<number, FeedInfo[]> = { 1: [], 2: [], 3: [], 4: [] };
  feeds.forEach(f => {
    const t = FEED_META[f.slug]?.tier || 4;
    tiers[t].push(f);
  });

  const handleQueue = async (slug: string) => {
    setQueuingFeed(slug);
    try {
      await scheduleFeed.mutateAsync(slug);
      toast.success(`${slug} zur Import-Queue hinzugefügt`);
    } catch {
      toast.error(`Fehler beim Einreihen von ${slug}`);
    } finally {
      setQueuingFeed(null);
    }
  };

  const handleRunNow = async (slug: string, name: string) => {
    setRunningFeed(slug);
    toast.info(`Starte Sofort-Import für ${name}…`, { duration: 60000, id: `run-${slug}` });
    try {
      const result: any = await runNow.mutateAsync(slug);
      toast.success(
        `${name}: ${result.productsImported} Produkte, ${result.seedsCreated} Seeds (${result.duration})`,
        { id: `run-${slug}`, duration: 8000 }
      );
    } catch {
      toast.error(`Fehler beim Sofort-Import von ${name}`, { id: `run-${slug}` });
    } finally {
      setRunningFeed(null);
    }
  };

  const handleRunAll = async () => {
    try {
      const result: any = await scheduleAll.mutateAsync();
      toast.success(result.message || 'Alle Feeds in die Queue eingereiht');
    } catch {
      toast.error('Fehler beim Einreihen aller Feeds');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href="/admin" className="hover:text-foreground">Admin</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>Scraper</span>
            </div>
            <h1 className="text-3xl font-bold">Feed-Importer</h1>
            <p className="text-muted-foreground">
              Verwalte alle {feeds.length} Affiliate-Feed-Importer für Samenpreise
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Aktualisieren
            </Button>
            <Button
              onClick={handleRunAll}
              disabled={scheduleAll.isPending}
            >
              {scheduleAll.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Alle importieren
            </Button>
          </div>
        </div>

        {/* Queue Stats */}
        {queue && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Wartend</p>
                  <p className="text-xl font-bold">{queue.waiting}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
                <div>
                  <p className="text-xs text-muted-foreground">Aktiv</p>
                  <p className="text-xl font-bold">{queue.active}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Abgeschlossen</p>
                  <p className="text-xl font-bold">{queue.completed}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Fehlgeschlagen</p>
                  <p className="text-xl font-bold">{queue.failed}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <SkipForward className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Verzögert</p>
                  <p className="text-xl font-bold">{queue.delayed}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Schedule Info */}
        {data?.schedule && (
          <Card className="border-dashed">
            <CardContent className="py-3 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground">Automatischer Import täglich um</span>
                <span className="font-semibold">{data.schedule.daily}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Nächster Lauf:{' '}
                <span className="font-medium text-foreground">
                  {formatRelativeTime(data.schedule.nextRun)} — {new Date(data.schedule.nextRun).toLocaleString('de-DE')}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legende */}
        <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <ListOrdered className="h-3.5 w-3.5" />
            <span><strong>In Queue</strong> – in Warteschlange einreihen, läuft im Hintergrund</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            <span><strong>Sofort</strong> – direkt ausführen, wartet auf Ergebnis</span>
          </div>
        </div>

        {/* Feed-Karten nach Tier */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {([1, 2, 3, 4] as const).map(tier => {
              const tierFeeds = tiers[tier];
              if (tierFeeds.length === 0) return null;
              return (
                <section key={tier}>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {TIER_LABELS[tier]}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {tierFeeds.map(feed => (
                      <FeedCard
                        key={feed.slug}
                        feed={feed}
                        onQueue={() => handleQueue(feed.slug)}
                        onRunNow={() => handleRunNow(feed.slug, feed.name)}
                        isQueuing={queuingFeed === feed.slug}
                        isRunning={runningFeed === feed.slug}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}

        {/* Info-Box */}
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex gap-3">
              <Database className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong className="text-foreground">Queue-System:</strong> BullMQ + Redis — max. 2 gleichzeitige Jobs, max. 6 Jobs/Minute.
                </p>
                <p>
                  <strong className="text-foreground">Retry:</strong> Bei Fehlern wird 3x wiederholt (exponentieller Backoff, Start nach 2 Minuten).
                </p>
                <p>
                  <strong className="text-foreground">Sofort-Import:</strong> Läuft synchron direkt im Prozess (für Tests/Debugging), kein Queue-Limit.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Calendar, Sprout, Eye, Heart, MessageSquare, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';
import { useGrows } from '@/hooks/use-journal';

const statusColors: Record<string, string> = {
  PLANNING: 'bg-gray-500',
  GERMINATION: 'bg-yellow-500',
  SEEDLING: 'bg-lime-500',
  VEGETATIVE: 'bg-green-500',
  FLOWERING: 'bg-purple-500',
  DRYING: 'bg-orange-500',
  CURING: 'bg-amber-700',
  HARVESTED: 'bg-blue-500',
  ABANDONED: 'bg-red-500',
  active: 'bg-green-500',
  completed: 'bg-blue-500',
  cancelled: 'bg-red-500'
};

const typeColors: Record<string, string> = {
  SATIVA: 'text-orange-500',
  INDICA: 'text-purple-500',
  HYBRID: 'text-green-500',
  RUDERALIS: 'text-blue-500',
  feminized: 'text-pink-500',
  autoflower: 'text-yellow-500',
  regular: 'text-gray-500',
  clone: 'text-cyan-500'
};

export default function JournalPage() {
  const { data, isLoading, error } = useGrows();

  const grows = data?.grows || [];

  // Calculate stats from actual data
  const activeGrows = grows.filter((g: any) =>
    !['HARVESTED', 'ABANDONED', 'completed', 'cancelled'].includes(g.status)
  ).length;
  const totalEntries = grows.reduce((sum: number, g: any) => sum + (g.stats?.totalEntries || g.entryCount || 0), 0);
  const totalFollowers = grows.reduce((sum: number, g: any) => sum + (g.stats?.followers || 0), 0);
  const totalReactions = grows.reduce((sum: number, g: any) => sum + (g.stats?.totalReactions || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mein Grow Journal</h1>
            <p className="text-muted-foreground">
              Dokumentiere deine Grows und teile deine Erfahrungen
            </p>
          </div>
          <Button asChild>
            <Link href="/journal/new">
              <Plus className="mr-2 h-4 w-4" />
              Neuer Grow
            </Link>
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktive Grows</CardTitle>
              <Sprout className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeGrows}</div>
              <p className="text-xs text-muted-foreground">von {grows.length} gesamt</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Einträge</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEntries}</div>
              <p className="text-xs text-muted-foreground">Journal-Einträge</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Follower</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFollowers}</div>
              <p className="text-xs text-muted-foreground">folgen deinen Grows</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reactions</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReactions}</div>
              <p className="text-xs text-muted-foreground">auf deine Einträge</p>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Lade Grows...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Fehler beim Laden: {(error as Error).message}</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                Erneut versuchen
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Grows Grid */}
        {!isLoading && !error && grows.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold">Meine Grows</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {grows.map((grow: any) => (
                <Card key={grow.id || grow._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Grow Header with Image Placeholder */}
                  <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Sprout className="h-20 w-20 text-primary/40" />
                    <div className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-medium text-white ${statusColors[grow.status] || 'bg-gray-500'}`}>
                      {grow.status}
                    </div>
                  </div>

                  <CardHeader>
                    <CardTitle className="line-clamp-1">
                      {grow.strainName || grow.strain?.name || 'Unbenannter Grow'}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <span className={`font-medium ${typeColors[grow.type] || typeColors[grow.strain?.type] || 'text-gray-500'}`}>
                        {grow.breeder || grow.strain?.breeder || 'Unbekannter Breeder'}
                      </span>
                      <span className="text-xs">• {grow.type || grow.strain?.type || 'N/A'}</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Art:</span>
                        <span className="font-medium">{grow.environment || grow.growType || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Medium:</span>
                        <span className="font-medium">{grow.medium || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gestartet:</span>
                        <span className="font-medium">
                          {grow.startDate ? formatRelativeTime(new Date(grow.startDate)) : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {grow.stats?.totalEntries || grow.entryCount || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {grow.stats?.totalComments || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {grow.stats?.totalReactions || 0}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="gap-2">
                    <Button asChild className="flex-1">
                      <Link href={`/journal/${grow.id || grow._id}`}>
                        Öffnen
                      </Link>
                    </Button>
                    <Button variant="outline" size="icon" asChild>
                      <Link href={`/journal/${grow.id || grow._id}/entry/new`}>
                        <Plus className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State (if no grows) */}
        {!isLoading && !error && grows.length === 0 && (
          <Card className="flex flex-col items-center justify-center py-16">
            <Sprout className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold">Noch keine Grows</h3>
            <p className="mb-6 text-center text-muted-foreground">
              Starte deinen ersten Grow und dokumentiere deine Reise!
            </p>
            <Button asChild>
              <Link href="/journal/new">
                <Plus className="mr-2 h-4 w-4" />
                Ersten Grow starten
              </Link>
            </Button>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

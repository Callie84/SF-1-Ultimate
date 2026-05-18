'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Sprout,
  TrendingUp,
  Award,
  BarChart3,
  Loader2,
  Home,
  Sun,
  TreePine,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface GrowStats {
  total: number;
  active: number;
  harvested: number;
  byEnvironment: Record<string, number>;
  byType: Record<string, number>;
  harvest: {
    count: number;
    totalYieldDry: number;
    avgYieldDry: number;
    maxYieldDry: number;
    avgEfficiency: number | null;
    maxEfficiency: number | null;
    avgYieldPerM2: number | null;
    maxYieldPerM2: number | null;
    avgQuality: number;
    avgDurationDays: number;
  };
  topYields: Array<{
    strainName: string;
    yieldDry: number;
    yieldWet?: number;
    efficiency?: number;
    yieldPerM2?: number;
    lightWattage?: number;
    quality: number;
    harvestDate: string;
    environment: string;
  }>;
  topStrains: Array<{
    _id: string;
    count: number;
    avgYield: number;
  }>;
}

const ENV_ICONS: Record<string, React.ReactNode> = {
  indoor: <Home className="h-4 w-4" />,
  outdoor: <Sun className="h-4 w-4" />,
  greenhouse: <TreePine className="h-4 w-4" />,
};

const ENV_LABELS: Record<string, string> = {
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  greenhouse: 'Gewächshaus',
};

const TYPE_LABELS: Record<string, string> = {
  feminized: 'Feminisiert',
  autoflower: 'Autoflower',
  regular: 'Regular',
  clone: 'Klon',
};

function QualityStars({ quality }: { quality: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={cn('text-sm', star <= Math.round(quality) ? 'text-yellow-500' : 'text-muted-foreground/30')}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function JournalStatsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['journal-stats'],
    queryFn: () => api.get<GrowStats>('/api/journal/grows/stats'),
    staleTime: 5 * 60 * 1000,
  });

  const stats = data;

  if (isLoading) {
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
            <Link href="/journal">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8" />
              Meine Statistiken
            </h1>
            <p className="text-muted-foreground">Übersicht deiner Grow-Ergebnisse</p>
          </div>
        </div>

        {!stats || stats.total === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Sprout className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Noch keine Grows</h3>
              <p className="text-muted-foreground mb-4">Starte deinen ersten Grow um Statistiken zu sehen</p>
              <Button asChild>
                <Link href="/journal/new">Neuen Grow starten</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Sprout className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-2xl font-bold">{stats.total}</div>
                      <div className="text-xs text-muted-foreground">Grows gesamt</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                      <div className="text-xs text-muted-foreground">Aktive Grows</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className="text-2xl font-bold">{stats.harvested}</div>
                      <div className="text-xs text-muted-foreground">Geerntet</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div>
                    <div className="text-2xl font-bold">{stats.harvest.totalYieldDry}g</div>
                    <div className="text-xs text-muted-foreground">Gesamt-Ertrag (trocken)</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Harvest Stats */}
            {stats.harvest.count > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    Ernte-Statistiken
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Ø Ertrag (trocken)</div>
                      <div className="text-2xl font-bold">{stats.harvest.avgYieldDry}g</div>
                      <div className="text-xs text-muted-foreground">Max: {stats.harvest.maxYieldDry}g</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Ø Qualität</div>
                      <div className="text-2xl font-bold">{stats.harvest.avgQuality.toFixed(1)}/5</div>
                      <QualityStars quality={stats.harvest.avgQuality} />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Ø Grow-Dauer</div>
                      <div className="text-2xl font-bold">{stats.harvest.avgDurationDays}</div>
                      <div className="text-xs text-muted-foreground">Tage</div>
                    </div>
                    {stats.harvest.avgEfficiency && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Ø Effizienz</div>
                        <div className="text-2xl font-bold text-blue-700">{stats.harvest.avgEfficiency} g/W</div>
                        <div className="text-xs text-muted-foreground">Max: {stats.harvest.maxEfficiency} g/W</div>
                      </div>
                    )}
                    {stats.harvest.avgYieldPerM2 && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Ø Flächenertrag</div>
                        <div className="text-2xl font-bold text-purple-700">{stats.harvest.avgYieldPerM2} g/m²</div>
                        <div className="text-xs text-muted-foreground">Max: {stats.harvest.maxYieldPerM2} g/m²</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {/* Environment Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Nach Umgebung</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.entries(stats.byEnvironment).length === 0 ? (
                    <p className="text-muted-foreground text-sm">Keine Daten</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(stats.byEnvironment).map(([env, count]) => {
                        const total = Object.values(stats.byEnvironment).reduce((a, b) => a + b, 0);
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={env}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 text-sm">
                                {ENV_ICONS[env] || <Sprout className="h-4 w-4" />}
                                {ENV_LABELS[env] || env}
                              </div>
                              <span className="text-sm font-medium">{count} ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-2 bg-primary rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Seed Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Nach Typ</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.entries(stats.byType).length === 0 ? (
                    <p className="text-muted-foreground text-sm">Keine Daten</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(stats.byType).map(([type, count]) => {
                        const total = Object.values(stats.byType).reduce((a, b) => a + b, 0);
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={type}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm">{TYPE_LABELS[type] || type}</span>
                              <span className="text-sm font-medium">{count} ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-2 bg-primary rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Yields */}
              {stats.topYields.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Bester Ertrag</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.topYields.map((grow, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-6 text-center text-sm font-bold text-muted-foreground">
                            {idx + 1}.
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{grow.strainName}</div>
                            <div className="text-xs text-muted-foreground">
                              {ENV_LABELS[grow.environment] || grow.environment}
                              {grow.harvestDate && ` · ${new Date(grow.harvestDate).toLocaleDateString('de-DE')}`}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-sm">{grow.yieldDry}g</div>
                            {grow.efficiency && (
                              <div className="text-xs text-blue-600">{grow.efficiency} g/W</div>
                            )}
                            {grow.yieldPerM2 && (
                              <div className="text-xs text-purple-600">{grow.yieldPerM2} g/m²</div>
                            )}
                            {grow.quality && <QualityStars quality={grow.quality} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Strains */}
              {stats.topStrains.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Lieblings-Strains</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.topStrains.map((strain, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground w-5">{idx + 1}.</span>
                            <span className="text-sm font-medium">{strain._id || 'Unbekannt'}</span>
                          </div>
                          <div className="text-right text-sm">
                            <span className="font-medium">{strain.count}×</span>
                            {strain.avgYield > 0 && (
                              <span className="text-muted-foreground ml-2">
                                Ø {Math.round(strain.avgYield)}g
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

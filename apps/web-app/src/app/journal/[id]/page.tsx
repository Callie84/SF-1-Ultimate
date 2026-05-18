'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus,
  Calendar,
  Sprout,
  Heart,
  MessageSquare,
  Share2,
  Edit,
  Trash2,
  Eye,
  Loader2,
  ArrowLeft,
  Scissors,
  Globe,
  Lock,
  ExternalLink,
  GitBranch,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { useGrow, useEntries, useDeleteEntry, useHarvestGrow, useToggleVisibility, useGrowClones } from '@/hooks/use-journal';
import { toast } from 'sonner';

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

const STAGE_LABELS: Record<string, string> = {
  PLANNING: 'Planung',
  GERMINATION: 'Keimung',
  SEEDLING: 'Sämling',
  VEGETATIVE: 'Vegetation',
  FLOWERING: 'Blüte',
  DRYING: 'Trocknung',
  CURING: 'Curing',
  HARVESTED: 'Geerntet',
  ABANDONED: 'Abgebrochen',
};

export default function GrowDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [showHarvestForm, setShowHarvestForm] = useState(false);
  const [harvestData, setHarvestData] = useState({
    harvestDate: new Date().toISOString().split('T')[0],
    yieldWet: '',
    yieldDry: '',
    growAreaM2: '',
    quality: '4',
  });

  const { data: growData, isLoading: growLoading, error: growError } = useGrow(id);
  const { data: entriesData, isLoading: entriesLoading } = useEntries(id);
  const { data: clonesData } = useGrowClones(id);
  const deleteEntry = useDeleteEntry(id);
  const harvestGrow = useHarvestGrow(id);
  const toggleVisibility = useToggleVisibility(id);

  const grow = growData?.grow;
  const entries = entriesData?.entries || [];
  const clones = (clonesData as any)?.clones || [];

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Eintrag wirklich löschen?')) return;
    try {
      await deleteEntry.mutateAsync(entryId);
      toast.success('Eintrag gelöscht');
    } catch {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleHarvest = async () => {
    try {
      await harvestGrow.mutateAsync({
        harvestDate: new Date(harvestData.harvestDate).toISOString(),
        yieldWet: harvestData.yieldWet ? parseFloat(harvestData.yieldWet) : undefined,
        yieldDry: harvestData.yieldDry ? parseFloat(harvestData.yieldDry) : undefined,
        growAreaM2: harvestData.growAreaM2 ? parseFloat(harvestData.growAreaM2) : undefined,
        quality: parseInt(harvestData.quality),
      });
      toast.success('Grow als geerntet markiert!');
      setShowHarvestForm(false);
    } catch {
      toast.error('Fehler beim Markieren');
    }
  };

  // Loading State
  if (growLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Lade Grow...</span>
        </div>
      </DashboardLayout>
    );
  }

  // Error State
  if (growError || !grow) {
    return (
      <DashboardLayout>
        <Card className="flex flex-col items-center justify-center py-16">
          <Sprout className="mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-semibold">Grow nicht gefunden</h3>
          <p className="mb-6 text-center text-muted-foreground">
            Dieser Grow existiert nicht oder du hast keinen Zugriff.
          </p>
          <Button asChild>
            <Link href="/journal">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zur Übersicht
            </Link>
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Link */}
        <Link href="/journal" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zu Meine Grows
        </Link>

        {/* Grow Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl">
                    {grow.strainName || grow.strain?.name || 'Unbenannter Grow'}
                  </CardTitle>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium text-white ${statusColors[grow.status] || 'bg-gray-500'}`}>
                    {grow.status}
                  </span>
                </div>
                <CardDescription className="mt-2">
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="font-medium text-primary">
                      {grow.breeder || grow.strain?.breeder || 'Unbekannter Breeder'}
                    </span>
                    <span>•</span>
                    <span>{grow.type || grow.strain?.type || 'N/A'}</span>
                    <span>•</span>
                    <span>{grow.environment || grow.growType || 'N/A'}</span>
                    <span>•</span>
                    <span>{grow.medium || 'N/A'}</span>
                  </div>
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Visibility toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  className={grow.isPublic !== false
                    ? 'gap-1.5 text-green-700 border-green-300 hover:bg-green-50'
                    : 'gap-1.5 text-muted-foreground'}
                  disabled={toggleVisibility.isPending}
                  onClick={async () => {
                    const next = grow.isPublic === false;
                    try {
                      await toggleVisibility.mutateAsync(next);
                      toast.success(next ? 'Grow ist jetzt öffentlich' : 'Grow ist jetzt privat');
                    } catch {
                      toast.error('Fehler beim Ändern der Sichtbarkeit');
                    }
                  }}
                >
                  {toggleVisibility.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : grow.isPublic !== false ? (
                    <Globe className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {grow.isPublic !== false ? 'Öffentlich' : 'Privat'}
                </Button>

                {grow.isPublic !== false && (
                  <Button variant="ghost" size="sm" asChild className="gap-1.5">
                    <Link href={`/grows/${id}`} target="_blank">
                      <ExternalLink className="h-4 w-4" />
                      Öffentlich ansehen
                    </Link>
                  </Button>
                )}

                {!['HARVESTED', 'ABANDONED', 'completed', 'cancelled'].includes(grow.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
                    onClick={() => setShowHarvestForm(!showHarvestForm)}
                  >
                    <Scissors className="h-4 w-4" />
                    Ernten
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/calendar?growId=${id}`}>
                    <Calendar className="h-4 w-4 mr-1" />
                    Kalender
                  </Link>
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <Link href={`/journal/${id}/edit`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {grow.description && (
              <p className="text-muted-foreground">{grow.description}</p>
            )}

            {/* Harvest Form */}
            {showHarvestForm && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                <h3 className="font-semibold text-amber-800">Ernte dokumentieren</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Erntedatum</label>
                    <input
                      type="date"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={harvestData.harvestDate}
                      onChange={e => setHarvestData(d => ({ ...d, harvestDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Nassgewicht (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="z.B. 120"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={harvestData.yieldWet}
                      onChange={e => setHarvestData(d => ({ ...d, yieldWet: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Trockengewicht (g)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="z.B. 45"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={harvestData.yieldDry}
                      onChange={e => setHarvestData(d => ({ ...d, yieldDry: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Anbaufläche (m²)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="z.B. 0.25"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={harvestData.growAreaM2}
                      onChange={e => setHarvestData(d => ({ ...d, growAreaM2: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-medium">Qualität (1-5)</label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={harvestData.quality}
                      onChange={e => setHarvestData(d => ({ ...d, quality: e.target.value }))}
                    >
                      <option value="1">1 - Schlecht</option>
                      <option value="2">2 - Mittelmäßig</option>
                      <option value="3">3 - Gut</option>
                      <option value="4">4 - Sehr gut</option>
                      <option value="5">5 - Ausgezeichnet</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={handleHarvest}
                    disabled={harvestGrow.isPending}
                  >
                    {harvestGrow.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    Ernte bestätigen
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowHarvestForm(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}

            {/* Harvest Results — visible when harvested */}
            {grow.status === 'harvested' && (grow.yieldDry || grow.yieldWet) && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50/50 p-4">
                <h3 className="text-sm font-semibold text-green-800 mb-3">Ernte-Ergebnisse</h3>
                <div className="flex flex-wrap gap-3">
                  {grow.yieldWet && (
                    <div className="text-center rounded-md bg-background border px-3 py-2">
                      <div className="text-lg font-bold">{grow.yieldWet}g</div>
                      <div className="text-xs text-muted-foreground">Nassgewicht</div>
                    </div>
                  )}
                  {grow.yieldDry && (
                    <div className="text-center rounded-md bg-background border px-3 py-2">
                      <div className="text-lg font-bold text-green-700">{grow.yieldDry}g</div>
                      <div className="text-xs text-muted-foreground">Trockengewicht</div>
                    </div>
                  )}
                  {grow.efficiency && (
                    <div className="text-center rounded-md bg-background border px-3 py-2">
                      <div className="text-lg font-bold text-blue-700">{grow.efficiency} g/W</div>
                      <div className="text-xs text-muted-foreground">Effizienz</div>
                    </div>
                  )}
                  {grow.yieldPerM2 && (
                    <div className="text-center rounded-md bg-background border px-3 py-2">
                      <div className="text-lg font-bold text-purple-700">{grow.yieldPerM2} g/m²</div>
                      <div className="text-xs text-muted-foreground">Flächenertrag</div>
                    </div>
                  )}
                  {grow.quality && (
                    <div className="text-center rounded-md bg-background border px-3 py-2">
                      <div className="text-lg font-bold text-yellow-600">{'★'.repeat(grow.quality)}{'☆'.repeat(5 - grow.quality)}</div>
                      <div className="text-xs text-muted-foreground">Qualität</div>
                    </div>
                  )}
                  {grow.harvestDate && (
                    <div className="text-center rounded-md bg-background border px-3 py-2">
                      <div className="text-lg font-bold">{new Date(grow.harvestDate).toLocaleDateString('de-DE')}</div>
                      <div className="text-xs text-muted-foreground">Erntedatum</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats Row */}
            <div className="mt-6 flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Gestartet: {grow.startDate ? formatDate(new Date(grow.startDate)) : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span>{grow.stats?.followers || 0} Follower</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span>{grow.stats?.totalReactions || 0} Reactions</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>{grow.stats?.totalComments || 0} Kommentare</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Klon-Abschnitt */}
        {(grow.motherGrowId || clones.length > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Klon-Stammbaum
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {grow.motherGrowId && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Mutterpflanze:</span>
                  <Link
                    href={`/journal/${grow.motherGrowId}`}
                    className="text-primary hover:underline font-medium"
                  >
                    Zum Mutter-Grow →
                  </Link>
                </div>
              )}
              {clones.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">
                    {clones.length} Klon{clones.length !== 1 ? 'e' : ''} von diesem Grow:
                  </span>
                  <div className="space-y-1">
                    {clones.map((clone: any) => (
                      <Link
                        key={clone._id}
                        href={`/journal/${clone._id}`}
                        className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm font-medium">{clone.strainName}</span>
                        <span className="text-xs text-muted-foreground capitalize">{clone.status}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <Button variant="outline" size="sm" asChild className="mt-2">
                <Link href={`/journal/new?motherGrowId=${id}&type=clone`}>
                  <GitBranch className="h-3.5 w-3.5 mr-1.5" />
                  Klon anlegen
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Journal Einträge ({entries.length})</h2>
          <Button asChild>
            <Link href={`/journal/${id}/entry/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Neuer Eintrag
            </Link>
          </Button>
        </div>

        {/* Loading Entries */}
        {entriesLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Lade Einträge...</span>
          </div>
        )}

        {/* Visual Timeline */}
        {!entriesLoading && entries.length > 0 && (
          <div>
            {entries.map((entry: any, idx: number) => {
              const isLast = idx === entries.length - 1;
              const stage = entry.stage || entry.growStage || '';
              const prevStage = idx > 0 ? (entries[idx - 1].stage || entries[idx - 1].growStage || '') : null;
              const isNewStage = stage && stage !== prevStage;
              const nodeColor = statusColors[stage] || 'bg-primary';

              const measurements = [
                { label: 'Höhe', value: entry.measurements?.height ?? entry.height, unit: 'cm' },
                { label: 'pH', value: entry.measurements?.ph ?? entry.ph, unit: '' },
                { label: 'EC', value: entry.measurements?.ec ?? entry.ec, unit: '' },
                { label: 'Temp', value: entry.measurements?.temperature ?? entry.temperature, unit: '°C' },
                { label: 'Feuchte', value: entry.measurements?.humidity ?? entry.humidity, unit: '%' },
              ].filter(m => m.value !== undefined && m.value !== null && m.value !== '');

              return (
                <div key={entry.id || entry._id}>
                  {/* Phase Transition Banner */}
                  {isNewStage && (
                    <div className="flex items-center gap-3 py-3">
                      <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${nodeColor}`} />
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {STAGE_LABELS[stage] || stage}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}

                  {/* Entry Row */}
                  <div className="flex gap-3 sm:gap-4">
                    {/* Left: Node + vertical line */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white text-xs font-bold shadow-sm ${nodeColor}`}>
                        D{entry.day ?? '?'}
                      </div>
                      {!isLast && (
                        <div className="w-0.5 flex-1 bg-border min-h-[28px] my-2" />
                      )}
                    </div>

                    {/* Right: Entry content */}
                    <div className={`flex-1 min-w-0 ${!isLast ? 'pb-6' : 'pb-2'}`}>
                      <div className="rounded-lg border bg-card p-4 space-y-3 shadow-sm">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold truncate">
                              {entry.title || `Tag ${entry.day ?? '?'}`}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {entry.week && `Woche ${entry.week} · `}
                              {entry.createdAt ? formatRelativeTime(new Date(entry.createdAt)) : ''}
                            </p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <Link href={`/journal/${id}/entry/${entry.id || entry._id}/edit`}>
                                <Edit className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDeleteEntry(entry.id || entry._id)}
                              disabled={deleteEntry.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {/* Notes */}
                        {(entry.content || entry.notes) && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {entry.content || entry.notes}
                          </p>
                        )}

                        {/* Photos */}
                        {entry.photos && entry.photos.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {entry.photos.map((photo: any, pidx: number) => {
                              const photoUrl = typeof photo === 'string'
                                ? photo
                                : (photo.thumbnailUrl || photo.url);
                              return (
                                <div
                                  key={photo._id || photo.id || pidx}
                                  className="h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted"
                                >
                                  {photoUrl ? (
                                    <Image src={photoUrl} alt={`Foto ${pidx + 1}`} width={96} height={96} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center">
                                      <Sprout className="h-6 w-6 text-muted-foreground/40" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Measurements */}
                        {measurements.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 rounded-md bg-muted/50 p-2.5">
                            {measurements.map(m => (
                              <div key={m.label} className="text-center">
                                <div className="text-xs text-muted-foreground">{m.label}</div>
                                <div className="font-semibold text-sm">{m.value}{m.unit}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reactions */}
                        <div className="flex items-center gap-4 border-t pt-2 text-sm text-muted-foreground">
                          <button className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                            <Heart className="h-3.5 w-3.5" />
                            <span>{entry.stats?.reactions || entry.reactionCount || 0}</span>
                          </button>
                          <button className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>{entry.stats?.comments || entry.commentCount || 0}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!entriesLoading && entries.length === 0 && (
          <Card className="flex flex-col items-center justify-center py-16">
            <Calendar className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold">Noch keine Einträge</h3>
            <p className="mb-6 text-center text-muted-foreground">
              Starte mit deinem ersten Eintrag und dokumentiere deinen Grow!
            </p>
            <Button asChild>
              <Link href={`/journal/${id}/entry/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Ersten Eintrag erstellen
              </Link>
            </Button>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

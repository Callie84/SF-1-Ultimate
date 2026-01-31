'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
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
  Droplets,
  Thermometer,
  Zap,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { useGrow, useEntries } from '@/hooks/use-journal';

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

export default function GrowDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: growData, isLoading: growLoading, error: growError } = useGrow(id);
  const { data: entriesData, isLoading: entriesLoading } = useEntries(id);

  const grow = growData?.grow;
  const entries = entriesData?.entries || [];

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
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
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

        {/* Timeline */}
        {!entriesLoading && entries.length > 0 && (
          <div className="space-y-4">
            {entries.map((entry: any) => (
              <Card key={entry.id || entry._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                          D{entry.day || '?'}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{entry.title || `Eintrag Tag ${entry.day}`}</CardTitle>
                          <CardDescription>
                            Tag {entry.day || '?'} • Woche {entry.week || '?'} • {entry.stage || 'N/A'}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {entry.createdAt ? formatRelativeTime(new Date(entry.createdAt)) : 'N/A'}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Content */}
                  {(entry.content || entry.notes) && (
                    <p className="text-sm">{entry.content || entry.notes}</p>
                  )}

                  {/* Measurements */}
                  {(entry.measurements || entry.height || entry.ph) && (
                    <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 md:grid-cols-5">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Sprout className="h-4 w-4" />
                          Höhe
                        </div>
                        <div className="mt-1 font-semibold">
                          {entry.measurements?.height || entry.height || '-'} cm
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Droplets className="h-4 w-4" />
                          pH
                        </div>
                        <div className="mt-1 font-semibold">
                          {entry.measurements?.ph || entry.ph || '-'}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Zap className="h-4 w-4" />
                          EC
                        </div>
                        <div className="mt-1 font-semibold">
                          {entry.measurements?.ec || entry.ec || '-'} mS/cm
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Thermometer className="h-4 w-4" />
                          Temp
                        </div>
                        <div className="mt-1 font-semibold">
                          {entry.measurements?.temperature || entry.temperature || '-'}°C
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Droplets className="h-4 w-4" />
                          RH
                        </div>
                        <div className="mt-1 font-semibold">
                          {entry.measurements?.humidity || entry.humidity || '-'}%
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Photos Preview */}
                  {entry.photos && entry.photos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {entry.photos.map((photo: any, idx: number) => (
                        <div
                          key={idx}
                          className="h-32 w-32 flex-shrink-0 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden"
                        >
                          {typeof photo === 'string' && photo.startsWith('http') ? (
                            <img src={photo} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                          ) : (
                            <Sprout className="h-12 w-12 text-primary/40" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-4 border-t pt-4">
                    <Button variant="ghost" size="sm">
                      <Heart className="mr-2 h-4 w-4" />
                      {entry.stats?.reactions || entry.reactionCount || 0}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      {entry.stats?.comments || entry.commentCount || 0}
                    </Button>
                    <div className="ml-auto flex gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/journal/${id}/entry/${entry.id || entry._id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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

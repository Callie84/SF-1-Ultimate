'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2, ArrowLeft, Sprout, Droplets, Thermometer, Zap, Camera
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { useUpdateEntry } from '@/hooks/use-journal';
import { PhotoUpload } from '@/components/journal/photo-upload';

const editEntrySchema = z.object({
  title: z.string().optional(),
  notes: z.string().min(1, 'Notizen sind erforderlich'),
  day: z.number().min(1).optional(),
  week: z.number().min(1).optional(),
  height: z.number().min(0).optional(),
  ph: z.number().min(0).max(14).optional(),
  ec: z.number().min(0).optional(),
  ppm: z.number().min(0).optional(),
  temperature: z.number().optional(),
  humidity: z.number().min(0).max(100).optional(),
});

type EditEntryFormData = z.infer<typeof editEntrySchema>;

export default function EditEntryPage() {
  const params = useParams();
  const router = useRouter();
  const growId = params.id as string;
  const entryId = params.entryId as string;

  const updateEntry = useUpdateEntry(entryId, growId);
  const isLoading = updateEntry.isPending;

  // Fetch the entry to prefill the form
  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ['journal', 'entries', growId],
    queryFn: () => api.get(`/api/journal/grows/${growId}/entries`),
    enabled: !!growId,
  });

  const entry = entriesData?.entries?.find((e: any) => (e.id || e._id) === entryId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditEntryFormData>({
    resolver: zodResolver(editEntrySchema),
  });

  // Prefill form once entry is loaded
  useEffect(() => {
    if (entry) {
      reset({
        title: entry.title || '',
        notes: entry.notes || entry.content || '',
        day: entry.day,
        week: entry.week,
        height: entry.height || entry.measurements?.height,
        ph: entry.ph || entry.measurements?.ph,
        ec: entry.ec || entry.measurements?.ec,
        ppm: entry.ppm || entry.measurements?.ppm,
        temperature: entry.temperature || entry.measurements?.temperature,
        humidity: entry.humidity || entry.measurements?.humidity,
      });
    }
  }, [entry, reset]);

  const onSubmit = async (data: EditEntryFormData) => {
    try {
      await updateEntry.mutateAsync(data);
      toast.success('Eintrag aktualisiert!');
      router.push(`/journal/${growId}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Fehler beim Speichern');
    }
  };

  if (entriesLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Lade Eintrag...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!entry) {
    return (
      <DashboardLayout>
        <Card className="flex flex-col items-center justify-center py-16">
          <Sprout className="mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-semibold">Eintrag nicht gefunden</h3>
          <Button asChild>
            <Link href={`/journal/${growId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zum Grow
            </Link>
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href={`/journal/${growId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Grow
        </Link>

        <div>
          <h1 className="text-3xl font-bold">Eintrag bearbeiten</h1>
          <p className="text-muted-foreground">Woche {entry.week}, Tag {entry.day}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Eintrag-Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tag</label>
                  <Input
                    type="number"
                    min={1}
                    {...register('day', { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Woche</label>
                  <Input
                    type="number"
                    min={1}
                    {...register('week', { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Titel (optional)</label>
                <Input
                  placeholder="z.B. Erste Blüten sichtbar!"
                  {...register('title')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notizen *</label>
                <Textarea
                  placeholder="Was ist heute passiert?"
                  rows={4}
                  {...register('notes')}
                  disabled={isLoading}
                />
                {errors.notes && (
                  <p className="text-sm text-destructive">{errors.notes.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Messwerte</CardTitle>
              <CardDescription>Optionale Messwerte</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Sprout className="h-4 w-4" />
                    Höhe (cm)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    {...register('height', { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Droplets className="h-4 w-4" />
                    pH-Wert
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={14}
                    {...register('ph', { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Zap className="h-4 w-4" />
                    EC (mS/cm)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    {...register('ec', { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Zap className="h-4 w-4" />
                    PPM
                  </label>
                  <Input
                    type="number"
                    min={0}
                    {...register('ppm', { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Thermometer className="h-4 w-4" />
                    Temperatur (°C)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    {...register('temperature', { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Droplets className="h-4 w-4" />
                    Luftfeuchtigkeit (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    {...register('humidity', { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Abbrechen
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Speichere...
                </>
              ) : (
                'Änderungen speichern'
              )}
            </Button>
          </div>
        </form>

        {/* Photo Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Fotos</CardTitle>
            </div>
            <CardDescription>Fotos zu diesem Eintrag hinzufügen oder löschen</CardDescription>
          </CardHeader>
          <CardContent>
            <PhotoUpload
              entryId={entryId}
              growId={growId}
              existingPhotos={entry?.photos?.map((p: any) => ({
                _id: p._id || p.id,
                thumbnailUrl: p.thumbnailUrl,
                url: p.url,
                caption: p.caption,
              })) || []}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

'use client';

import { useState } from 'react';
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
  Loader2,
  ArrowLeft,
  Sprout,
  Droplets,
  Thermometer,
  Zap,
  Camera
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useGrow, useCreateEntry } from '@/hooks/use-journal';

const createEntrySchema = z.object({
  title: z.string().optional(),
  notes: z.string().min(1, 'Notizen sind erforderlich'),
  day: z.number().min(1).optional(),
  week: z.number().min(1).optional(),
  stage: z.string().optional(),
  height: z.number().min(0).optional(),
  ph: z.number().min(0).max(14).optional(),
  ec: z.number().min(0).optional(),
  ppm: z.number().min(0).optional(),
  temperature: z.number().optional(),
  humidity: z.number().min(0).max(100).optional(),
});

type CreateEntryFormData = z.infer<typeof createEntrySchema>;

const stages = [
  { value: 'GERMINATION', label: 'Keimung' },
  { value: 'SEEDLING', label: 'Sämling' },
  { value: 'VEGETATIVE', label: 'Vegetativ' },
  { value: 'FLOWERING', label: 'Blüte' },
  { value: 'DRYING', label: 'Trocknung' },
  { value: 'CURING', label: 'Aushärtung' },
];

export default function NewEntryPage() {
  const params = useParams();
  const router = useRouter();
  const growId = params.id as string;

  const { data: growData, isLoading: growLoading } = useGrow(growId);
  const createEntry = useCreateEntry(growId);
  const isLoading = createEntry.isPending;

  const grow = growData?.grow;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateEntryFormData>({
    resolver: zodResolver(createEntrySchema),
    defaultValues: {
      stage: 'VEGETATIVE',
      day: 1,
      week: 1,
    },
  });

  const onSubmit = async (data: CreateEntryFormData) => {
    try {
      await createEntry.mutateAsync(data);
      toast.success('Eintrag erfolgreich erstellt!');
      router.push(`/journal/${growId}`);
    } catch (error: any) {
      console.error('Create entry error:', error);
      const message = error?.response?.data?.error || 'Fehler beim Erstellen des Eintrags';
      toast.error(message);
    }
  };

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

  if (!grow) {
    return (
      <DashboardLayout>
        <Card className="flex flex-col items-center justify-center py-16">
          <Sprout className="mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-semibold">Grow nicht gefunden</h3>
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
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Back Link */}
        <Link
          href={`/journal/${growId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zu {grow.strainName || grow.strain?.name || 'Grow'}
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Neuer Eintrag</h1>
          <p className="text-muted-foreground">
            Dokumentiere den Fortschritt deines Grows
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Eintrag-Details</CardTitle>
              <CardDescription>
                Wann und in welcher Phase befindet sich dein Grow?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Phase</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    {...register('stage')}
                    disabled={isLoading}
                  >
                    {stages.map((stage) => (
                      <option key={stage.value} value={stage.value}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
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
                  placeholder="Was ist heute passiert? Wie sehen die Pflanzen aus?"
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

          {/* Measurements */}
          <Card>
            <CardHeader>
              <CardTitle>Messwerte</CardTitle>
              <CardDescription>
                Optionale Messwerte für deinen Grow
              </CardDescription>
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
                    placeholder="z.B. 45"
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
                    placeholder="z.B. 6.2"
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
                    placeholder="z.B. 1.8"
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
                    placeholder="z.B. 800"
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
                    placeholder="z.B. 24"
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
                    placeholder="z.B. 55"
                    {...register('humidity', { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photos Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Fotos</CardTitle>
              <CardDescription>
                Füge Fotos zu deinem Eintrag hinzu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center">
                <Camera className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Foto-Upload kommt bald...
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Du kannst Fotos später hinzufügen
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
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
                  Erstelle...
                </>
              ) : (
                'Eintrag erstellen'
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

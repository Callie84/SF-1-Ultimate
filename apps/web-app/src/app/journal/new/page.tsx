'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateGrow } from '@/hooks/use-journal';

const createGrowSchema = z.object({
  strainName: z.string().min(2, 'Strain-Name erforderlich'),
  breeder: z.string().optional(),
  type: z.enum(['feminized', 'autoflower', 'regular', 'clone']),
  environment: z.enum(['indoor', 'outdoor', 'greenhouse']),
  medium: z.string().optional(),
  startDate: z.string().optional(),
  isPublic: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

type CreateGrowFormData = z.infer<typeof createGrowSchema>;

export default function NewGrowPage() {
  const router = useRouter();
  const createGrow = useCreateGrow();
  const isLoading = createGrow.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateGrowFormData>({
    resolver: zodResolver(createGrowSchema),
    defaultValues: {
      isPublic: true,
      type: 'feminized',
      environment: 'indoor',
      medium: 'soil',
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: CreateGrowFormData) => {
    try {
      // Format startDate to ISO datetime
      const payload = {
        ...data,
        startDate: data.startDate
          ? new Date(data.startDate).toISOString()
          : new Date().toISOString(),
      };

      const result = await createGrow.mutateAsync(payload);
      toast.success('Grow erfolgreich erstellt!');
      router.push(`/journal/${result.grow?.id || result.grow?._id || ''}`);
    } catch (error: any) {
      console.error('Create grow error:', error);
      const message = error?.response?.data?.error || 'Fehler beim Erstellen des Grows';
      toast.error(message);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Neuen Grow starten</h1>
          <p className="text-muted-foreground">
            Dokumentiere deinen Grow von Anfang an
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Grundinformationen</CardTitle>
              <CardDescription>
                Allgemeine Informationen über deinen Grow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="startDate" className="text-sm font-medium">
                  Startdatum
                </label>
                <Input
                  id="startDate"
                  type="date"
                  {...register('startDate')}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Strain Info */}
          <Card>
            <CardHeader>
              <CardTitle>Strain-Informationen</CardTitle>
              <CardDescription>
                Details über die Genetik
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="strainName" className="text-sm font-medium">
                    Strain Name *
                  </label>
                  <Input
                    id="strainName"
                    placeholder="z.B. Gorilla Glue #4"
                    {...register('strainName')}
                    disabled={isLoading}
                  />
                  {errors.strainName && (
                    <p className="text-sm text-destructive">{errors.strainName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="breeder" className="text-sm font-medium">
                    Breeder
                  </label>
                  <Input
                    id="breeder"
                    placeholder="z.B. GG Strains"
                    {...register('breeder')}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="type" className="text-sm font-medium">
                  Samen-Typ *
                </label>
                <select
                  id="type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register('type')}
                  disabled={isLoading}
                >
                  <option value="feminized">Feminisiert</option>
                  <option value="autoflower">Autoflower</option>
                  <option value="regular">Regular</option>
                  <option value="clone">Steckling</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Growing Method */}
          <Card>
            <CardHeader>
              <CardTitle>Anbau-Methode</CardTitle>
              <CardDescription>
                Wie und wo wirst du anbauen?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="environment" className="text-sm font-medium">
                    Anbau-Art *
                  </label>
                  <select
                    id="environment"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...register('environment')}
                    disabled={isLoading}
                  >
                    <option value="indoor">Indoor</option>
                    <option value="outdoor">Outdoor</option>
                    <option value="greenhouse">Greenhouse</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="medium" className="text-sm font-medium">
                    Medium
                  </label>
                  <select
                    id="medium"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...register('medium')}
                    disabled={isLoading}
                  >
                    <option value="soil">Soil (Erde)</option>
                    <option value="coco">Coco</option>
                    <option value="hydro">Hydro</option>
                    <option value="aero">Aeroponics</option>
                    <option value="other">Andere</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card>
            <CardHeader>
              <CardTitle>Privatsphäre</CardTitle>
              <CardDescription>
                Wer darf deinen Grow sehen?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  className="h-4 w-4 rounded border-gray-300"
                  {...register('isPublic')}
                  disabled={isLoading}
                />
                <label
                  htmlFor="isPublic"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Öffentlich (Andere Nutzer können deinen Grow sehen)
                </label>
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
                'Grow erstellen'
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

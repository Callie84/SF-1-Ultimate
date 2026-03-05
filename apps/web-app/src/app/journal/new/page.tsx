'use client';

import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Search, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useRef, useEffect } from 'react';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateGrow } from '@/hooks/use-journal';
import { api } from '@/lib/api-client';

const createGrowSchema = z.object({
  strainName: z.string().min(2, 'Strain-Name erforderlich'),
  strainId: z.string().optional(),
  breeder: z.string().optional(),
  type: z.enum(['feminized', 'autoflower', 'regular', 'clone']),
  environment: z.enum(['indoor', 'outdoor', 'greenhouse']),
  medium: z.string().optional(),
  startDate: z.string().optional(),
  isPublic: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

type CreateGrowFormData = z.infer<typeof createGrowSchema>;

interface StrainSuggestion {
  id: string;
  name: string;
  breeder?: string;
  type?: string;
}

function StrainAutocomplete({
  value,
  onChange,
  onSelect,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: StrainSuggestion) => void;
  disabled?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<StrainSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInput = (v: string) => {
    onChange(v);
    setSelectedName('');
    clearTimeout(timeoutRef.current);
    if (v.length < 2) { setSuggestions([]); setIsOpen(false); return; }
    timeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get<{ suggestions: StrainSuggestion[] }>(
          `/api/search/strains/suggest?q=${encodeURIComponent(v)}&limit=6`
        );
        setSuggestions(res.suggestions || []);
        setIsOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelect = (s: StrainSuggestion) => {
    setSelectedName(s.name);
    onChange(s.name);
    setSuggestions([]);
    setIsOpen(false);
    onSelect(s);
  };

  const handleClear = () => {
    onChange('');
    setSelectedName('');
    setSuggestions([]);
    setIsOpen(false);
    onSelect({ id: '', name: '', breeder: '', type: '' });
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="Strain suchen oder eingeben..."
          className={`pl-9 pr-9 ${selectedName ? 'border-green-500' : ''}`}
          disabled={disabled}
          autoComplete="off"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {selectedName && !isSearching && (
          <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>
      {selectedName && (
        <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
          <Check className="h-3 w-3" />
          Aus Datenbank verknüpft
        </p>
      )}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSelect(s)}
              className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.name}</p>
                {s.breeder && <p className="text-xs text-muted-foreground truncate">{s.breeder}</p>}
              </div>
              {s.type && (
                <span className="shrink-0 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs capitalize">
                  {s.type}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewGrowPage() {
  const router = useRouter();
  const createGrow = useCreateGrow();
  const isLoading = createGrow.isPending;

  const {
    register,
    handleSubmit,
    control,
    setValue,
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
                Suche nach einer Strain aus unserer Datenbank oder gib deinen eigenen Namen ein
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Strain *</label>
                <Controller
                  name="strainName"
                  control={control}
                  render={({ field }) => (
                    <StrainAutocomplete
                      value={field.value || ''}
                      onChange={field.onChange}
                      onSelect={(s) => {
                        if (s.id) {
                          setValue('strainId', s.id);
                          setValue('strainName', s.name);
                          if (s.breeder) setValue('breeder', s.breeder);
                        } else {
                          setValue('strainId', undefined);
                        }
                      }}
                      disabled={isLoading}
                    />
                  )}
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

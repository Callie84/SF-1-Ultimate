'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Sprout, Search, X, Check } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useGrow, useUpdateGrow } from '@/hooks/use-journal';
import { api } from '@/lib/api-client';

const editGrowSchema = z.object({
  strainName: z.string().min(1, 'Strain-Name erforderlich'),
  strainId: z.string().optional(),
  breeder: z.string().optional(),
  type: z.enum(['feminized', 'autoflower', 'regular', 'clone']),
  environment: z.enum(['indoor', 'outdoor', 'greenhouse']),
  medium: z.string().optional(),
  isPublic: z.boolean().default(true),
});

type EditGrowFormData = z.infer<typeof editGrowSchema>;

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
  defaultLinked,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: StrainSuggestion) => void;
  disabled?: boolean;
  defaultLinked?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<StrainSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedName, setSelectedName] = useState(defaultLinked ? value : '');
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
        setSuggestions((res as any).suggestions || []);
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

export default function EditGrowPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: growData, isLoading: growLoading } = useGrow(id);
  const updateGrow = useUpdateGrow(id);
  const isLoading = updateGrow.isPending;

  const grow = growData?.grow;

  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<EditGrowFormData>({
    resolver: zodResolver(editGrowSchema),
  });

  useEffect(() => {
    if (grow) {
      reset({
        strainName: grow.strainName || grow.strain?.name || '',
        strainId: grow.strainId || '',
        breeder: grow.breeder || grow.strain?.breeder || '',
        type: grow.type || 'feminized',
        environment: grow.environment || grow.growType || 'indoor',
        medium: grow.medium || '',
        isPublic: grow.isPublic !== false,
      });
    }
  }, [grow, reset]);

  const onSubmit = async (data: EditGrowFormData) => {
    try {
      await updateGrow.mutateAsync(data as any);
      toast.success('Grow aktualisiert!');
      router.push(`/journal/${id}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Fehler beim Speichern');
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
            <Link href="/journal"><ArrowLeft className="mr-2 h-4 w-4" />Zurück</Link>
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href={`/journal/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Grow
        </Link>

        <div>
          <h1 className="text-3xl font-bold">Grow bearbeiten</h1>
          <p className="text-muted-foreground">{grow.strainName || grow.strain?.name}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Strain-Informationen</CardTitle>
              <CardDescription>
                Suche nach einer Strain aus unserer Datenbank oder lass den Namen so wie er ist
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
                      defaultLinked={!!grow.strainId}
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
                <label className="text-sm font-medium">Breeder</label>
                <Input
                  placeholder="z.B. GG Strains"
                  {...register('breeder')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Samen-Typ</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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

          <Card>
            <CardHeader>
              <CardTitle>Anbau-Methode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Anbau-Art</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    {...register('environment')}
                    disabled={isLoading}
                  >
                    <option value="indoor">Indoor</option>
                    <option value="outdoor">Outdoor</option>
                    <option value="greenhouse">Greenhouse</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Medium</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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

          <Card>
            <CardHeader>
              <CardTitle>Privatsphäre</CardTitle>
              <CardDescription>Wer darf deinen Grow sehen?</CardDescription>
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
                <label htmlFor="isPublic" className="text-sm font-medium">
                  Öffentlich (Andere Nutzer können deinen Grow sehen)
                </label>
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
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Speichere...</>
              ) : (
                'Änderungen speichern'
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

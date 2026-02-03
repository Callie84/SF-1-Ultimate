// /apps/web-app/src/app/strains/compare/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Scale,
  Search,
  X,
  Plus,
  Loader2,
  Leaf,
  Percent,
  Sparkles,
  Wind,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStrainSearch, useStrain, Strain } from '@/hooks/use-strains';

const MAX_COMPARE = 4;

const typeColors: Record<string, string> = {
  indica: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  sativa: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  hybrid: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  autoflower: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
};

function StrainSelector({
  onSelect,
  excludeIds,
}: {
  onSelect: (strain: Strain) => void;
  excludeIds: string[];
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading } = useStrainSearch(search);

  const filteredStrains = data?.strains.filter(
    (s) => !excludeIds.includes(s._id)
  ) || [];

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Strain suchen..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9"
        />
      </div>

      {isOpen && search.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredStrains.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Keine Strains gefunden
            </div>
          ) : (
            filteredStrains.map((strain) => (
              <button
                key={strain._id}
                className="w-full px-4 py-2 text-left hover:bg-muted/50 flex items-center gap-2"
                onClick={() => {
                  onSelect(strain);
                  setSearch('');
                  setIsOpen(false);
                }}
              >
                <Leaf className="h-4 w-4 text-primary" />
                <span className="font-medium">{strain.name}</span>
                <Badge variant="secondary" className={cn('ml-auto text-xs', typeColors[strain.type])}>
                  {strain.type}
                </Badge>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ComparisonCard({
  strain,
  onRemove,
}: {
  strain: Strain;
  onRemove: () => void;
}) {
  return (
    <Card className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {strain.imageUrl ? (
            <img
              src={strain.imageUrl}
              alt={strain.name}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Leaf className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <CardTitle className="text-lg">{strain.name}</CardTitle>
            <Badge className={cn('text-xs', typeColors[strain.type])}>
              {strain.type}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Genetics */}
        {strain.genetics && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Genetik</p>
            <p className="text-sm font-medium">{strain.genetics}</p>
          </div>
        )}

        {/* THC/CBD */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <Percent className="h-4 w-4 mx-auto text-red-500 mb-1" />
            <p className="text-xs text-muted-foreground">THC</p>
            <p className="font-bold">{strain.thc ? `${strain.thc}%` : '-'}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <Percent className="h-4 w-4 mx-auto text-blue-500 mb-1" />
            <p className="text-xs text-muted-foreground">CBD</p>
            <p className="font-bold">{strain.cbd ? `${strain.cbd}%` : '-'}</p>
          </div>
        </div>

        {/* Effects */}
        {strain.effects && strain.effects.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <p className="text-xs text-muted-foreground">Effekte</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {strain.effects.slice(0, 5).map((effect, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {effect}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Aromas/Flavors */}
        {((strain.aromas && strain.aromas.length > 0) ||
          (strain.flavors && strain.flavors.length > 0)) && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <Wind className="h-4 w-4 text-green-500" />
              <p className="text-xs text-muted-foreground">Aromen</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {[...(strain.aromas || []), ...(strain.flavors || [])]
                .filter((v, i, a) => a.indexOf(v) === i)
                .slice(0, 5)
                .map((aroma, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {aroma}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Description */}
        {strain.description && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Beschreibung</p>
            <p className="text-sm line-clamp-3">{strain.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StrainCompareContent() {
  const searchParams = useSearchParams();
  const [selectedStrains, setSelectedStrains] = useState<Strain[]>([]);
  const [initialIds, setInitialIds] = useState<string[]>([]);

  // Parse initial strain IDs from URL
  useEffect(() => {
    const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];
    setInitialIds(ids);
  }, [searchParams]);

  // Fetch initial strains
  const { data: strain1 } = useStrain(initialIds[0] || null);
  const { data: strain2 } = useStrain(initialIds[1] || null);
  const { data: strain3 } = useStrain(initialIds[2] || null);
  const { data: strain4 } = useStrain(initialIds[3] || null);

  // Add initial strains when loaded
  useEffect(() => {
    const strains = [strain1, strain2, strain3, strain4].filter(Boolean) as Strain[];
    if (strains.length > 0 && selectedStrains.length === 0) {
      setSelectedStrains(strains);
    }
  }, [strain1, strain2, strain3, strain4]);

  const handleAddStrain = (strain: Strain) => {
    if (selectedStrains.length < MAX_COMPARE) {
      setSelectedStrains([...selectedStrains, strain]);
    }
  };

  const handleRemoveStrain = (id: string) => {
    setSelectedStrains(selectedStrains.filter((s) => s._id !== id));
  };

  const selectedIds = selectedStrains.map((s) => s._id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Scale className="h-8 w-8" />
            Strain-Vergleich
          </h1>
          <p className="text-muted-foreground">
            Vergleiche bis zu {MAX_COMPARE} Strains nebeneinander
          </p>
        </div>
      </div>

        {/* Strain Selector */}
        {selectedStrains.length < MAX_COMPARE && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Strain hinzufügen ({selectedStrains.length}/{MAX_COMPARE})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StrainSelector
                onSelect={handleAddStrain}
                excludeIds={selectedIds}
              />
            </CardContent>
          </Card>
        )}

        {/* Comparison Grid */}
        {selectedStrains.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Scale className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold mb-2">Keine Strains ausgewählt</h3>
              <p className="text-muted-foreground mb-4">
                Füge Strains hinzu, um sie zu vergleichen
              </p>
            </CardContent>
          </Card>
        ) : (
          <div
            className={cn(
              'grid gap-4',
              selectedStrains.length === 1 && 'grid-cols-1 max-w-md',
              selectedStrains.length === 2 && 'grid-cols-1 md:grid-cols-2',
              selectedStrains.length === 3 && 'grid-cols-1 md:grid-cols-3',
              selectedStrains.length === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
            )}
          >
            {selectedStrains.map((strain) => (
              <ComparisonCard
                key={strain._id}
                strain={strain}
                onRemove={() => handleRemoveStrain(strain._id)}
              />
            ))}
          </div>
        )}

        {/* Comparison Table (for 2+ strains) */}
        {selectedStrains.length >= 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Vergleichstabelle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Eigenschaft</th>
                      {selectedStrains.map((s) => (
                        <th key={s._id} className="text-left py-3 px-4 font-medium">
                          {s.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 px-4 text-muted-foreground">Typ</td>
                      {selectedStrains.map((s) => (
                        <td key={s._id} className="py-3 px-4">
                          <Badge className={typeColors[s.type]}>{s.type}</Badge>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4 text-muted-foreground">THC</td>
                      {selectedStrains.map((s) => (
                        <td key={s._id} className="py-3 px-4 font-medium">
                          {s.thc ? `${s.thc}%` : '-'}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4 text-muted-foreground">CBD</td>
                      {selectedStrains.map((s) => (
                        <td key={s._id} className="py-3 px-4 font-medium">
                          {s.cbd ? `${s.cbd}%` : '-'}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4 text-muted-foreground">Genetik</td>
                      {selectedStrains.map((s) => (
                        <td key={s._id} className="py-3 px-4">
                          {s.genetics || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4 text-muted-foreground">Effekte</td>
                      {selectedStrains.map((s) => (
                        <td key={s._id} className="py-3 px-4">
                          {s.effects?.slice(0, 3).join(', ') || '-'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-muted-foreground">Aromen</td>
                      {selectedStrains.map((s) => (
                        <td key={s._id} className="py-3 px-4">
                          {[...(s.aromas || []), ...(s.flavors || [])]
                            .filter((v, i, a) => a.indexOf(v) === i)
                            .slice(0, 3)
                            .join(', ') || '-'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

export default function StrainComparePage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <StrainCompareContent />
      </Suspense>
    </DashboardLayout>
  );
}

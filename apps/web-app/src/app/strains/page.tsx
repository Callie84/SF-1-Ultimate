// /apps/web-app/src/app/strains/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Leaf,
  Search,
  Scale,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStrains, Strain } from '@/hooks/use-strains';

const typeColors: Record<string, string> = {
  indica: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  sativa: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  hybrid: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  autoflower: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
};

export default function StrainsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  const { data, isLoading } = useStrains({
    page,
    limit: 20,
    search: search || undefined,
    type: type || undefined,
  });

  const strains = data?.strains || [];
  const pagination = data?.pagination;

  const toggleCompare = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter((s) => s !== id));
    } else if (selectedForCompare.length < 4) {
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  const handleCompare = () => {
    if (selectedForCompare.length >= 2) {
      router.push(`/strains/compare?ids=${selectedForCompare.join(',')}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Leaf className="h-8 w-8" />
              Strain-Datenbank
            </h1>
            <p className="text-muted-foreground">
              {pagination?.total || 0} Strains verfügbar
            </p>
          </div>
          <div className="flex gap-2">
            {selectedForCompare.length >= 2 && (
              <Button onClick={handleCompare}>
                <Scale className="h-4 w-4 mr-2" />
                {selectedForCompare.length} vergleichen
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/strains/compare">
                <Scale className="h-4 w-4 mr-2" />
                Vergleich
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Strain suchen..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Alle Typen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Alle Typen</SelectItem>
                  <SelectItem value="indica">Indica</SelectItem>
                  <SelectItem value="sativa">Sativa</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="autoflower">Autoflower</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Strains Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : strains.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Leaf className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold mb-2">Keine Strains gefunden</h3>
              <p className="text-muted-foreground">
                Versuche einen anderen Suchbegriff oder Filter
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {strains.map((strain) => {
                const isSelected = selectedForCompare.includes(strain._id);

                return (
                  <Card
                    key={strain._id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      isSelected && 'ring-2 ring-primary'
                    )}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        {strain.imageUrl ? (
                          <img
                            src={strain.imageUrl}
                            alt={strain.name}
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Leaf className="h-8 w-8 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold truncate">{strain.name}</h3>
                          <Badge className={cn('text-xs mt-1', typeColors[strain.type])}>
                            {strain.type}
                          </Badge>
                          {strain.genetics && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {strain.genetics}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        {strain.thc && (
                          <Badge variant="outline" className="text-xs">
                            THC: {strain.thc}%
                          </Badge>
                        )}
                        {strain.cbd && (
                          <Badge variant="outline" className="text-xs">
                            CBD: {strain.cbd}%
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCompare(strain._id);
                          }}
                          disabled={!isSelected && selectedForCompare.length >= 4}
                        >
                          {isSelected ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Ausgewählt
                            </>
                          ) : (
                            <>
                              <Scale className="h-4 w-4 mr-1" />
                              Vergleichen
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Seite {page} von {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.pages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

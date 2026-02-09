'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, TrendingDown, TrendingUp, ExternalLink, Filter,
  ChevronLeft, ChevronRight, Leaf, Loader2, Store, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface PriceEntry {
  seedbank: string;
  seedbankSlug: string;
  price: number;
  currency: string;
  seedCount: number;
  packSize: string;
  url: string;
  inStock: boolean;
}

interface SeedWithPrices {
  _id: string;
  name: string;
  slug: string;
  breeder: string;
  type: 'feminized' | 'autoflower' | 'regular';
  lowestPrice?: number;
  avgPrice?: number;
  priceCount: number;
  viewCount: number;
  prices: PriceEntry[];
}

const TYPE_LABELS: Record<string, string> = {
  feminized: 'Feminisiert',
  autoflower: 'Autoflower',
  regular: 'Regular',
};

const TYPE_COLORS: Record<string, string> = {
  feminized: 'bg-pink-500/10 text-pink-500',
  autoflower: 'bg-blue-500/10 text-blue-500',
  regular: 'bg-amber-500/10 text-amber-500',
};

export default function PricesPage() {
  const [query, setQuery] = useState('');
  const [seeds, setSeeds] = useState<SeedWithPrices[]>([]);
  const [total, setTotal] = useState(0);
  const [breeders, setBreeders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [expandedSeed, setExpandedSeed] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>('');
  const [filterBreeder, setFilterBreeder] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('price');

  const LIMIT = 24;

  const fetchSeeds = useCallback(async () => {
    setIsLoading(true);
    try {
      if (query.trim().length >= 2) {
        const params = new URLSearchParams({
          q: query.trim(),
          limit: String(LIMIT),
          skip: String(page * LIMIT),
        });
        if (filterType) params.set('type', filterType);
        if (filterBreeder) params.set('breeder', filterBreeder);

        const response = await apiClient.get(`/api/prices/search?${params}`);
        setSeeds(response.seeds || []);
        setTotal(response.total || 0);
      } else {
        const params = new URLSearchParams({
          limit: String(LIMIT),
          skip: String(page * LIMIT),
          sort: sortBy,
        });
        if (filterType) params.set('type', filterType);
        if (filterBreeder) params.set('breeder', filterBreeder);

        const response = await apiClient.get(`/api/prices/browse?${params}`);
        setSeeds(response.seeds || []);
        setTotal(response.total || 0);
        if (response.breeders) setBreeders(response.breeders);
      }
    } catch (error) {
      console.error('Failed to fetch seeds:', error);
    } finally {
      setIsLoading(false);
    }
  }, [query, page, filterType, filterBreeder, sortBy]);

  useEffect(() => {
    fetchSeeds();
  }, [fetchSeeds]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [query, filterType, filterBreeder, sortBy]);

  const totalPages = Math.ceil(total / LIMIT);

  const cheapestSeed = seeds.length > 0
    ? seeds.reduce((min, s) => (s.lowestPrice && (!min.lowestPrice || s.lowestPrice < min.lowestPrice) ? s : min), seeds[0])
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <TrendingDown className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Preisvergleich</h1>
        </div>
        <p className="text-muted-foreground">
          Vergleiche Preise von {total} Seeds aus {breeders.length} Seedbanks
        </p>
      </div>

      {/* Search */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Strain oder Seedbank suchen..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Filter className="h-4 w-4 text-muted-foreground" />

          {/* Type filter */}
          <Button
            variant={filterType === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('')}
          >
            Alle
          </Button>
          {['feminized', 'autoflower', 'regular'].map((type) => (
            <Button
              key={type}
              variant={filterType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType(filterType === type ? '' : type)}
            >
              {TYPE_LABELS[type]}
            </Button>
          ))}

          <div className="h-4 w-px bg-border mx-1" />

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="price">Preis aufsteigend</option>
            <option value="price_desc">Preis absteigend</option>
            <option value="name">Name A-Z</option>
            <option value="popular">Beliebtheit</option>
          </select>

          {/* Breeder filter */}
          {breeders.length > 0 && (
            <select
              value={filterBreeder}
              onChange={(e) => setFilterBreeder(e.target.value)}
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Alle Seedbanks</option>
              {breeders.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {!isLoading && seeds.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card p-3 text-center">
            <div className="text-xl font-bold text-primary">{total}</div>
            <div className="text-xs text-muted-foreground">Seeds gefunden</div>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <div className="text-xl font-bold">{breeders.length}</div>
            <div className="text-xs text-muted-foreground">Seedbanks</div>
          </div>
          {cheapestSeed && cheapestSeed.lowestPrice && (
            <div className="rounded-xl border bg-card p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingDown className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xl font-bold text-green-500">
                  {cheapestSeed.lowestPrice.toFixed(2)}€
                </span>
              </div>
              <div className="text-xs text-muted-foreground truncate">{cheapestSeed.name}</div>
            </div>
          )}
          <div className="rounded-xl border bg-card p-3 text-center">
            <div className="text-xl font-bold">
              {seeds.reduce((sum, s) => sum + (s.prices?.length || 0), 0)}
            </div>
            <div className="text-xs text-muted-foreground">Preisangebote</div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Lade Preisdaten...</p>
        </div>
      )}

      {/* Seed Cards Grid */}
      {!isLoading && seeds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {seeds.map((seed) => (
            <div
              key={seed._id}
              className={cn(
                'rounded-xl border bg-card overflow-hidden transition-all hover:border-primary/50',
                expandedSeed === seed._id && 'ring-2 ring-primary/20'
              )}
            >
              {/* Card Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedSeed(expandedSeed === seed._id ? null : seed._id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight truncate">
                      {seed.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Store className="h-3 w-3" />
                      {seed.breeder}
                    </p>
                  </div>
                  {seed.lowestPrice && (
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="text-lg font-bold text-primary">
                        {seed.lowestPrice.toFixed(2)}€
                      </div>
                      <div className="text-[10px] text-muted-foreground">ab</div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                    TYPE_COLORS[seed.type] || 'bg-muted text-muted-foreground'
                  )}>
                    {TYPE_LABELS[seed.type] || seed.type}
                  </span>
                  {seed.prices && seed.prices.length > 0 && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Package className="h-3 w-3" />
                      {seed.prices.length} {seed.prices.length === 1 ? 'Angebot' : 'Angebote'}
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded: Show all prices */}
              {expandedSeed === seed._id && seed.prices && seed.prices.length > 0 && (
                <div className="border-t bg-muted/30">
                  {seed.prices.map((price, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-center justify-between px-4 py-2.5',
                        idx > 0 && 'border-t border-border/50'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{price.seedbank}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {price.packSize || `${price.seedCount} Seeds`}
                          </span>
                          {price.inStock ? (
                            <span className="text-[10px] text-green-500 font-medium">Verfügbar</span>
                          ) : (
                            <span className="text-[10px] text-red-500 font-medium">Ausverkauft</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-bold">{price.price.toFixed(2)}€</div>
                          {price.seedCount > 1 && (
                            <div className="text-[10px] text-muted-foreground">
                              {(price.price / price.seedCount).toFixed(2)}€/Seed
                            </div>
                          )}
                        </div>
                        {price.url && (
                          <a
                            href={price.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Shop
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick action: best price link */}
              {expandedSeed !== seed._id && seed.prices && seed.prices[0]?.url && (
                <div className="border-t px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Bestes Angebot: {seed.prices[0].seedbank}
                  </span>
                  <a
                    href={seed.prices[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                  >
                    Zum Shop <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && seeds.length === 0 && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Leaf className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Keine Seeds gefunden</h3>
          <p className="text-sm text-muted-foreground">
            {query
              ? 'Versuche es mit einem anderen Suchbegriff'
              : 'Es sind noch keine Preisdaten verfügbar'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Zurück
          </Button>
          <span className="text-sm text-muted-foreground">
            Seite {page + 1} von {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            Weiter
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

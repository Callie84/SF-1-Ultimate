'use client';

import { useState } from 'react';
import { Search, TrendingDown, TrendingUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface PriceData {
  strainName: string;
  seedbank: string;
  price: number;
  currency: string;
  seedCount: number;
  url: string;
  inStock: boolean;
}

export default function PricesPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PriceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'seedbank'>('price');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/api/prices/search?q=${encodeURIComponent(query)}`);
      setResults(response.prices || response.seeds || []);
    } catch (error) {
      console.error('Price search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === 'price') {
      const priceA = a.price / a.seedCount;
      const priceB = b.price / b.seedCount;
      return priceA - priceB;
    }
    return a.seedbank.localeCompare(b.seedbank);
  });

  const cheapest = sortedResults[0];
  const mostExpensive = sortedResults[sortedResults.length - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <TrendingDown className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Preisvergleich</h1>
        </div>
        <p className="text-muted-foreground">
          Finde die besten Preise fur deine Lieblings-Strains
        </p>
      </div>

      {/* Search */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Suche nach Strain... (z.B. 'Northern Lights')"
              className="pl-10"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={!query.trim() || isLoading}
          >
            {isLoading ? 'Suche...' : 'Suchen'}
          </Button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border bg-card p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {results.length}
              </div>
              <div className="text-sm text-muted-foreground">Angebote gefunden</div>
            </div>
            {cheapest && (
              <div className="rounded-xl border bg-card p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <TrendingDown className="h-4 w-4 text-green-500" />
                  <span className="text-2xl font-bold text-green-500">
                    €{(cheapest.price / cheapest.seedCount).toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">Gunstigster Preis/Seed</div>
              </div>
            )}
            {mostExpensive && (
              <div className="rounded-xl border bg-card p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <TrendingUp className="h-4 w-4 text-red-500" />
                  <span className="text-2xl font-bold text-red-500">
                    €{(mostExpensive.price / mostExpensive.seedCount).toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">Teuerster Preis/Seed</div>
              </div>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Alle Angebote</h3>
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'price' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('price')}
              >
                Nach Preis
              </Button>
              <Button
                variant={sortBy === 'seedbank' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('seedbank')}
              >
                Nach Seedbank
              </Button>
            </div>
          </div>

          {/* Price Cards */}
          <div className="space-y-3">
            {sortedResults.map((price, index) => (
              <div key={index} className="rounded-xl border bg-card p-4 hover:border-primary/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold mb-1">{price.seedbank}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {price.strainName}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {price.seedCount} Seeds
                      </span>
                      {price.inStock ? (
                        <span className="text-xs font-medium text-green-500">✓ Verfugbar</span>
                      ) : (
                        <span className="text-xs font-medium text-red-500">✗ Ausverkauft</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-2xl font-bold mb-0.5">
                      €{price.price.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      €{(price.price / price.seedCount).toFixed(2)}/Seed
                    </div>
                    <a
                      href={price.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Zum Shop
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty State */}
      {!isLoading && results.length === 0 && query && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Keine Ergebnisse</h3>
          <p className="text-sm text-muted-foreground">
            Versuche es mit einem anderen Strain-Namen
          </p>
        </div>
      )}

      {/* Initial State */}
      {results.length === 0 && !query && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Starte deine Suche</h3>
          <p className="text-sm text-muted-foreground">
            Gib einen Strain-Namen ein, um Preise zu vergleichen
          </p>
        </div>
      )}
    </div>
  );
}

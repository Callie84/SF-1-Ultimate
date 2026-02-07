'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, X, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchFilters } from '@/components/search/search-filters';
import { SearchResults } from '@/components/search/search-results';
import type { SearchResponse, SearchResult, SearchFilters as SearchFiltersType } from '@/types/search';

// API Response Type (was die API tatsaechlich zurueckgibt)
interface ApiSearchResult {
  hits: any[];
  totalHits: number;
  processingTimeMs: number;
  query: string;
  limit: number;
  offset: number;
}

interface ApiSearchResponse {
  strains?: ApiSearchResult;
  threads?: ApiSearchResult;
  grows?: ApiSearchResult;
  users?: ApiSearchResult;
}

// Transform API response to frontend format
function transformApiResponse(apiResponse: ApiSearchResponse, searchQuery: string): SearchResponse {
  const results: SearchResult[] = [];
  let totalHits = 0;
  let totalTime = 0;

  // Strains transformieren
  if (apiResponse.strains?.hits) {
    totalHits += apiResponse.strains.totalHits;
    totalTime += apiResponse.strains.processingTimeMs;
    apiResponse.strains.hits.forEach((hit: any) => {
      results.push({
        id: hit.id || hit._id,
        type: 'STRAIN',
        title: hit.name,
        description: hit.description?.substring(0, 200),
        imageUrl: hit.imageUrl,
        url: `/strains/${hit.slug || hit.id}`,
        metadata: { thc: hit.thc, cbd: hit.cbd, type: hit.type },
        score: 1,
      });
    });
  }

  // Threads transformieren
  if (apiResponse.threads?.hits) {
    totalHits += apiResponse.threads.totalHits;
    totalTime += apiResponse.threads.processingTimeMs;
    apiResponse.threads.hits.forEach((hit: any) => {
      results.push({
        id: hit.id || hit._id,
        type: 'THREAD',
        title: hit.title,
        description: hit.content?.substring(0, 200),
        url: `/community/thread/${hit.id || hit._id}`,
        metadata: { replies: hit.replyCount, views: hit.viewCount },
        score: 1,
      });
    });
  }

  // Grows transformieren
  if (apiResponse.grows?.hits) {
    totalHits += apiResponse.grows.totalHits;
    totalTime += apiResponse.grows.processingTimeMs;
    apiResponse.grows.hits.forEach((hit: any) => {
      results.push({
        id: hit.id || hit._id,
        type: 'GROW',
        title: hit.title || hit.name,
        description: hit.description?.substring(0, 200),
        imageUrl: hit.coverImage,
        url: `/journal/${hit.id || hit._id}`,
        metadata: { strain: hit.strain },
        score: 1,
      });
    });
  }

  // Users transformieren
  if (apiResponse.users?.hits) {
    totalHits += apiResponse.users.totalHits;
    totalTime += apiResponse.users.processingTimeMs;
    apiResponse.users.hits.forEach((hit: any) => {
      results.push({
        id: hit.id || hit._id,
        type: 'USER',
        title: hit.username || hit.name,
        description: hit.bio?.substring(0, 200),
        imageUrl: hit.avatar,
        url: `/profile/${hit.username || hit.id}`,
        metadata: { level: hit.level },
        score: 1,
      });
    });
  }

  return {
    results,
    total: totalHits,
    query: searchQuery,
    took: totalTime,
    facets: {
      types: {
        STRAIN: apiResponse.strains?.totalHits || 0,
        THREAD: apiResponse.threads?.totalHits || 0,
        GROW: apiResponse.grows?.totalHits || 0,
        USER: apiResponse.users?.totalHits || 0,
      }
    }
  };
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFiltersType>({});
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'relevance' | 'date'>('relevance');

  // Perform search
  const performSearch = async (searchQuery: string, currentFilters: SearchFiltersType, currentPage: number) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: '20',
      });

      const response: ApiSearchResponse = await apiClient.get(`/api/search?${params.toString()}`);
      const transformedResults = transformApiResponse(response, searchQuery);
      setResults(transformedResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial search when query changes
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      setPage(1);
      performSearch(q, filters, 1);
    }
  }, [searchParams]);

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  // Handle filter change
  const handleFilterChange = (newFilters: SearchFiltersType) => {
    setFilters(newFilters);
    setPage(1);
    performSearch(query, newFilters, 1);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    performSearch(query, filters, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle sort change
  const handleSortChange = (newSort: 'relevance' | 'date') => {
    setSortBy(newSort);
    setPage(1);
    performSearch(query, filters, 1);
  };

  const totalPages = results?.total ? Math.ceil(results.total / 20) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Search className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Suche</h1>
        </div>
        <p className="text-muted-foreground">
          Suche nach Strains, Forum-Threads, Grow-Tagebuchern oder Usern
        </p>
      </div>

      {/* Search Bar */}
      <div className="rounded-xl border bg-card p-6">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suche nach Strains, Threads, Grows, Usern..."
              className="pl-10"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="submit" disabled={!query.trim()}>
            Suchen
          </Button>
          <Button
            type="button"
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </form>

        {/* Results Info */}
        {results && typeof results.total === 'number' && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">{results.total.toLocaleString()}</span> Ergebnisse
              fur <span className="font-medium text-foreground">"{results.query || query}"</span>
              {results.took && <span className="ml-2">({results.took}ms)</span>}
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <span>Sortieren:</span>
              <Button
                variant={sortBy === 'relevance' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleSortChange('relevance')}
              >
                Relevanz
              </Button>
              <Button
                variant={sortBy === 'date' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleSortChange('date')}
              >
                Datum
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex gap-6">
        {/* Filters Sidebar */}
        {showFilters && (
          <aside className="w-64 flex-shrink-0">
            <SearchFilters
              filters={filters}
              facets={results?.facets}
              onChange={handleFilterChange}
            />
          </aside>
        )}

        {/* Results */}
        <main className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : results ? (
            <>
              <SearchResults results={results.results || []} />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                  >
                    Zuruck
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 7) {
                        pageNum = i + 1;
                      } else if (page <= 4) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 3) {
                        pageNum = totalPages - 6 + i;
                      } else {
                        pageNum = page - 3 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                  >
                    Weiter
                  </Button>
                </div>
              )}
            </>
          ) : query ? (
            <div className="rounded-xl border bg-card py-16 text-center">
              <Search className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <h3 className="mt-3 font-semibold">Keine Ergebnisse gefunden</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Versuche es mit anderen Suchbegriffen
              </p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card py-16 text-center">
              <Search className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <h3 className="mt-3 font-semibold">Starte deine Suche</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Suche nach Strains, Forum-Threads, Grow-Tagebuchern oder Usern
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

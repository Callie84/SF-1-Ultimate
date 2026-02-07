'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { apiClient } from '@/lib/api-client';
import type { SearchResult } from '@/types/search';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load recent & popular searches
  useEffect(() => {
    const loadSearchData = async () => {
      try {
        const [recent, popular] = await Promise.all([
          apiClient.get('/api/search/history/recent'),
          apiClient.get('/api/search/popular')
        ]);
        setRecentSearches(recent.searches || []);
        setPopularSearches(popular.searches || []);
      } catch (error) {
        console.error('Failed to load search data:', error);
      }
    };
    loadSearchData();
  }, []);

  // Fetch suggestions
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(
          `/api/search/strains/suggest?q=${encodeURIComponent(debouncedQuery)}&limit=5`
        );
        setSuggestions(response.results || []);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  // Handle search submit
  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    // Add to recent searches
    const recent = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(recent);
    localStorage.setItem('recentSearches', JSON.stringify(recent));

    // Navigate to search results
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    setIsOpen(false);
    setQuery('');
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen) {
      if (e.key === 'Enter') {
        handleSearch(query);
      }
      return;
    }

    const items = query.length >= 2 ? suggestions : [...recentSearches, ...popularSearches];

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < items.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && items[selectedIndex]) {
        const selected = typeof items[selectedIndex] === 'string' 
          ? items[selectedIndex] 
          : (items[selectedIndex] as SearchResult).title;
        handleSearch(selected);
      } else {
        handleSearch(query);
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  return (
    <div className={cn('relative w-full max-w-2xl', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Suche nach Strains, Threads, Grows, Usern..."
          className="w-full rounded-lg border bg-background py-2 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {/* Clear Button */}
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full z-50 mt-2 w-full rounded-lg border bg-popover shadow-lg"
        >
          {query.length >= 2 ? (
            // Suggestions
            <div className="max-h-96 overflow-y-auto">
              {suggestions.length > 0 ? (
                <div className="p-2">
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    Vorschläge
                  </div>
                  {suggestions.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => handleSearch(result.title)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent',
                        selectedIndex === index && 'bg-accent'
                      )}
                    >
                      {result.imageUrl && (
                        <img
                          src={result.imageUrl}
                          alt={result.title}
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{result.title}</div>
                        {result.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {result.description}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {result.type}
                      </div>
                    </button>
                  ))}
                </div>
              ) : !isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Keine Ergebnisse gefunden
                </div>
              ) : null}
            </div>
          ) : (
            // Recent & Popular Searches
            <div className="max-h-96 overflow-y-auto p-2">
              {recentSearches.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Kürzlich gesucht
                  </div>
                  {recentSearches.map((search, index) => (
                    <button
                      key={`recent-${index}`}
                      onClick={() => handleSearch(search)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent',
                        selectedIndex === index && 'bg-accent'
                      )}
                    >
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{search}</span>
                    </button>
                  ))}
                </div>
              )}

              {popularSearches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    Beliebt
                  </div>
                  {popularSearches.slice(0, 5).map((search, index) => (
                    <button
                      key={`popular-${index}`}
                      onClick={() => handleSearch(search)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent',
                        selectedIndex === recentSearches.length + index && 'bg-accent'
                      )}
                    >
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{search}</span>
                    </button>
                  ))}
                </div>
              )}

              {recentSearches.length === 0 && popularSearches.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Starte deine erste Suche
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

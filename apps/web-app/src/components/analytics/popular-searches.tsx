// /apps/web-app/src/components/analytics/popular-searches.tsx
'use client';

import { cn } from '@/lib/utils';

interface PopularSearch {
  query: string;
  count: number;
}

interface PopularSearchesProps {
  searches: PopularSearch[];
  totalSearches?: number;
  className?: string;
}

export function PopularSearches({ searches, totalSearches, className }: PopularSearchesProps) {
  const maxCount = searches[0]?.count || 1;

  return (
    <div className={cn("bg-card rounded-lg border p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Beliebte Suchen</h3>
        {totalSearches !== undefined && (
          <span className="text-sm text-muted-foreground">
            {totalSearches.toLocaleString('de-DE')} gesamt
          </span>
        )}
      </div>

      {searches.length === 0 ? (
        <p className="text-muted-foreground text-sm">Keine Suchdaten verfügbar</p>
      ) : (
        <div className="space-y-3">
          {searches.slice(0, 10).map((search, index) => (
            <div key={search.query} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-5">{index + 1}.</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">{search.query}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {search.count}x
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(search.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

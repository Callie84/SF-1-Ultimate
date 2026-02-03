'use client';

import Link from 'next/link';
import { MessageSquare, Heart, Eye, Calendar, User, Sprout, Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { SearchResult } from '@/types/search';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface SearchResultsProps {
  results: SearchResult[];
}

export function SearchResults({ results }: SearchResultsProps) {
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <ResultCard key={result.id} result={result} />
      ))}
    </div>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  const href = result.url;

  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            {/* Image */}
            {result.imageUrl && (
              <img
                src={result.imageUrl}
                alt={result.title}
                className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
              />
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <ResultTypeIcon type={result.type} />
                    <span className="text-xs font-medium text-primary">
                      {getTypeLabel(result.type)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold line-clamp-2 hover:text-primary">
                    {result.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="font-mono">
                    {Math.round(result.score * 100)}%
                  </span>
                </div>
              </div>

              {result.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {result.description}
                </p>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Metadata */}
        {result.metadata && (
          <CardContent className="pt-0">
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {result.type === 'STRAIN' && (
                <>
                  {result.metadata.genetics && (
                    <div className="flex items-center gap-1">
                      <Sprout className="h-3 w-3" />
                      <span>{result.metadata.genetics}</span>
                    </div>
                  )}
                  {result.metadata.thc && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">THC:</span>
                      <span>{result.metadata.thc}</span>
                    </div>
                  )}
                  {result.metadata.breeder && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{result.metadata.breeder}</span>
                    </div>
                  )}
                </>
              )}

              {result.type === 'THREAD' && (
                <>
                  {result.metadata.category && (
                    <div className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                      {result.metadata.category}
                    </div>
                  )}
                  {result.metadata.replyCount !== undefined && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{result.metadata.replyCount} Antworten</span>
                    </div>
                  )}
                  {result.metadata.votes !== undefined && (
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      <span>{result.metadata.votes}</span>
                    </div>
                  )}
                  {result.metadata.author && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{result.metadata.author}</span>
                    </div>
                  )}
                  {result.metadata.createdAt && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(result.metadata.createdAt), {
                          locale: de,
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  )}
                </>
              )}

              {result.type === 'GROW' && (
                <>
                  {result.metadata.strain && (
                    <div className="flex items-center gap-1">
                      <Sprout className="h-3 w-3" />
                      <span>{result.metadata.strain}</span>
                    </div>
                  )}
                  {result.metadata.phase && (
                    <div className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                      {result.metadata.phase}
                    </div>
                  )}
                  {result.metadata.daysSinceStart !== undefined && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Tag {result.metadata.daysSinceStart}</span>
                    </div>
                  )}
                  {result.metadata.author && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{result.metadata.author}</span>
                    </div>
                  )}
                  {result.metadata.views !== undefined && (
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{result.metadata.views}</span>
                    </div>
                  )}
                </>
              )}

              {result.type === 'USER' && (
                <>
                  {result.metadata.level && (
                    <div className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                      Level {result.metadata.level}
                    </div>
                  )}
                  {result.metadata.growCount !== undefined && (
                    <div className="flex items-center gap-1">
                      <Sprout className="h-3 w-3" />
                      <span>{result.metadata.growCount} Grows</span>
                    </div>
                  )}
                  {result.metadata.postCount !== undefined && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{result.metadata.postCount} Posts</span>
                    </div>
                  )}
                  {result.metadata.joinedAt && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Dabei seit {formatDistanceToNow(new Date(result.metadata.joinedAt), {
                          locale: de,
                        })}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}

function ResultTypeIcon({ type }: { type: SearchResult['type'] }) {
  switch (type) {
    case 'STRAIN':
      return <Sprout className="h-4 w-4 text-green-500" />;
    case 'THREAD':
      return <MessageSquare className="h-4 w-4 text-blue-500" />;
    case 'GROW':
      return <Sprout className="h-4 w-4 text-purple-500" />;
    case 'USER':
      return <Users className="h-4 w-4 text-orange-500" />;
    default:
      return null;
  }
}

function getTypeLabel(type: SearchResult['type']): string {
  switch (type) {
    case 'STRAIN':
      return 'Strain';
    case 'THREAD':
      return 'Forum-Thread';
    case 'GROW':
      return 'Grow-Tagebuch';
    case 'USER':
      return 'User';
    default:
      return type;
  }
}

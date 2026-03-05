'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, Loader2, MessageSquare, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils';

// Seedbank display metadata
const SEEDBANK_META: Record<string, { website: string; description: string; country: string }> = {
  'fastbuds':          { website: 'fastbuds.com',           description: 'Spezialist für Autoflower-Strains', country: '🇪🇸' },
  'zamnesia':          { website: 'zamnesia.com',            description: 'Großer europäischer Seedshop', country: '🇳🇱' },
  'weed-seed-shop':    { website: 'weedseedshop.com',        description: 'Europäischer Seed-Anbieter', country: '🇳🇱' },
  'sensi-seeds':       { website: 'sensiseeds.com',          description: 'Einer der ältesten Seedbanks weltweit', country: '🇳🇱' },
  'dutch-passion':     { website: 'dutch-passion.com',       description: 'Pioniere seit 1987', country: '🇳🇱' },
  'seedsman':          { website: 'seedsman.com',            description: 'Riesige Auswahl aus aller Welt', country: '🇬🇧' },
  'royal-queen-seeds': { website: 'royalqueenseeds.de',      description: 'Premium-Strains aus Spanien', country: '🇪🇸' },
  'greenhouse-seeds':  { website: 'greenhouse-seeds.com',    description: 'Legendäre Genetics seit 1985', country: '🇳🇱' },
  'paradise-seeds':    { website: 'paradise-seeds.com',      description: 'Qualität aus Amsterdam', country: '🇳🇱' },
  'anesia-seeds':      { website: 'anesia-seeds.com',        description: 'Hochwertige europäische Genetics', country: '🇩🇪' },
  'mr-hanf':           { website: 'mr-hanf.com',             description: 'Deutscher Hanf-Spezialist', country: '🇩🇪' },
};

interface SeedbankInfo {
  slug: string;
  name: string;
}

interface ReviewRatings {
  [slug: string]: { avgRating: number; count: number };
}

interface Review {
  _id: string;
  userId: string;
  username: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

// Star rating component
function StarRating({
  rating,
  onRate,
  readonly = false,
  size = 'md',
}: {
  rating: number;
  onRate?: (r: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md';
}) {
  const [hovered, setHovered] = useState(0);
  const sz = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={readonly ? 'cursor-default' : 'cursor-pointer'}
        >
          <Star
            className={`${sz} transition-colors ${
              (hovered || rating) >= star
                ? 'fill-amber-400 text-amber-400'
                : 'fill-muted text-muted-foreground'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// Individual seedbank card with reviews
function SeedbankCard({
  seedbank,
  avgRating,
  reviewCount,
}: {
  seedbank: SeedbankInfo;
  avgRating?: number;
  reviewCount?: number;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');

  const meta = SEEDBANK_META[seedbank.slug];

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['seedbank-reviews', seedbank.slug],
    queryFn: () => api.get<{ reviews: Review[]; count: number; avgRating: number | null }>(
      `/api/community/seedbank-reviews/${seedbank.slug}`
    ),
    enabled: isExpanded,
    staleTime: 60_000,
  });

  const submitReview = useMutation({
    mutationFn: (data: { rating: number; comment: string; username: string }) =>
      api.post(`/api/community/seedbank-reviews/${seedbank.slug}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seedbank-reviews', seedbank.slug] });
      queryClient.invalidateQueries({ queryKey: ['seedbank-ratings'] });
      toast.success('Bewertung gespeichert!');
      setUserRating(0);
      setComment('');
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const deleteReview = useMutation({
    mutationFn: () => api.delete(`/api/community/seedbank-reviews/${seedbank.slug}/my`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seedbank-reviews', seedbank.slug] });
      queryClient.invalidateQueries({ queryKey: ['seedbank-ratings'] });
      toast.success('Bewertung gelöscht');
    },
  });

  const reviews = (reviewsData as any)?.reviews || [];
  const localAvg = (reviewsData as any)?.avgRating;
  const displayAvg = localAvg ?? avgRating;
  const displayCount = (reviewsData as any)?.count ?? reviewCount ?? 0;
  const myReview = user ? reviews.find((r: Review) => r.userId === user.id) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg">{meta?.country}</span>
              <CardTitle className="text-lg">{seedbank.name}</CardTitle>
            </div>
            {meta?.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{meta.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {displayAvg ? (
                <div className="flex items-center gap-1.5">
                  <StarRating rating={Math.round(displayAvg)} readonly size="sm" />
                  <span className="text-sm font-medium">{displayAvg.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({displayCount} Bewertungen)</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" />
                  Noch keine Bewertungen
                </span>
              )}
              {meta?.website && (
                <a
                  href={`https://${meta.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {meta.website}
                </a>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0"
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Bewertungen
            {isExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          <div className="border-t pt-4">
            {/* Write review */}
            {user ? (
              <div className="space-y-3 mb-4">
                <p className="text-sm font-medium">
                  {myReview ? 'Deine Bewertung bearbeiten:' : 'Seedbank bewerten:'}
                </p>
                {myReview && (
                  <div className="rounded-md bg-primary/5 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StarRating rating={myReview.rating} readonly size="sm" />
                        <span className="text-xs text-muted-foreground">Deine aktuelle Bewertung</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-destructive hover:text-destructive"
                        onClick={() => deleteReview.mutate()}
                        disabled={deleteReview.isPending}
                      >
                        Löschen
                      </Button>
                    </div>
                    {myReview.comment && <p className="text-xs text-muted-foreground mt-1">{myReview.comment}</p>}
                  </div>
                )}
                <StarRating
                  rating={userRating || myReview?.rating || 0}
                  onRate={setUserRating}
                />
                <Textarea
                  placeholder="Kommentar (optional)..."
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  disabled={(userRating === 0 && !myReview) || submitReview.isPending}
                  onClick={() => {
                    const rating = userRating || myReview?.rating;
                    if (!rating) return;
                    submitReview.mutate({
                      rating,
                      comment,
                      username: user.username || user.email?.split('@')[0] || 'User',
                    });
                  }}
                >
                  {submitReview.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Speichere...</>
                  ) : myReview ? 'Aktualisieren' : 'Bewertung abgeben'}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">
                <a href="/auth/login" className="underline hover:text-foreground">Einloggen</a> um zu bewerten
              </p>
            )}

            {/* Reviews list */}
            {reviewsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">
                Noch keine Bewertungen — sei der Erste!
              </p>
            ) : (
              <div className="space-y-3">
                {reviews.map((review: Review) => (
                  <div key={review._id} className="flex gap-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-medium">
                      {review.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{review.username}</span>
                        <StarRating rating={review.rating} readonly size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(new Date(review.createdAt))}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground mt-0.5">{review.comment}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function SeedbanksPage() {
  // Fetch seedbank list from price-service
  const { data: seedbanksData, isLoading: seedbanksLoading } = useQuery({
    queryKey: ['seedbanks-list'],
    queryFn: () => api.get<{ seedbanks: SeedbankInfo[] }>('/api/prices/seedbanks'),
    staleTime: 10 * 60_000,
  });

  // Fetch all ratings in one call
  const { data: ratingsData } = useQuery({
    queryKey: ['seedbank-ratings'],
    queryFn: () => api.get<{ ratings: ReviewRatings }>('/api/community/seedbank-reviews'),
    staleTime: 60_000,
  });

  const seedbanks = (seedbanksData as any)?.seedbanks || [];
  const ratings = (ratingsData as any)?.ratings || {};

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Seedbank-Bewertungen</h1>
          <p className="text-muted-foreground">
            Community-Bewertungen für alle Seedbanks — teile deine Erfahrungen
          </p>
        </div>

        {seedbanksLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {seedbanks.map((sb: SeedbankInfo) => (
              <SeedbankCard
                key={sb.slug}
                seedbank={sb}
                avgRating={ratings[sb.slug]?.avgRating}
                reviewCount={ratings[sb.slug]?.count}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

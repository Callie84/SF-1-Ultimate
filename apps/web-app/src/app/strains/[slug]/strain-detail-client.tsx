'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ShareButtons } from '@/components/share-buttons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Leaf, ExternalLink, ShoppingCart, Star, Sprout, Eye, Heart, MessageSquare, Home, Sun } from 'lucide-react';
import { useStrain } from '@/hooks/use-strains';
import { useAuth } from '@/components/providers/auth-provider';
import { useStrainFeed, useGrowReactions, useLikeGrow } from '@/hooks/use-journal';
import { api } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { typeLabel, climateLabel, seedTypeLabel, effectLabel, flavorLabel, aromaLabel, terpeneLabel } from '@/lib/strain-labels';
import { trackStrainViewed } from '@/lib/analytics';
import { PriceHistoryChart } from '@/components/prices/price-history-chart';

const typeColors: Record<string, string> = {
  indica: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  sativa: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  hybrid: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  autoflower: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
};

interface SeedPrice {
  seedbank: string;
  seedbankSlug: string;
  price: number;
  currency: string;
  seedCount: number;
  packSize: string;
  url: string;
  inStock: boolean;
}

interface SeedResult {
  _id: string;
  name: string;
  slug: string;
  breeder: string;
  type: string;
  imageUrl?: string;
  prices: SeedPrice[];
}

interface Review {
  _id: string;
  userId: string;
  username: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

function StarRating({
  rating,
  onRate,
  readonly = false,
}: {
  rating: number;
  onRate?: (r: number) => void;
  readonly?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={cn('h-5 w-5 transition-colors', readonly ? 'cursor-default' : 'cursor-pointer')}
        >
          <Star
            className={cn(
              'h-5 w-5',
              (hovered || rating) >= star
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function StrainDetailClient({ slug }: { slug: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');

  const { data: strain, isLoading: strainLoading } = useStrain(slug);

  useEffect(() => {
    if (slug) trackStrainViewed(slug);
  }, [slug]);

  const { data: seedsData, isLoading: seedsLoading } = useQuery({
    queryKey: ['seed-prices', strain?.name],
    queryFn: () =>
      api.get<{ seeds: SeedResult[] }>(
        `/api/prices/search?q=${encodeURIComponent(strain!.name)}&limit=20`
      ),
    enabled: !!strain?.name,
    staleTime: 5 * 60 * 1000,
  });

  const strainGrowFeed = useStrainFeed(strain?._id);
  const strainGrows = strainGrowFeed.data?.pages.flatMap(p => p.grows) ?? [];

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['strain-reviews', slug],
    queryFn: () =>
      api.get<{ reviews: Review[]; count: number; avgRating: number | null }>(
        `/api/community/strains/${slug}/reviews`
      ),
    staleTime: 2 * 60 * 1000,
  });

  const submitReview = useMutation({
    mutationFn: (data: { rating: number; comment: string; username: string }) =>
      api.post(`/api/community/strains/${slug}/reviews`, data),
    onSuccess: () => {
      toast.success('Bewertung gespeichert!');
      queryClient.invalidateQueries({ queryKey: ['strain-reviews', slug] });
      setUserComment('');
      setUserRating(0);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Fehler beim Speichern der Bewertung');
    },
  });

  if (strainLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Lade Strain-Daten...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!strain) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <Leaf className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-bold mb-2">Strain nicht gefunden</h3>
          <Button asChild>
            <Link href="/strains">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zur Übersicht
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const terpenes = strain.terpenes
    ? Object.entries(strain.terpenes).sort((a, b) => b[1] - a[1])
    : [];

  const priceEntries = (seedsData?.seeds || [])
    .flatMap((seed) => seed.prices.map((price) => ({ seed, price })))
    .sort((a, b) => a.price.price - b.price.price);

  const reviews = reviewsData?.reviews || [];
  const avgRating = reviewsData?.avgRating;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <Link
          href="/strains"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zur Strain-Datenbank
        </Link>

        {/* Hero */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
          {strain.imageUrl ? (
            <Image
              src={strain.imageUrl}
              alt={strain.name}
              width={128}
              height={128}
              className="h-24 w-24 sm:h-32 sm:w-32 rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Leaf className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{strain.name}</h1>
            {strain.genetics && (
              <p className="text-muted-foreground mt-1">{strain.genetics}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge className={cn(typeColors[strain.type] || '')}>{typeLabel(strain.type)}</Badge>
              {strain.seedType && <Badge variant="secondary">{seedTypeLabel(strain.seedType)}</Badge>}
              {strain.floweringTime && <Badge variant="outline">🌸 {strain.floweringTime} Tage</Badge>}
              {strain.climate && <Badge variant="outline">{climateLabel(strain.climate)}</Badge>}
              {strain.cbdRich != null && <Badge variant="outline">{strain.cbdRich ? 'CBD-reich' : 'THC-dominant'}</Badge>}
              {strain.thc != null && <Badge variant="outline">THC: {strain.thc}%</Badge>}
              {strain.cbd != null && <Badge variant="outline">CBD: {strain.cbd}%</Badge>}
              {strain.cbg != null && <Badge variant="outline">CBG: {strain.cbg}%</Badge>}
            </div>
            {avgRating != null && (
              <div className="flex items-center gap-2 mt-2">
                <StarRating rating={Math.round(avgRating)} readonly />
                <span className="text-sm text-muted-foreground">
                  {avgRating.toFixed(1)} ({reviewsData?.count} Bewertungen)
                </span>
              </div>
            )}
            <ShareButtons
              title={`${strain.name} — Cannabis Strain auf SeedFinderPro`}
              className="mt-3"
            />
          </div>
        </div>

        {/* Description */}
        {strain.description && (
          <Card>
            <CardHeader>
              <CardTitle>Beschreibung</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{strain.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Breeder + Stammbaum */}
        {(strain.breeder || (strain.lineage && strain.lineage.length > 0)) && (
          <Card>
            <CardHeader>
              <CardTitle>Herkunft</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {strain.breeder && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Züchter</p>
                  <p className="font-medium">{strain.breeder}</p>
                </div>
              )}
              {strain.lineage && strain.lineage.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Stammbaum / Vorfahren</p>
                  <div className="flex flex-wrap gap-2">
                    {strain.lineage.map((parent: string) => (
                      <Badge key={parent} variant="outline">{parent}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Effects + Aromas/Flavors */}
        <div className="grid md:grid-cols-2 gap-6">
          {strain.effects && strain.effects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Wirkungen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {strain.effects.map((effect) => (
                    <Badge key={effect} variant="secondary">
                      {effectLabel(effect)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {((strain.aromas?.length ?? 0) > 0 || (strain.flavors?.length ?? 0) > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Aromen & Geschmack</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {strain.aromas && strain.aromas.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Aromen</p>
                    <div className="flex flex-wrap gap-2">
                      {strain.aromas.map((a) => (
                        <Badge key={a} variant="outline">
                          {aromaLabel(a)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {strain.flavors && strain.flavors.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Geschmack</p>
                    <div className="flex flex-wrap gap-2">
                      {strain.flavors.map((f) => (
                        <Badge key={f} variant="outline">
                          {flavorLabel(f)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Terpenes */}
        {terpenes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Terpenprofil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {terpenes.map(([name, value]) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-28 text-sm text-muted-foreground">{terpeneLabel(name)}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            (value / (strain.totalTerpenes || 1)) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-14 text-right">
                      {(value * 100).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Price Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Samen kaufen — Preisvergleich
            </CardTitle>
          </CardHeader>
          <CardContent>
            {seedsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Suche Preise...</span>
              </div>
            ) : priceEntries.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Keine Preise gefunden</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Für diesen Strain sind aktuell keine Samen-Preise verfügbar
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  {priceEntries.map(({ seed, price }, idx) => (
                    <div
                      key={`${seed._id}-${idx}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{seed.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {price.seedbank} · {price.packSize}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            {price.price.toFixed(2)} {price.currency}
                          </p>
                          {price.inStock ? (
                            <span className="text-xs text-green-600">Auf Lager</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Nicht verfügbar</span>
                          )}
                        </div>
                        <Button size="sm" asChild>
                          <a
                            href={`/api/prices/affiliate/redirect?to=${encodeURIComponent(price.url)}&seedbank=${encodeURIComponent(price.seedbankSlug)}&strain=${encodeURIComponent(strain.slug)}&strainName=${encodeURIComponent(strain.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Kaufen
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Preisverlauf */}
                {seedsData?.seeds?.[0]?.slug && (
                  <div className="rounded-lg border p-4">
                    <PriceHistoryChart
                      seedSlug={seedsData.seeds[0].slug}
                      seedName={strain.name}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Community-Bewertungen
              {reviewsData?.count ? (
                <span className="text-sm font-normal text-muted-foreground">
                  ({reviewsData.count})
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {user ? (
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium">Deine Bewertung</p>
                <StarRating rating={userRating} onRate={setUserRating} />
                <Textarea
                  placeholder="Teile deine Erfahrungen mit diesem Strain (optional)..."
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  rows={3}
                  maxLength={1000}
                />
                <Button
                  size="sm"
                  disabled={userRating === 0 || submitReview.isPending}
                  onClick={() =>
                    submitReview.mutate({
                      rating: userRating,
                      comment: userComment,
                      username: user.username || user.displayName || 'User',
                    })
                  }
                >
                  {submitReview.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    'Bewertung abgeben'
                  )}
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  <Link href="/auth/login" className="text-primary hover:underline">
                    Einloggen
                  </Link>{' '}
                  um eine Bewertung zu schreiben
                </p>
              </div>
            )}

            {reviewsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">
                Noch keine Bewertungen. Sei der Erste!
              </p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review._id} className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium flex-shrink-0">
                      {review.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{review.username}</span>
                        <StarRating rating={review.rating} readonly />
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(review.createdAt).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Grow-Berichte */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-green-500" />
              Grow-Berichte
              {(strainGrowFeed.data?.pages[0]?.total ?? 0) > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({strainGrowFeed.data!.pages[0].total})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strainGrowFeed.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : strainGrows.length === 0 ? (
              <div className="py-8 text-center">
                <Sprout className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">Noch keine Grow-Berichte für diesen Strain</p>
                <Link href="/journal/new" className="mt-3 inline-block">
                  <Button size="sm" variant="outline">
                    Grow starten
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {strainGrows.map((grow: any) => (
                  <Link key={grow._id} href={`/grows/${grow._id}`}>
                    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{grow.strainName}</span>
                          {grow.status && (
                            <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs capitalize">
                              {grow.status}
                            </span>
                          )}
                          {grow.environment && (
                            <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                              {grow.environment === 'indoor' ? <Home className="h-3 w-3" /> : grow.environment === 'outdoor' ? <Sun className="h-3 w-3" /> : <Leaf className="h-3 w-3" />}
                              {grow.environment}
                            </span>
                          )}
                        </div>
                        {grow.yieldDry && (
                          <p className="text-xs text-green-600 mt-0.5">{grow.yieldDry} g Trockengewicht</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground ml-3 flex-shrink-0">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{grow.viewCount || 0}</span>
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{grow.likeCount || 0}</span>
                        <span>{grow.createdAt ? formatRelativeTime(new Date(grow.createdAt)) : ''}</span>
                      </div>
                    </div>
                  </Link>
                ))}
                {strainGrowFeed.hasNextPage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => strainGrowFeed.fetchNextPage()}
                    disabled={strainGrowFeed.isFetchingNextPage}
                  >
                    {strainGrowFeed.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Mehr laden
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sprout,
  Eye,
  Heart,
  MessageSquare,
  Loader2,
  TrendingUp,
  Clock,
  Trophy,
  Leaf,
  Sun,
  Home,
  CheckCircle2,
  ChevronDown,
  Users,
} from 'lucide-react';
import { usePublicFeed, useFollowingFeed, useLikeGrow, useGrowReactions } from '@/hooks/use-journal';
import { useAuth } from '@/components/providers/auth-provider';
import { formatRelativeTime } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planung',
  germination: 'Keimung',
  vegetative: 'Vegetation',
  flowering: 'Blüte',
  drying: 'Trocknung',
  curing: 'Curing',
  harvested: 'Geerntet',
  archived: 'Archiviert',
};

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-700',
  germination: 'bg-yellow-100 text-yellow-700',
  vegetative: 'bg-green-100 text-green-700',
  flowering: 'bg-purple-100 text-purple-700',
  drying: 'bg-orange-100 text-orange-700',
  curing: 'bg-amber-100 text-amber-700',
  harvested: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
};

const ENV_ICONS: Record<string, React.ElementType> = {
  indoor: Home,
  outdoor: Sun,
  greenhouse: Leaf,
};

const SORT_OPTIONS = [
  { value: 'recent', label: 'Neueste', icon: Clock },
  { value: 'trending', label: 'Trending', icon: TrendingUp },
  { value: 'top', label: 'Top', icon: Trophy },
  { value: 'following', label: 'Folge ich', icon: Users },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'Alle' },
  { value: 'active', label: 'Aktiv' },
  { value: 'flowering', label: 'Blüte' },
  { value: 'harvested', label: 'Geerntet' },
];

const ENV_FILTERS = [
  { value: 'all', label: 'Alle' },
  { value: 'indoor', label: 'Indoor', icon: Home },
  { value: 'outdoor', label: 'Outdoor', icon: Sun },
  { value: 'greenhouse', label: 'Greenhouse', icon: Leaf },
];

function GrowCard({ grow }: { grow: any }) {
  const { user } = useAuth();
  const { data: reactions } = useGrowReactions(grow._id);
  const likeMutation = useLikeGrow(grow._id);
  const isLiked = reactions?.userReaction === 'fire';
  const likeCount = reactions ? (reactions.fire || 0) : (grow.likeCount || 0);

  const EnvIcon = ENV_ICONS[grow.environment] || Home;
  const statusLabel = STATUS_LABELS[grow.status] || grow.status;
  const statusColor = STATUS_COLORS[grow.status] || 'bg-gray-100 text-gray-700';
  const isHarvested = grow.status === 'harvested';

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    likeMutation.mutate();
  };

  return (
    <Link href={`/grows/${grow._id}`}>
      <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{grow.strainName}</h3>
              {grow.breeder && (
                <p className="text-xs text-muted-foreground truncate">{grow.breeder}</p>
              )}
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
              {statusLabel}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <EnvIcon className="h-3 w-3" />
              {grow.environment === 'indoor' ? 'Indoor' :
                grow.environment === 'outdoor' ? 'Outdoor' : 'Greenhouse'}
            </span>
            {grow.type && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
                {grow.type}
              </span>
            )}
            {grow.medium && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
                {grow.medium}
              </span>
            )}
          </div>

          {isHarvested && grow.yieldDry && (
            <div className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">{grow.yieldDry} g Trockengewicht</span>
              {grow.quality && (
                <span className="text-xs text-muted-foreground">· {'⭐'.repeat(grow.quality)}</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {grow.viewCount || 0}
              </span>
              <button
                onClick={handleLike}
                disabled={!user || likeMutation.isPending}
                className={`flex items-center gap-1 transition-colors ${
                  isLiked ? 'text-red-500' : user ? 'hover:text-red-400' : ''
                }`}
              >
                <Heart className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} />
                {likeCount}
              </button>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {grow.commentCount || 0}
              </span>
            </div>
            <span>{grow.createdAt ? formatRelativeTime(new Date(grow.createdAt)) : ''}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      {children}
    </button>
  );
}

export default function GrowsPage() {
  const [sortBy, setSortBy] = useState('recent');
  const [statusFilter, setStatusFilter] = useState('all');
  const [envFilter, setEnvFilter] = useState('all');
  const { user } = useAuth();

  const isFollowingTab = sortBy === 'following';

  const publicFeed = usePublicFeed({
    sortBy: isFollowingTab ? 'recent' : sortBy,
    status: statusFilter,
    environment: envFilter,
  });
  const followingFeed = useFollowingFeed(isFollowingTab && !!user);

  const activeFeed = isFollowingTab ? followingFeed : publicFeed;
  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = activeFeed;

  const grows = data?.pages.flatMap((p: any) => p.grows) || [];
  const total = (data?.pages[0] as any)?.total || 0;

  const hasActiveFilters = !isFollowingTab && (statusFilter !== 'all' || envFilter !== 'all');

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Öffentliche Grows</h1>
            <p className="text-muted-foreground text-sm">
              {total > 0 ? `${total} Grows in der Community` : 'Entdecke Grows der Community'}
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/journal/new">
              <Sprout className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Eigenen Grow starten</span>
              <span className="sm:hidden">Grow starten</span>
            </Link>
          </Button>
        </div>

        {/* Sort + Filter */}
        <div className="space-y-2">
          {/* Sort tabs */}
          <div className="flex gap-2">
            {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setSortBy(value)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  sortBy === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Filter row — hidden on following tab */}
          <div className={`flex flex-wrap items-center gap-2 ${isFollowingTab ? 'opacity-0 pointer-events-none h-0 overflow-hidden' : ''}`}>
            <span className="text-xs text-muted-foreground">Status:</span>
            {STATUS_FILTERS.map(({ value, label }) => (
              <FilterChip
                key={value}
                active={statusFilter === value}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </FilterChip>
            ))}
            <span className="ml-2 text-xs text-muted-foreground">Umgebung:</span>
            {ENV_FILTERS.map(({ value, label, icon: Icon }) => (
              <FilterChip
                key={value}
                active={envFilter === value}
                onClick={() => setEnvFilter(value)}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {label}
              </FilterChip>
            ))}
            {hasActiveFilters && (
              <button
                onClick={() => { setStatusFilter('all'); setEnvFilter('all'); }}
                className="ml-1 text-xs text-muted-foreground hover:text-foreground underline"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Grid */}
        {!isLoading && grows.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {grows.map((grow: any) => (
                <GrowCard key={grow._id} grow={grow} />
              ))}
            </div>

            {/* Load more */}
            {hasNextPage && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown className="mr-2 h-4 w-4" />
                  )}
                  Mehr laden ({grows.length} von {total})
                </Button>
              </div>
            )}

            {!hasNextPage && grows.length > 12 && (
              <p className="text-center text-xs text-muted-foreground">
                Alle {total} Grows geladen
              </p>
            )}
          </>
        )}

        {/* Empty */}
        {!isLoading && grows.length === 0 && (
          <Card className="flex flex-col items-center justify-center py-16">
            {isFollowingTab ? (
              <Users className="mb-4 h-16 w-16 text-muted-foreground" />
            ) : (
              <Sprout className="mb-4 h-16 w-16 text-muted-foreground" />
            )}
            <h3 className="mb-2 text-xl font-semibold">
              {isFollowingTab
                ? (!user ? 'Einloggen erforderlich' : 'Noch keine Grows')
                : hasActiveFilters
                ? 'Keine Grows gefunden'
                : 'Noch keine öffentlichen Grows'}
            </h3>
            <p className="mb-6 text-center text-muted-foreground">
              {isFollowingTab
                ? (!user
                    ? 'Melde dich an, um Grows deiner gefolgten User zu sehen.'
                    : 'Folge anderen Growern, um ihre öffentlichen Grows hier zu sehen.')
                : hasActiveFilters
                ? 'Versuche andere Filter-Kombinationen.'
                : 'Sei der Erste und teile deinen Grow mit der Community!'}
            </p>
            {isFollowingTab && !user ? (
              <Button asChild>
                <Link href="/auth/login">Einloggen</Link>
              </Button>
            ) : isFollowingTab ? (
              <Button asChild variant="outline">
                <Link href="/community">
                  <Users className="mr-2 h-4 w-4" />
                  User entdecken
                </Link>
              </Button>
            ) : !hasActiveFilters ? (
              <Button asChild>
                <Link href="/journal/new">
                  <Sprout className="mr-2 h-4 w-4" />
                  Grow starten
                </Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => { setStatusFilter('all'); setEnvFilter('all'); }}>
                Filter zurücksetzen
              </Button>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

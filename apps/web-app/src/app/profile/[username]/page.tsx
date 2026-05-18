// /apps/web-app/src/app/profile/[username]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  User,
  Calendar,
  Sprout,
  Award,
  Loader2,
  MessageSquare,
  Trophy,
  Star,
  Flame,
  Eye,
  Heart,
  Home,
  Sun,
  Leaf,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { FollowButton } from '@/components/follows/follow-button';
import { FollowStats } from '@/components/follows/follow-stats';
import { useGamificationProfile } from '@/hooks/use-gamification';
import { usePublicFeed, useGrowReactions, useLikeGrow } from '@/hooks/use-journal';
import { formatDate, formatRelativeTime, cn } from '@/lib/utils';
import { api } from '@/lib/api-client';

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planung', germination: 'Keimung', vegetative: 'Vegetation',
  flowering: 'Blüte', drying: 'Trocknung', curing: 'Curing',
  harvested: 'Geerntet', archived: 'Archiviert',
};
const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-700', germination: 'bg-yellow-100 text-yellow-700',
  vegetative: 'bg-green-100 text-green-700', flowering: 'bg-purple-100 text-purple-700',
  drying: 'bg-orange-100 text-orange-700', curing: 'bg-amber-100 text-amber-700',
  harvested: 'bg-blue-100 text-blue-700', archived: 'bg-gray-100 text-gray-500',
};
const ENV_ICONS: Record<string, React.ElementType> = { indoor: Home, outdoor: Sun, greenhouse: Leaf };

function GrowCard({ grow }: { grow: any }) {
  const { user } = useAuth();
  const { data: reactions } = useGrowReactions(grow._id);
  const likeMutation = useLikeGrow(grow._id);
  const isLiked = reactions?.userReaction === 'fire';
  const likeCount = reactions ? (reactions.fire || 0) : (grow.likeCount || 0);
  const EnvIcon = ENV_ICONS[grow.environment] || Home;
  const statusLabel = STATUS_LABELS[grow.status] || grow.status;
  const statusColor = STATUS_COLORS[grow.status] || 'bg-gray-100 text-gray-700';

  return (
    <Link href={`/grows/${grow._id}`}>
      <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{grow.strainName}</h3>
              {grow.breeder && <p className="text-xs text-muted-foreground truncate">{grow.breeder}</p>}
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <EnvIcon className="h-3 w-3" />
              {grow.environment === 'indoor' ? 'Indoor' : grow.environment === 'outdoor' ? 'Outdoor' : 'Greenhouse'}
            </span>
            {grow.type && <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">{grow.type}</span>}
          </div>
          {grow.status === 'harvested' && grow.yieldDry && (
            <div className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">{grow.yieldDry} g</span>
              {grow.quality && <span className="text-xs text-muted-foreground">· {'⭐'.repeat(grow.quality)}</span>}
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{grow.viewCount || 0}</span>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (user) likeMutation.mutate(); }}
                disabled={!user || likeMutation.isPending}
                className={`flex items-center gap-1 transition-colors ${isLiked ? 'text-red-500' : user ? 'hover:text-red-400' : ''}`}
              >
                <Heart className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} />{likeCount}
              </button>
              <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{grow.commentCount || 0}</span>
            </div>
            <span>{grow.createdAt ? formatRelativeTime(new Date(grow.createdAt)) : ''}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const username = params.username as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'grows'>('overview');
  const { data: gamification } = useGamificationProfile(profile?.id);

  const growFeed = usePublicFeed({ userId: profile?.id, sortBy: 'recent', limit: 12 });
  const grows = growFeed.data?.pages.flatMap(p => p.grows) ?? [];
  const totalGrows = growFeed.data?.pages[0]?.total ?? 0;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const data = await api.get<UserProfile>(`/api/auth/users/${username}`);
        setProfile(data);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Benutzer nicht gefunden');
      } finally {
        setIsLoading(false);
      }
    };

    if (username && username !== 'undefined') {
      // If viewing own profile, redirect to /profile
      if (currentUser?.username === username) {
        router.push('/profile');
        return;
      }
      fetchProfile();
    } else {
      // username is missing or literally "undefined" → redirect to own profile
      router.push('/profile');
    }
  }, [username, currentUser, router]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !profile) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <User className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Benutzer nicht gefunden</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => router.push('/community')}>
            Zur Community
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleStartChat = () => {
    router.push(`/messages?start=${profile.id}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
              {/* Avatar */}
              <Avatar className="h-32 w-32">
                {profile.avatar ? (
                  <Image
                    src={profile.avatar}
                    alt={profile.username}
                    width={128}
                    height={128}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <AvatarFallback className="text-4xl">
                    {profile.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>

              {/* Info */}
              <div className="flex-1 space-y-4 text-center md:text-left">
                <div>
                  <h2 className="text-2xl font-bold">
                    {profile.displayName || profile.username}
                  </h2>
                  <p className="text-muted-foreground">@{profile.username}</p>
                </div>

                {profile.bio && (
                  <p className="text-muted-foreground">{profile.bio}</p>
                )}

                {/* Follow Stats */}
                <FollowStats userId={profile.id} username={profile.username} />

                {/* Meta Info */}
                <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground md:justify-start">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Dabei seit {formatDate(new Date(profile.createdAt))}
                  </div>
                  {profile.isVerified && (
                    <div className="flex items-center gap-1 text-green-500">
                      <Award className="h-4 w-4" />
                      Verifiziert
                    </div>
                  )}
                </div>

                {/* Actions */}
                {currentUser && currentUser.id !== profile.id && (
                  <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                    <FollowButton userId={profile.id} />
                    <Button variant="outline" onClick={handleStartChat}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Nachricht
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Übersicht
          </button>
          <button
            onClick={() => setActiveTab('grows')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5',
              activeTab === 'grows'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Sprout className="h-4 w-4" />
            Grows
            {totalGrows > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">{totalGrows}</span>
            )}
          </button>
        </div>

        {/* Grows Tab */}
        {activeTab === 'grows' && (
          <div className="space-y-4">
            {growFeed.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : grows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sprout className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Noch keine öffentlichen Grows</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {grows.map((grow: any) => (
                    <GrowCard key={grow._id} grow={grow} />
                  ))}
                </div>
                {growFeed.hasNextPage && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => growFeed.fetchNextPage()}
                      disabled={growFeed.isFetchingNextPage}
                    >
                      {growFeed.isFetchingNextPage ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Mehr laden
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && <>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Grows</CardTitle>
              <Sprout className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {gamification ? gamification.profile.totalGrows : '-'}
              </div>
              <p className="text-xs text-muted-foreground">Grow-Projekte</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Beiträge</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {gamification ? gamification.profile.totalPosts + gamification.profile.totalReplies : '-'}
              </div>
              <p className="text-xs text-muted-foreground">Forum-Beiträge</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Level</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {gamification ? gamification.profile.level : '-'}
              </div>
              <p className="text-xs text-muted-foreground">
                {gamification ? `${gamification.profile.xp.toLocaleString('de-DE')} XP` : 'XP'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gamification: XP-Bar + Achievements */}
        {gamification && (
          <>
            {/* XP Progress */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold flex-shrink-0">
                    {gamification.profile.level}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Level {gamification.profile.level}</span>
                      <span className="text-xs text-muted-foreground">
                        {gamification.profile.xp.toLocaleString('de-DE')} XP
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-primary rounded-full"
                        style={{
                          width: `${Math.min(
                            100 - Math.round((gamification.profile.xpToNextLevel / (gamification.profile.xpToNextLevel + gamification.profile.xp)) * 100),
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>{gamification.profile.reputation}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span>{gamification.profile.currentStreak}d</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            {gamification.achievements.unlockedCount > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-purple-500" />
                      Achievements
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {gamification.achievements.unlockedCount} / {gamification.achievements.total}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {gamification.achievements.unlocked.map((a) => {
                      const rarityColor: Record<string, string> = {
                        legendary: 'border-yellow-500',
                        epic: 'border-purple-500',
                        rare: 'border-blue-500',
                        common: 'border-border',
                      };
                      return (
                        <div
                          key={a.id}
                          className={cn('flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs', rarityColor[a.rarity])}
                          title={`${a.name}: ${a.description}`}
                        >
                          <span>{a.icon}</span>
                          <span className="font-medium">{a.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
        </> /* end overview tab */}
      </div>
    </DashboardLayout>
  );
}

// /apps/web-app/src/components/follows/follow-stats.tsx
'use client';

import Link from 'next/link';
import { useFollowStats } from '@/hooks/use-follows';
import { Skeleton } from '@/components/ui/skeleton';

interface FollowStatsProps {
  userId: string;
  username?: string;
}

export function FollowStats({ userId, username }: FollowStatsProps) {
  const { data: stats, isLoading } = useFollowStats(userId);

  if (isLoading) {
    return (
      <div className="flex gap-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-24" />
      </div>
    );
  }

  const profilePath = username ? `/profile/${username}` : `/profile?id=${userId}`;

  return (
    <div className="flex gap-4 text-sm">
      <Link
        href={`${profilePath}/followers`}
        className="hover:underline"
      >
        <span className="font-bold">{stats?.followersCount ?? 0}</span>{' '}
        <span className="text-muted-foreground">Follower</span>
      </Link>
      <Link
        href={`${profilePath}/following`}
        className="hover:underline"
      >
        <span className="font-bold">{stats?.followingCount ?? 0}</span>{' '}
        <span className="text-muted-foreground">Folgt</span>
      </Link>
    </div>
  );
}

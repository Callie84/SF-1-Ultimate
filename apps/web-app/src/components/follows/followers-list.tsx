// /apps/web-app/src/components/follows/followers-list.tsx
'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, Users } from 'lucide-react';
import { FollowButton } from './follow-button';
import { useFollowers, useFollowing } from '@/hooks/use-follows';
import { useAuth } from '@/components/providers/auth-provider';

interface FollowersListProps {
  userId: string;
  type: 'followers' | 'following';
}

export function FollowersList({ userId, type }: FollowersListProps) {
  const { user } = useAuth();

  const followersQuery = useFollowers(type === 'followers' ? userId : undefined);
  const followingQuery = useFollowing(type === 'following' ? userId : undefined);

  const query = type === 'followers' ? followersQuery : followingQuery;
  const userIds = type === 'followers'
    ? followersQuery.data?.followers
    : followingQuery.data?.following;

  const total = type === 'followers'
    ? followersQuery.data?.total
    : followingQuery.data?.total;

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userIds || userIds.length === 0) {
    return (
      <div className="py-8 text-center">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {type === 'followers' ? 'Noch keine Follower' : 'Folgt niemandem'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground mb-4">
        {total} {type === 'followers' ? 'Follower' : 'Folgt'}
      </p>
      <div className="divide-y">
        {userIds.map((id) => (
          <div key={id} className="flex items-center gap-3 py-3">
            <Link href={`/profile?id=${id}`}>
              <Avatar>
                <AvatarFallback>
                  {id.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/profile?id=${id}`} className="hover:underline">
                <p className="font-medium truncate">{id.substring(0, 12)}...</p>
              </Link>
            </div>
            {user && user.id !== id && (
              <FollowButton userId={id} size="sm" variant="outline" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

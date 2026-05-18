// /apps/web-app/src/components/follows/follow-button.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useFollow, useUnfollow, useFollowStats } from '@/hooks/use-follows';
import { useAuth } from '@/components/providers/auth-provider';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  userId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showIcon?: boolean;
  className?: string;
}

export function FollowButton({
  userId,
  variant = 'default',
  size = 'default',
  showIcon = true,
  className,
}: FollowButtonProps) {
  const { user } = useAuth();
  const { data: stats, isLoading } = useFollowStats(userId);
  const follow = useFollow();
  const unfollow = useUnfollow();
  const [isHovered, setIsHovered] = useState(false);

  // Don't show button if viewing own profile or not logged in
  if (!user || user.id === userId) {
    return null;
  }

  const isFollowing = stats?.isFollowing ?? false;
  const isPending = follow.isPending || unfollow.isPending;

  const handleClick = () => {
    if (isPending) return;

    if (isFollowing) {
      unfollow.mutate(userId);
    } else {
      follow.mutate(userId);
    }
  };

  if (isLoading) {
    return (
      <Button variant={variant} size={size} disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? 'outline' : variant}
      size={size}
      onClick={handleClick}
      disabled={isPending}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        isFollowing && isHovered && 'border-destructive text-destructive hover:bg-destructive/10',
        className
      )}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {showIcon && (
            isFollowing ? (
              isHovered ? <UserMinus className="h-4 w-4 mr-2" /> : null
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )
          )}
          {isFollowing ? (isHovered ? 'Entfolgen' : 'Folgst du') : 'Folgen'}
        </>
      )}
    </Button>
  );
}

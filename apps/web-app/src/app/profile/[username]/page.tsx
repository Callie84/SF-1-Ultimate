// /apps/web-app/src/app/profile/[username]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  User,
  Calendar,
  Sprout,
  Award,
  Loader2,
  MessageSquare,
  Users,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { FollowButton } from '@/components/follows/follow-button';
import { FollowStats } from '@/components/follows/follow-stats';
import { formatDate } from '@/lib/utils';
import { api } from '@/lib/api-client';

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

    if (username) {
      // If viewing own profile, redirect to /profile
      if (currentUser?.username === username) {
        router.push('/profile');
        return;
      }
      fetchProfile();
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
                  <img
                    src={profile.avatar}
                    alt={profile.username}
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

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Grows</CardTitle>
              <Sprout className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Öffentliche Grows</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Beiträge</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Forum-Beiträge</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rolle</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile.role}</div>
              <p className="text-xs text-muted-foreground">Account-Typ</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

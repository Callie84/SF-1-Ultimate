'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  Shield,
  Ban,
  MoreVertical,
  Mail,
  Calendar,
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Crown,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useAdminUsers, useUpdateUser, useBanUser } from '@/hooks/use-admin';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useAdminUsers({
    page,
    limit: 20,
    search: searchQuery,
    role: roleFilter,
  });

  const updateUser = useUpdateUser();
  const banUser = useBanUser();

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && currentUser && currentUser.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [currentUser, authLoading, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUser.mutateAsync({ userId, updates: { role: newRole } });
      toast.success('Benutzerrolle aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Rolle');
    }
  };

  const handleBanToggle = async (userId: string, isBanned: boolean) => {
    try {
      await banUser.mutateAsync({ userId, banned: !isBanned });
      toast.success(isBanned ? 'Benutzer entsperrt' : 'Benutzer gesperrt');
    } catch (error) {
      toast.error('Fehler beim Ändern des Sperrstatus');
    }
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <Card className="flex flex-col items-center justify-center py-16">
          <Shield className="mb-4 h-16 w-16 text-destructive" />
          <h3 className="mb-2 text-xl font-semibold">Zugriff verweigert</h3>
          <Button asChild>
            <Link href="/dashboard">Zurück zum Dashboard</Link>
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  const users = data?.users || [];
  const totalPages = data?.totalPages || 1;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'MODERATOR':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'MODERATOR':
        return 'bg-blue-500/10 text-blue-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Link */}
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Admin Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Benutzerverwaltung</h1>
            <p className="text-muted-foreground">
              Verwalte alle registrierten Benutzer
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Suche nach Name, Email oder Username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Alle Rollen</option>
                <option value="USER">User</option>
                <option value="MODERATOR">Moderator</option>
                <option value="ADMIN">Admin</option>
              </select>
              <Button type="submit">Suchen</Button>
            </form>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Benutzer ({data?.total || 0})</CardTitle>
            <CardDescription>Liste aller registrierten Benutzer</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length > 0 ? (
              <div className="space-y-3">
                {users.map((user: any) => (
                  <div
                    key={user.id || user._id}
                    className={`flex items-center justify-between rounded-lg border p-4 ${
                      user.isBanned ? 'border-destructive/50 bg-destructive/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.username}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          user.username?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>

                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {user.displayName || user.username}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                            {getRoleIcon(user.role)}
                            {user.role}
                          </span>
                          {user.isVerified && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {user.isBanned && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                              <Ban className="h-3 w-3" />
                              Gesperrt
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {user.createdAt ? formatDate(new Date(user.createdAt)) : '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <select
                        className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id || user._id, e.target.value)}
                        disabled={user.id === currentUser.id}
                      >
                        <option value="USER">User</option>
                        <option value="MODERATOR">Moderator</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <Button
                        variant={user.isBanned ? 'outline' : 'destructive'}
                        size="sm"
                        onClick={() => handleBanToggle(user.id || user._id, user.isBanned)}
                        disabled={user.id === currentUser.id}
                      >
                        {user.isBanned ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Entsperren
                          </>
                        ) : (
                          <>
                            <Ban className="mr-1 h-3 w-3" />
                            Sperren
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="mb-2 h-8 w-8" />
                <p>Keine Benutzer gefunden</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Zurück
                </Button>
                <span className="text-sm text-muted-foreground">
                  Seite {page} von {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Weiter
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

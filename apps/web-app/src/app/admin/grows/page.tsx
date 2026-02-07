'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sprout,
  Search,
  Shield,
  Loader2,
  ArrowLeft,
  Trash2,
  Eye,
  User,
  Calendar,
  Leaf,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useAdminGrows, useDeleteContent } from '@/hooks/use-admin';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminGrowsPage() {
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useAdminGrows({
    page,
    limit: 20,
    search: searchQuery,
    status: statusFilter,
  });

  const deleteContent = useDeleteContent();

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

  const handleDelete = async (growId: string) => {
    if (!confirm('Grow-Projekt wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    try {
      await deleteContent.mutateAsync({ type: 'grow', id: growId });
      toast.success('Grow-Projekt gelöscht');
      refetch();
    } catch (error) {
      toast.error('Fehler beim Löschen');
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

  const grows = data?.grows || [];
  const totalPages = data?.totalPages || 1;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
            <Clock className="h-3 w-3" />
            Aktiv
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
            <CheckCircle className="h-3 w-3" />
            Abgeschlossen
          </span>
        );
      case 'abandoned':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            <XCircle className="h-3 w-3" />
            Abgebrochen
          </span>
        );
      default:
        return (
          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {status || 'Unbekannt'}
          </span>
        );
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
        <div>
          <h1 className="text-3xl font-bold">Grow-Verwaltung</h1>
          <p className="text-muted-foreground">
            Alle Grow-Projekte verwalten
          </p>
        </div>

        {/* Search & Filters */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Suche nach Titel, Strain oder Benutzer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Alle Status</option>
                <option value="active">Aktiv</option>
                <option value="completed">Abgeschlossen</option>
                <option value="abandoned">Abgebrochen</option>
              </select>
              <Button type="submit">Suchen</Button>
            </form>
          </CardContent>
        </Card>

        {/* Grows List */}
        <Card>
          <CardHeader>
            <CardTitle>Grow-Projekte ({data?.total || 0})</CardTitle>
            <CardDescription>Liste aller Grow-Tagebücher</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : grows.length > 0 ? (
              <div className="space-y-3">
                {grows.map((grow: any) => (
                  <div
                    key={grow.id || grow._id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Cover Image */}
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                        {grow.coverImage ? (
                          <img
                            src={grow.coverImage}
                            alt={grow.title || grow.name}
                            className="h-full w-full rounded-lg object-cover"
                          />
                        ) : (
                          <Sprout className="h-6 w-6" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold truncate">
                            {grow.title || grow.name || 'Unbenannt'}
                          </span>
                          {getStatusBadge(grow.status)}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {grow.user?.username || grow.author?.username || 'Unbekannt'}
                          </span>
                          {grow.strain && (
                            <span className="flex items-center gap-1">
                              <Leaf className="h-3 w-3" />
                              {typeof grow.strain === 'string' ? grow.strain : grow.strain.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {grow.createdAt ? formatDate(new Date(grow.createdAt)) : '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <Link href={`/journal/${grow.id || grow._id}`} target="_blank">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(grow.id || grow._id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Sprout className="mb-2 h-8 w-8" />
                <p>Keine Grow-Projekte gefunden</p>
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

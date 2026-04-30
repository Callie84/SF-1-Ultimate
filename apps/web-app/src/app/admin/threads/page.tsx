'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Search,
  Shield,
  Loader2,
  ArrowLeft,
  Pin,
  Lock,
  Unlock,
  Trash2,
  Eye,
  User,
  Calendar,
  MessageCircle,
  RotateCcw,
  Ban,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import {
  useAdminThreads,
  usePinThread,
  useLockThread,
  useDeleteContent,
  useAdminDeletedThreads,
  useRestoreThread,
  usePurgeThread,
} from '@/hooks/use-admin';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminThreadsPage() {
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  const [deletedPage, setDeletedPage] = useState(1);

  const { data, isLoading, refetch } = useAdminThreads({
    page,
    limit: 20,
    search: searchQuery,
  });

  const { data: deletedData, isLoading: deletedLoading } = useAdminDeletedThreads({
    page: deletedPage,
    limit: 20,
  });

  const pinThread = usePinThread();
  const lockThread = useLockThread();
  const deleteContent = useDeleteContent();
  const restoreThread = useRestoreThread();
  const purgeThread = usePurgeThread();

  useEffect(() => {
    if (!authLoading && currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'MODERATOR') {
      router.push('/dashboard');
    }
  }, [currentUser, authLoading, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handlePin = async (threadId: string, isPinned: boolean) => {
    try {
      await pinThread.mutateAsync({ threadId, pinned: !isPinned });
      toast.success(isPinned ? 'Thread entpinnt' : 'Thread angepinnt');
      refetch();
    } catch {
      toast.error('Fehler beim Ändern des Pin-Status');
    }
  };

  const handleLock = async (threadId: string, isLocked: boolean) => {
    try {
      await lockThread.mutateAsync({ threadId, locked: !isLocked });
      toast.success(isLocked ? 'Thread entsperrt' : 'Thread gesperrt');
      refetch();
    } catch {
      toast.error('Fehler beim Ändern des Sperrstatus');
    }
  };

  const handleDelete = async (threadId: string) => {
    if (!confirm('Thread wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    try {
      await deleteContent.mutateAsync({ type: 'thread', id: threadId });
      toast.success('Thread gelöscht');
      refetch();
    } catch {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleRestore = async (threadId: string) => {
    try {
      await restoreThread.mutateAsync(threadId);
      toast.success('Thread wiederhergestellt');
    } catch {
      toast.error('Fehler beim Wiederherstellen');
    }
  };

  const handlePurge = async (threadId: string) => {
    if (!confirm('Thread dauerhaft ausblenden? Er bleibt in der Datenbank, wird aber nirgends mehr angezeigt.')) return;
    try {
      await purgeThread.mutateAsync(threadId);
      toast.success('Thread dauerhaft ausgeblendet');
    } catch {
      toast.error('Fehler beim Ausblenden');
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

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MODERATOR')) {
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

  const threads = data?.threads || [];
  const totalPages = data?.totalPages || 1;

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
          <h1 className="text-3xl font-bold">Thread-Verwaltung</h1>
          <p className="text-muted-foreground">
            Alle Community-Threads verwalten
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Suche nach Titel oder Inhalt..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Suchen</Button>
            </form>
          </CardContent>
        </Card>

        {/* Threads List */}
        <Card>
          <CardHeader>
            <CardTitle>Threads</CardTitle>
            <CardDescription>Liste aller Community-Threads</CardDescription>
          </CardHeader>

          {/* Tabs */}
          <div className="flex gap-2 px-6 pb-4">
            <Button
              variant={activeTab === 'active' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('active')}
            >
              Aktive Threads ({data?.total ?? 0})
            </Button>
            <Button
              variant={activeTab === 'deleted' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('deleted')}
            >
              Gelöscht ({deletedData?.total ?? 0})
            </Button>
          </div>

          <CardContent>
            {activeTab === 'active' && (
              <>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : threads.length > 0 ? (
                  <div className="space-y-3">
                    {threads.map((thread: any) => (
                      <div
                        key={thread.id || thread._id}
                        className={`rounded-lg border p-4 ${
                          thread.isPinned ? 'border-primary/50 bg-primary/5' : ''
                        } ${thread.isLocked ? 'opacity-75' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold truncate">
                                {thread.title}
                              </span>
                              {thread.isPinned && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                  <Pin className="h-3 w-3" />
                                  Angepinnt
                                </span>
                              )}
                              {thread.isLocked && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-500">
                                  <Lock className="h-3 w-3" />
                                  Gesperrt
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {thread.author?.username || 'Unbekannt'}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {thread.replyCount || 0} Antworten
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {thread.createdAt ? formatDate(new Date(thread.createdAt)) : '-'}
                              </span>
                            </div>
                            {thread.category && (
                              <span className="inline-flex mt-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                {thread.category.name || thread.category}
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/community/thread/${thread.id || thread._id}`} target="_blank">
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePin(thread.id || thread._id, thread.isPinned)}
                              title={thread.isPinned ? 'Entpinnen' : 'Anpinnen'}
                            >
                              <Pin className={`h-4 w-4 ${thread.isPinned ? 'text-primary' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLock(thread.id || thread._id, thread.isLocked)}
                              title={thread.isLocked ? 'Entsperren' : 'Sperren'}
                            >
                              {thread.isLocked ? (
                                <Unlock className="h-4 w-4 text-yellow-500" />
                              ) : (
                                <Lock className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(thread.id || thread._id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <MessageSquare className="mb-2 h-8 w-8" />
                    <p>Keine Threads gefunden</p>
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
              </>
            )}

            {activeTab === 'deleted' && (
              <div className="space-y-2">
                {deletedLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !deletedData?.threads?.length ? (
                  <p className="text-center text-muted-foreground py-8">Keine gelöschten Threads</p>
                ) : (
                  deletedData.threads.map((thread: any) => (
                    <div key={thread._id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{thread.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Gelöscht: {thread.deletedAt ? formatDate(new Date(thread.deletedAt)) : '-'} · {thread.userId}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(thread._id)}
                          disabled={restoreThread.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" /> Wiederherstellen
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handlePurge(thread._id)}
                          disabled={purgeThread.isPending}
                        >
                          <Ban className="h-4 w-4 mr-1" /> Dauerhaft
                        </Button>
                      </div>
                    </div>
                  ))
                )}

                {(deletedData?.totalPages ?? 0) > 1 && (
                  <div className="flex justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deletedPage <= 1}
                      onClick={() => setDeletedPage((p) => p - 1)}
                    >
                      Zurück
                    </Button>
                    <span className="text-sm text-muted-foreground py-2">
                      {deletedPage} / {deletedData?.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deletedPage >= (deletedData?.totalPages ?? 1)}
                      onClick={() => setDeletedPage((p) => p + 1)}
                    >
                      Weiter
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

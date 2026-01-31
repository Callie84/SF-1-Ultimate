'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Flag,
  Shield,
  MessageSquare,
  Sprout,
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Ban,
  Eye,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useAdminReports, useResolveReport } from '@/hooks/use-admin';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminModerationPage() {
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [resolveNote, setResolveNote] = useState('');

  const { data, isLoading, refetch } = useAdminReports({
    status: statusFilter,
    type: typeFilter,
  });

  const resolveReport = useResolveReport();

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'MODERATOR') {
      router.push('/dashboard');
    }
  }, [currentUser, authLoading, router]);

  const handleResolve = async (reportId: string, action: 'dismiss' | 'warn' | 'delete' | 'ban') => {
    try {
      await resolveReport.mutateAsync({ reportId, action, note: resolveNote });
      toast.success(`Meldung ${action === 'dismiss' ? 'abgewiesen' : 'bearbeitet'}`);
      setSelectedReport(null);
      setResolveNote('');
      refetch();
    } catch (error) {
      toast.error('Fehler beim Bearbeiten der Meldung');
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

  const reports = data?.reports || [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'thread':
        return <MessageSquare className="h-4 w-4" />;
      case 'reply':
        return <MessageSquare className="h-4 w-4" />;
      case 'grow':
        return <Sprout className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      default:
        return <Flag className="h-4 w-4" />;
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'spam':
        return 'Spam';
      case 'harassment':
        return 'Belästigung';
      case 'inappropriate':
        return 'Unangemessen';
      case 'illegal':
        return 'Illegal';
      case 'misinformation':
        return 'Falschinformation';
      default:
        return reason;
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
            <h1 className="text-3xl font-bold">Content-Moderation</h1>
            <p className="text-muted-foreground">
              Prüfe und bearbeite gemeldete Inhalte
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="pending">Offen</option>
                <option value="resolved">Bearbeitet</option>
                <option value="">Alle</option>
              </select>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">Alle Typen</option>
                <option value="thread">Threads</option>
                <option value="reply">Antworten</option>
                <option value="grow">Grows</option>
                <option value="user">Benutzer</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Meldungen ({data?.total || 0})</CardTitle>
              <CardDescription>Gemeldete Inhalte zur Überprüfung</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : reports.length > 0 ? (
                <div className="space-y-3">
                  {reports.map((report: any) => (
                    <div
                      key={report.id || report._id}
                      className={`cursor-pointer rounded-lg border p-4 transition-colors hover:bg-accent ${
                        selectedReport?.id === report.id ? 'border-primary bg-accent' : ''
                      }`}
                      onClick={() => setSelectedReport(report)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(report.type)}
                          <span className="font-medium capitalize">{report.type}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            report.status === 'pending'
                              ? 'bg-orange-500/10 text-orange-500'
                              : 'bg-green-500/10 text-green-500'
                          }`}>
                            {report.status === 'pending' ? 'Offen' : 'Bearbeitet'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {report.createdAt ? formatRelativeTime(new Date(report.createdAt)) : ''}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          {getReasonLabel(report.reason)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {report.description || 'Keine Beschreibung'}
                      </p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Gemeldet von: {report.reporter?.username || 'Anonym'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle className="mb-2 h-8 w-8 text-green-500" />
                  <p>Keine offenen Meldungen</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>
                {selectedReport ? 'Meldung überprüfen und bearbeiten' : 'Wähle eine Meldung aus'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedReport ? (
                <div className="space-y-4">
                  {/* Content Preview */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Gemeldeter Inhalt</h4>
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedReport.content?.title || selectedReport.content?.content || 'Inhalt nicht verfügbar'}
                      </p>
                      {selectedReport.content?.user && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Von: {selectedReport.content.user.username}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Report Info */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Meldungsgrund</h4>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        {getReasonLabel(selectedReport.reason)}
                      </span>
                    </div>
                    {selectedReport.description && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedReport.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {selectedReport.status === 'pending' && (
                    <>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Notiz (optional)</h4>
                        <Textarea
                          placeholder="Begründung oder Notiz..."
                          value={resolveNote}
                          onChange={(e) => setResolveNote(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div className="grid gap-2 md:grid-cols-2">
                        <Button
                          variant="outline"
                          onClick={() => handleResolve(selectedReport.id || selectedReport._id, 'dismiss')}
                          disabled={resolveReport.isPending}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Abweisen
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleResolve(selectedReport.id || selectedReport._id, 'warn')}
                          disabled={resolveReport.isPending}
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Verwarnen
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleResolve(selectedReport.id || selectedReport._id, 'delete')}
                          disabled={resolveReport.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Löschen
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleResolve(selectedReport.id || selectedReport._id, 'ban')}
                          disabled={resolveReport.isPending}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Sperren
                        </Button>
                      </div>
                    </>
                  )}

                  {selectedReport.status === 'resolved' && (
                    <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
                      <div className="flex items-center gap-2 text-green-500">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Bereits bearbeitet</span>
                      </div>
                      {selectedReport.resolution && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Aktion: {selectedReport.resolution.action}
                        </p>
                      )}
                    </div>
                  )}

                  {/* View Original */}
                  {selectedReport.contentUrl && (
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={selectedReport.contentUrl} target="_blank">
                        <Eye className="mr-2 h-4 w-4" />
                        Original anzeigen
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Flag className="mb-2 h-8 w-8" />
                  <p>Wähle eine Meldung aus der Liste</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

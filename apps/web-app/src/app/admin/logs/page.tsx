'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Shield,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useAdminLogs } from '@/hooks/use-admin';

export default function AdminLogsPage() {
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useAdminLogs({
    page,
    limit: 50,
    level: levelFilter,
    service: serviceFilter,
  });

  useEffect(() => {
    if (!authLoading && currentUser && currentUser.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [currentUser, authLoading, router]);

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

  const logs = data?.logs || [];
  const totalPages = data?.totalPages || 1;

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'debug':
        return <Bug className="h-4 w-4 text-muted-foreground" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-500/10 text-red-500';
      case 'warn':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'info':
        return 'bg-blue-500/10 text-blue-500';
      case 'debug':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return timestamp;
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
            <h1 className="text-3xl font-bold">System-Logs</h1>
            <p className="text-muted-foreground">
              System-Protokolle und Fehlermeldungen
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Aktualisieren
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={levelFilter}
                onChange={(e) => {
                  setLevelFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Alle Level</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={serviceFilter}
                onChange={(e) => {
                  setServiceFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Alle Services</option>
                <option value="auth">Auth Service</option>
                <option value="journal">Journal Service</option>
                <option value="community">Community Service</option>
                <option value="media">Media Service</option>
                <option value="ai">AI Service</option>
                <option value="search">Search Service</option>
                <option value="gateway">API Gateway</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Protokolle ({data?.total || 0})</CardTitle>
            <CardDescription>System-Logs aller Services</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length > 0 ? (
              <div className="space-y-2">
                {logs.map((log: any, index: number) => (
                  <div
                    key={log.id || log._id || index}
                    className="rounded-lg border p-3 text-sm"
                  >
                    <div className="flex items-center gap-3 mb-1">
                      {getLevelIcon(log.level)}
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getLevelColor(log.level)}`}>
                        {(log.level || 'info').toUpperCase()}
                      </span>
                      {log.service && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {log.service}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {log.timestamp ? formatTimestamp(log.timestamp) : log.createdAt ? formatTimestamp(log.createdAt) : ''}
                      </span>
                    </div>
                    <p className="text-foreground font-mono text-xs pl-7">
                      {log.message}
                    </p>
                    {log.meta && (
                      <pre className="mt-1 pl-7 text-xs text-muted-foreground font-mono overflow-x-auto">
                        {typeof log.meta === 'string' ? log.meta : JSON.stringify(log.meta, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FileText className="mb-2 h-8 w-8" />
                <p>Keine Logs gefunden</p>
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

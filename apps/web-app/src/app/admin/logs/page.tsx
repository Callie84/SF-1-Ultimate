'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Copy,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useAdminLogs } from '@/hooks/use-admin';
import { toast } from 'sonner';

interface LogEntry {
  id?: string;
  _id?: string;
  level: 'error' | 'warn' | 'info' | 'debug' | string;
  service?: string;
  timestamp?: string;
  createdAt?: string;
  message: string;
  meta?: Record<string, unknown> | string;
  stack?: string;
}

function getLevelIcon(level: string) {
  switch (level) {
    case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'warn':  return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'info':  return <Info className="h-4 w-4 text-blue-500" />;
    case 'debug': return <Bug className="h-4 w-4 text-muted-foreground" />;
    default:      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

function getLevelColor(level: string) {
  switch (level) {
    case 'error': return 'bg-red-500/10 text-red-500';
    case 'warn':  return 'bg-yellow-500/10 text-yellow-500';
    case 'info':  return 'bg-blue-500/10 text-blue-500';
    default:      return 'bg-muted text-muted-foreground';
  }
}

function formatTimestamp(ts?: string) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return ts;
  }
}

function formatMeta(meta: LogEntry['meta']): string {
  if (!meta) return '';
  if (typeof meta === 'string') {
    try { return JSON.stringify(JSON.parse(meta), null, 2); } catch { return meta; }
  }
  return JSON.stringify(meta, null, 2);
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Kopiert' : label}
    </button>
  );
}

function LogDetailModal({ log, onClose }: { log: LogEntry; onClose: () => void }) {
  const ts = log.timestamp || log.createdAt;
  const metaStr = log.meta ? formatMeta(log.meta) : '';
  const logId = log.id || log._id || '';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getLevelIcon(log.level)}
            <span>Log-Detail</span>
            <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getLevelColor(log.level)}`}>
              {(log.level || 'info').toUpperCase()}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Basis-Infos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Zeitstempel</p>
              <p className="font-mono">{formatTimestamp(ts)}</p>
            </div>
            {log.service && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Service</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{log.service}</span>
              </div>
            )}
            {logId && (
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Log-ID</p>
                  <CopyButton text={logId} label="ID kopieren" />
                </div>
                <p className="font-mono text-xs text-muted-foreground">{logId}</p>
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Nachricht</p>
            <p className="font-mono bg-muted rounded-md p-3 whitespace-pre-wrap break-words">{log.message}</p>
          </div>

          {/* Meta */}
          {metaStr && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Kontext / Meta</p>
                <CopyButton text={metaStr} label="Meta kopieren" />
              </div>
              <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
                {metaStr}
              </pre>
            </div>
          )}

          {/* Stack Trace */}
          {log.stack && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Stack Trace</p>
                <CopyButton text={log.stack} label="Stack kopieren" />
              </div>
              <pre className="bg-red-500/5 border border-red-500/20 rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words text-red-400">
                {log.stack}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminLogsPage() {
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const { data, isLoading, refetch } = useAdminLogs({
    page,
    limit: 50,
    level: levelFilter,
    service: serviceFilter,
  });

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

  const logs: LogEntry[] = data?.logs || [];
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System-Logs</h1>
            <p className="text-muted-foreground">System-Protokolle aller Services — auf Zeile klicken für Details</p>
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
                onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
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
                onChange={(e) => { setServiceFilter(e.target.value); setPage(1); }}
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
            <CardDescription>Klicke auf einen Eintrag für die vollständige Detailansicht</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length > 0 ? (
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div
                    key={log.id || log._id || index}
                    onClick={() => setSelectedLog(log)}
                    className="rounded-lg border p-3 text-sm cursor-pointer transition-colors hover:bg-muted/50 hover:border-border/80"
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
                        {formatTimestamp(log.timestamp || log.createdAt)}
                      </span>
                    </div>
                    <p className="text-foreground font-mono text-xs pl-7 truncate">
                      {log.message}
                    </p>
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

      {selectedLog && (
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </DashboardLayout>
  );
}

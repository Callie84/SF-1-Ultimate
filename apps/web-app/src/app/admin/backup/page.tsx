'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/components/providers/auth-provider';
import {
  HardDrive,
  Play,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Database,
  ShieldCheck,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  useBackupStatus,
  useBackups,
  useTriggerBackup,
  useDeleteBackup,
  BackupEntry,
} from '@/hooks/use-backup';

export default function BackupAdminPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data: statusData, isLoading: statusLoading } = useBackupStatus();
  const { data: backupsData, isLoading: backupsLoading } = useBackups();
  const triggerBackup = useTriggerBackup();
  const deleteBackup = useDeleteBackup();
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [verifyingName, setVerifyingName] = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<string, { valid: boolean; reason?: string }>>({});

  useEffect(() => {
    if (!authLoading && user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const status = statusData?.status;
  const backups = backupsData?.backups ?? [];

  const handleTrigger = async () => {
    try {
      await triggerBackup.mutateAsync(undefined);
      toast.success('Backup gestartet', { description: 'Das Backup läuft im Hintergrund.' });
    } catch (err: any) {
      toast.error('Fehler', { description: err.message });
    }
  };

  const handleVerify = async (name: string) => {
    setVerifyingName(name);
    try {
      const result: any = await import('@/lib/api-client').then(m => m.default.post(`/api/backup/backups/${name}/verify`));
      setVerifyResults(prev => ({ ...prev, [name]: result }));
      if (result.valid) {
        toast.success('Integrität OK', { description: result.reason });
      } else {
        toast.error('Integritätsfehler!', { description: result.reason });
      }
    } catch (err: any) {
      toast.error('Verify fehlgeschlagen', { description: err.message });
    } finally {
      setVerifyingName(null);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Backup "${name}" wirklich löschen?`)) return;
    setDeletingName(name);
    try {
      await deleteBackup.mutateAsync(name);
      toast.success('Backup gelöscht');
    } catch (err: any) {
      toast.error('Fehler', { description: err.message });
    } finally {
      setDeletingName(null);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return format(new Date(iso), 'dd.MM.yyyy HH:mm', { locale: de });
    } catch {
      return iso;
    }
  };

  const formatCron = (cron: string) => {
    const parts = cron.split(' ');
    if (parts.length === 5) {
      const [min, hour] = parts;
      return `Täglich um ${hour.padStart(2, '0')}:${min.padStart(2, '0')} Uhr`;
    }
    return cron;
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Backup-Verwaltung</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Automatische Backups von MongoDB und PostgreSQL
          </p>
        </div>
        <Button
          onClick={handleTrigger}
          disabled={triggerBackup.isPending || status?.running}
          className="gap-2"
        >
          {status?.running ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Backup läuft...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Backup jetzt starten
            </>
          )}
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {status?.running ? (
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
              ) : status?.lastStatus === 'ok' ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : status?.lastStatus === 'error' ? (
                <XCircle className="h-8 w-8 text-red-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold">
                  {status?.running
                    ? 'Läuft...'
                    : status?.lastStatus === 'ok'
                    ? 'Erfolgreich'
                    : status?.lastStatus === 'error'
                    ? 'Fehler'
                    : 'Kein Backup'}
                </p>
              </div>
            </div>
            {status?.lastError && (
              <p className="text-xs text-red-500 mt-2 line-clamp-2">{status.lastError}</p>
            )}
          </CardContent>
        </Card>

        {/* Letztes Backup */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Letztes Backup</p>
                <p className="font-semibold">
                  {status?.lastRun ? formatDate(status.lastRun) : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Zeitplan */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Zeitplan</p>
                <p className="font-semibold">
                  {statusData?.schedule ? formatCron(statusData.schedule) : '—'}
                </p>
                {statusData?.retentionDays && (
                  <p className="text-xs text-muted-foreground">
                    {statusData.retentionDays} Backups aufbewahren
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup Liste */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Vorhandene Backups
            {backups.length > 0 && (
              <Badge variant="secondary">{backups.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {backupsLoading ? (
            <p className="text-muted-foreground text-sm">Lade Backups...</p>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HardDrive className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Noch keine Backups vorhanden</p>
              <p className="text-xs mt-1">
                Das erste automatische Backup wird {statusData?.schedule ? formatCron(statusData.schedule).toLowerCase() : 'nach Zeitplan'} erstellt.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {backups.map((backup) => (
                <BackupRow
                  key={backup.name}
                  backup={backup}
                  isDeleting={deletingName === backup.name}
                  isVerifying={verifyingName === backup.name}
                  verifyResult={verifyResults[backup.name]}
                  onDelete={() => handleDelete(backup.name)}
                  onVerify={() => handleVerify(backup.name)}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <p className="font-medium">Backup-Inhalt</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs opacity-80">
                <li>MongoDB: Alle Datenbanken (Community, Journal, Gamification, Notifications, …)</li>
                <li>PostgreSQL: sf1_db (Auth, Sessions)</li>
                <li>Format: .tar.gz komprimiert, im Verzeichnis <code>/root/SF-1-Ultimate-/backups/</code></li>
              </ul>
              <p className="text-xs opacity-70 mt-2">
                Für Offsite-Backups: Hetzner Storage Box konfigurieren via BACKUP_HOST, BACKUP_USER, BACKUP_PASS in .env
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
}

function BackupRow({
  backup,
  isDeleting,
  isVerifying,
  verifyResult,
  onDelete,
  onVerify,
  formatDate,
}: {
  backup: BackupEntry;
  isDeleting: boolean;
  isVerifying: boolean;
  verifyResult?: { valid: boolean; reason?: string };
  onDelete: () => void;
  onVerify: () => void;
  formatDate: (iso: string) => string;
}) {
  return (
    <div className="py-3 space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {backup.status === 'ok' ? (
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
          ) : backup.status === 'error' ? (
            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium font-mono">{backup.name}</p>
              {(backup as any).encrypted && (
                <Lock className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{formatDate(backup.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{backup.sizeMB} MB</span>
          <Badge
            variant={
              backup.status === 'ok'
                ? 'default'
                : backup.status === 'error'
                ? 'destructive'
                : 'secondary'
            }
            className="text-xs"
          >
            {backup.status === 'ok' ? 'OK' : backup.status === 'error' ? 'Fehler' : 'Partial'}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
            disabled={isVerifying}
            onClick={onVerify}
          >
            {isVerifying ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : verifyResult ? (
              verifyResult.valid ? (
                <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
              )
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            disabled={isDeleting}
            onClick={onDelete}
          >
            {isDeleting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
      {verifyResult && (
        <p className={`text-xs pl-7 ${verifyResult.valid ? 'text-green-600' : 'text-red-600'}`}>
          {verifyResult.valid ? '✓' : '✗'} {verifyResult.reason}
        </p>
      )}
    </div>
  );
}

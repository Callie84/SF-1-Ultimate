// /apps/web-app/src/app/admin/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Shield,
  Loader2,
  Settings,
  Database,
  Search,
  Bell,
  Mail,
  Globe,
  Lock,
  RefreshCw,
  Save,
  Server,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import api from '@/lib/api-client';
import { toast } from 'sonner';

function EmailTestForm() {
  const [to, setTo] = useState('');
  const [template, setTemplate] = useState('welcome');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!to) return;
    setSending(true);
    try {
      await api.post('/api/notifications/admin/test-email', { to, template });
      toast.success(`Test-E-Mail (${template}) an ${to} gesendet`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Fehler beim Senden');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Input
        type="email"
        placeholder="empfaenger@example.com"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="flex-1 min-w-[200px]"
      />
      <select
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="welcome">Willkommen</option>
        <option value="password-reset">Passwort-Reset</option>
        <option value="comment-reply">Kommentar-Antwort</option>
        <option value="price-alert">Preis-Alarm</option>
        <option value="digest">Digest</option>
      </select>
      <Button onClick={handleSend} disabled={sending || !to} variant="outline" size="sm">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Senden'}
      </Button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [indexStats, setIndexStats] = useState<{ strains: number; threads: number; grows: number } | null>(null);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      Promise.allSettled([
        api.get('/api/search/stats/STRAINS'),
        api.get('/api/search/stats/THREADS'),
        api.get('/api/search/stats/GROWS'),
      ]).then(([strains, threads, grows]) => {
        setIndexStats({
          strains: strains.status === 'fulfilled' ? (strains.value as any)?.index?.numberOfDocuments ?? '-' : '-',
          threads: threads.status === 'fulfilled' ? (threads.value as any)?.index?.numberOfDocuments ?? '-' : '-',
          grows: grows.status === 'fulfilled' ? (grows.value as any)?.index?.numberOfDocuments ?? '-' : '-',
        });
      });
    }
  }, [user]);

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <Card className="flex flex-col items-center justify-center py-16">
          <Shield className="mb-4 h-16 w-16 text-destructive" />
          <h3 className="mb-2 text-xl font-semibold">Zugriff verweigert</h3>
          <p className="text-muted-foreground mb-4">
            Du benötigst Admin-Rechte, um auf diesen Bereich zuzugreifen.
          </p>
          <Button asChild>
            <Link href="/dashboard">Zurück zum Dashboard</Link>
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  const handleReindexSearch = async () => {
    setIsSaving(true);
    try {
      await api.post('/api/search/reindex/all', {});
      toast.success('Suchindex wird neu aufgebaut (Strains, Threads, Grows, Users)');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Fehler beim Reindexieren');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCache = async () => {
    setIsSaving(true);
    try {
      const res = await api.post('/api/auth/admin/cache/clear', {});
      toast.success(`Cache geleert — ${res.deletedKeys} Keys gelöscht`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Fehler beim Cache leeren');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Einstellungen</h1>
            <p className="text-muted-foreground">
              System- und Plattform-Konfiguration
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin">
              Zurück zum Dashboard
            </Link>
          </Button>
        </div>

        {/* Allgemeine Einstellungen */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <CardTitle>Allgemeine Einstellungen</CardTitle>
            </div>
            <CardDescription>Grundlegende Plattform-Konfiguration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="siteName">Seitenname</Label>
                <Input id="siteName" defaultValue="SeedfinderPro" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteUrl">Domain</Label>
                <Input id="siteUrl" defaultValue="seedfinderpro.de" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support E-Mail</Label>
                <Input id="supportEmail" type="email" placeholder="support@seedfinderpro.de" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUploadSize">Max. Upload-Größe (MB)</Label>
                <Input id="maxUploadSize" type="number" defaultValue="10" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Such-Einstellungen */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              <CardTitle>Suche (Meilisearch)</CardTitle>
            </div>
            <CardDescription>Volltext-Suche Konfiguration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Suchindex neu aufbauen</p>
                <p className="text-sm text-muted-foreground">
                  Alle Strains, Threads und Grows neu indexieren
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleReindexSearch}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Reindexieren
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg text-center">
                <p className="text-2xl font-bold">{indexStats ? indexStats.strains : '…'}</p>
                <p className="text-sm text-muted-foreground">Strains indexiert</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-2xl font-bold">{indexStats ? indexStats.threads : '…'}</p>
                <p className="text-sm text-muted-foreground">Threads indexiert</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-2xl font-bold">{indexStats ? indexStats.grows : '…'}</p>
                <p className="text-sm text-muted-foreground">Grows indexiert</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cache-Einstellungen */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <CardTitle>Cache (Redis)</CardTitle>
            </div>
            <CardDescription>Performance-Optimierung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Cache leeren</p>
                <p className="text-sm text-muted-foreground">
                  Alle gecachten Daten löschen (Sessions bleiben erhalten)
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleClearCache}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Cache leeren
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sicherheit */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <CardTitle>Sicherheit</CardTitle>
            </div>
            <CardDescription>Sicherheitseinstellungen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session-Timeout (Stunden)</Label>
                <Input id="sessionTimeout" type="number" defaultValue="24" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxLoginAttempts">Max. Login-Versuche</Label>
                <Input id="maxLoginAttempts" type="number" defaultValue="5" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">JWT Secret</p>
                <p className="text-sm text-muted-foreground">
                  Konfiguriert in .env Datei
                </p>
              </div>
              <span className="text-sm text-green-600 font-medium">Aktiv</span>
            </div>
          </CardContent>
        </Card>

        {/* E-Mail */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>E-Mail (SMTP)</CardTitle>
            </div>
            <CardDescription>Brevo SMTP — konfiguriert via .env</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium">Brevo (smtp-relay.brevo.com)</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Port</span>
                <span className="font-mono">2525</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Absender</span>
                <span className="font-mono">noreply@seedfinderpro.de</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Templates</span>
                <span>welcome, password-reset, digest, comment-reply, price-alert</span>
              </div>
            </div>

            <div className="rounded-lg border bg-green-500/5 border-green-500/20 p-3 text-sm text-green-700 dark:text-green-400">
              E-Mail-Versand ist aktiv und konfiguriert.
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium">Test-E-Mail senden</p>
              <EmailTestForm />
            </div>
          </CardContent>
        </Card>

        {/* System-Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              <CardTitle>System-Information</CardTitle>
            </div>
            <CardDescription>Technische Details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Version</span>
                <span className="font-mono">1.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Node.js</span>
                <span className="font-mono">v20.x</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Next.js</span>
                <span className="font-mono">14.2.x</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">MongoDB</span>
                <span className="font-mono">7.x</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">PostgreSQL</span>
                <span className="font-mono">15.x</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Redis</span>
                <span className="font-mono">7.x</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button disabled>
            <Save className="h-4 w-4 mr-2" />
            Einstellungen speichern
          </Button>
        </div>
        <p className="text-sm text-muted-foreground text-right">
          Einstellungen werden aktuell in der .env Datei verwaltet
        </p>
      </div>
    </DashboardLayout>
  );
}

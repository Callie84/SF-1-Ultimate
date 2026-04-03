'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Settings,
  Bell,
  Shield,
  Palette,
  Loader2,
  Save,
  Key,
  Mail,
  MessageSquare,
  Heart,
  UserPlus,
  AtSign,
  Tag,
  Trophy,
  Award,
  Info,
  Moon,
  Crown,
  ExternalLink,
  Lock,
  ShieldCheck,
  ShieldOff,
  Copy,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Download,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
import api from '@/lib/api-client';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  NotificationPreferences,
  NotifChannels,
} from '@/hooks/use-notifications';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useFeatureFlag } from '@/hooks/use-feature-flags';
import { Smartphone } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';

// ─── Toggle ───────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

// ─── Notification type row ─────────────────────────────────────────────────

const notifTypes: { key: keyof NotificationPreferences['preferences']; label: string; description: string; icon: React.ReactNode }[] = [
  { key: 'comment',     label: 'Kommentare',        description: 'Wenn jemand deinen Grow oder Beitrag kommentiert',  icon: <MessageSquare className="h-4 w-4" /> },
  { key: 'reply',       label: 'Antworten',          description: 'Wenn jemand auf deinen Kommentar antwortet',        icon: <MessageSquare className="h-4 w-4" /> },
  { key: 'reaction',    label: 'Reaktionen',         description: 'Wenn jemand auf deinen Inhalt reagiert',            icon: <Heart className="h-4 w-4" /> },
  { key: 'follow',      label: 'Neue Follower',      description: 'Wenn dir jemand folgt',                             icon: <UserPlus className="h-4 w-4" /> },
  { key: 'mention',     label: 'Erwähnungen',        description: 'Wenn du im Forum erwähnt wirst',                    icon: <AtSign className="h-4 w-4" /> },
  { key: 'price_alert', label: 'Preisalarme',        description: 'Wenn ein beobachteter Preis sinkt',                 icon: <Tag className="h-4 w-4" /> },
  { key: 'milestone',   label: 'Meilensteine',       description: 'Grow-Meilensteine und besondere Ereignisse',        icon: <Trophy className="h-4 w-4" /> },
  { key: 'badge',       label: 'Abzeichen',          description: 'Wenn du ein neues Achievement freischaltest',       icon: <Award className="h-4 w-4" /> },
  { key: 'system',      label: 'System',             description: 'Wichtige Systemnachrichten',                        icon: <Info className="h-4 w-4" /> },
];

const emailDigestLabels = {
  instant: 'Sofort',
  hourly: 'Stündlich',
  daily: 'Täglich',
  never: 'Nie',
};

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('account');

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Privacy settings (aus User-Daten geladen)
  const [privacy, setPrivacy] = useState({
    profilePublic: (user as any)?.privacy?.profilePublic ?? true,
    showEmail: (user as any)?.privacy?.showEmail ?? false,
    showGrows: (user as any)?.privacy?.showGrows ?? true,
  });

  useEffect(() => {
    if (user) {
      setPrivacy({
        profilePublic: (user as any)?.privacy?.profilePublic ?? true,
        showEmail: (user as any)?.privacy?.showEmail ?? false,
        showGrows: (user as any)?.privacy?.showGrows ?? true,
      });
    }
  }, [user]);

  // Push Notifications
  const { state: pushState, loading: pushLoading, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications();
  const pushEnabled = useFeatureFlag('push_notifications');

  // Notification preferences (from backend)
  const { data: prefData, isLoading: prefLoading } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences['preferences'] | null>(null);
  const [emailDigest, setEmailDigest] = useState<NotificationPreferences['emailDigest']>('instant');
  const [quietHours, setQuietHours] = useState<NotificationPreferences['quietHours']>({
    enabled: false,
    start: '22:00',
    end: '08:00',
  });

  useEffect(() => {
    if (prefData?.preferences) {
      const p = prefData.preferences;
      setNotifEnabled(p.enabled ?? true);
      setNotifPrefs(p.preferences);
      setEmailDigest(p.emailDigest ?? 'instant');
      setQuietHours(p.quietHours ?? { enabled: false, start: '22:00', end: '08:00' });
    }
  }, [prefData]);

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      await updatePrefs.mutateAsync({
        enabled: notifEnabled,
        preferences: notifPrefs ?? undefined,
        emailDigest,
        quietHours,
      } as any);
      toast.success('Benachrichtigungs-Einstellungen gespeichert');
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    setIsSaving(true);
    try {
      await api.patch('/api/auth/profile', { privacy });
      toast.success('Privatsphäre-Einstellungen gespeichert');
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Passwort muss mindestens 8 Zeichen haben');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Passwort erfolgreich geändert');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Fehler beim Ändern des Passworts');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── 2FA State ────────────────────────────────────────────────────────────
  const [twoFaStatus, setTwoFaStatus] = useState<{ enabled: boolean; backupCodesRemaining: number } | null>(null);
  const [twoFaSetupData, setTwoFaSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaDisableCode, setTwoFaDisableCode] = useState('');
  const [twoFaBackupCodes, setTwoFaBackupCodes] = useState<string[]>([]);
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  useEffect(() => {
    if (activeSection === 'security' && user?.role === 'ADMIN') {
      api.get('/api/auth/2fa/status').then((d: any) => setTwoFaStatus(d)).catch(() => {});
    }
  }, [activeSection, user?.role]);

  const handle2FaSetup = async () => {
    setTwoFaLoading(true);
    try {
      const data: any = await api.post('/api/auth/2fa/setup');
      setTwoFaSetupData({ secret: data.secret, qrCode: data.qrCode });
    } catch (e: any) {
      toast.error(e?.response?.data?.error || '2FA-Setup fehlgeschlagen');
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handle2FaEnable = async () => {
    if (!twoFaCode || twoFaCode.length !== 6) {
      toast.error('Bitte gib einen 6-stelligen Code ein');
      return;
    }
    setTwoFaLoading(true);
    try {
      const data: any = await api.post('/api/auth/2fa/enable', { code: twoFaCode });
      setTwoFaBackupCodes(data.backupCodes);
      setTwoFaSetupData(null);
      setTwoFaCode('');
      setTwoFaStatus({ enabled: true, backupCodesRemaining: data.backupCodes.length });
      toast.success('2FA erfolgreich aktiviert!');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || '2FA-Aktivierung fehlgeschlagen');
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handle2FaDisable = async () => {
    if (!twoFaDisableCode) {
      toast.error('Bitte gib deinen TOTP-Code ein');
      return;
    }
    setTwoFaLoading(true);
    try {
      await api.post('/api/auth/2fa/disable', { code: twoFaDisableCode });
      setTwoFaStatus({ enabled: false, backupCodesRemaining: 0 });
      setTwoFaDisableCode('');
      toast.success('2FA deaktiviert');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || '2FA-Deaktivierung fehlgeschlagen');
    } finally {
      setTwoFaLoading(false);
    }
  };

  const setTypeChannel = (
    type: keyof NotificationPreferences['preferences'],
    channel: keyof NotifChannels,
    value: boolean
  ) => {
    if (!notifPrefs) return;
    setNotifPrefs({
      ...notifPrefs,
      [type]: { ...notifPrefs[type], [channel]: value },
    });
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  // ─── DSGVO State ──────────────────────────────────────────────────────────
  const [dsgvoExporting, setDsgvoExporting] = useState(false);
  const [dsgvoDeleting, setDsgvoDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  const handleExportData = async () => {
    setDsgvoExporting(true);
    try {
      const token = document.cookie.match(/sf1_access_token=([^;]+)/)?.[1];
      const response = await fetch('/api/auth/export-data', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Export fehlgeschlagen');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = response.headers.get('Content-Disposition') || '';
      const filename = cd.match(/filename="(.+)"/)?.[1] || 'sf1-datenexport.json';
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Datenexport erfolgreich heruntergeladen');
    } catch {
      toast.error('Datenexport fehlgeschlagen');
    } finally {
      setDsgvoExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Bitte gib dein Passwort ein');
      return;
    }
    setDsgvoDeleting(true);
    try {
      await api.delete('/api/auth/account', { data: { password: deletePassword } });
      toast.success('Account wurde gelöscht');
      router.push('/');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Löschung fehlgeschlagen');
    } finally {
      setDsgvoDeleting(false);
      setShowDeleteConfirm(false);
      setDeletePassword('');
    }
  };

  const sections = [
    { id: 'account', label: 'Account', icon: Settings },
    { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
    { id: 'privacy', label: 'Privatsphäre', icon: Shield },
    { id: 'security', label: 'Sicherheit', icon: Lock },
    { id: 'appearance', label: 'Darstellung', icon: Palette },
    { id: 'dsgvo', label: 'Meine Daten', icon: Download },
    // { id: 'billing', label: 'Abonnement', icon: Crown }, // TODO: aktivieren wenn Stripe konfiguriert
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Einstellungen</h1>
          <p className="text-muted-foreground">Verwalte deine Account- und App-Einstellungen</p>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <Button
              key={section.id}
              variant={activeSection === section.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection(section.id)}
              className="flex items-center gap-2"
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </Button>
          ))}
        </div>

        {/* ─── Account Section ────────────────────────────────────────── */}
        {activeSection === 'account' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  E-Mail-Adresse
                </CardTitle>
                <CardDescription>
                  Deine E-Mail-Adresse für Login und Benachrichtigungen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input value={user.email} disabled className="max-w-md" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Passwort ändern
                </CardTitle>
                <CardDescription>
                  Aktualisiere dein Passwort regelmäßig für mehr Sicherheit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Aktuelles Passwort</Label>
                  <Input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="********"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Neues Passwort</Label>
                  <Input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="********"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Passwort bestätigen</Label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="********"
                  />
                </div>
                <Button onClick={handleChangePassword} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Passwort ändern
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── Notifications Section ───────────────────────────────────── */}
        {activeSection === 'notifications' && (
          <div className="space-y-4">
            {prefLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Global toggle */}
                <Card>
                  <CardHeader>
                    <CardTitle>Benachrichtigungen</CardTitle>
                    <CardDescription>Globale Einstellung für alle Benachrichtigungen</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Alle Benachrichtigungen aktivieren</p>
                        <p className="text-sm text-muted-foreground">Schalte alle In-App Benachrichtigungen ein oder aus</p>
                      </div>
                      <Toggle checked={notifEnabled} onChange={setNotifEnabled} />
                    </div>
                  </CardContent>
                </Card>

                {/* Per-type toggles */}
                {/* Push Notification Aktivierung */}
                {pushEnabled && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5" />
                        Browser Push-Benachrichtigungen
                      </CardTitle>
                      <CardDescription>
                        Erhalte Benachrichtigungen direkt im Browser, auch wenn die Seite nicht geöffnet ist.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {pushState === 'unsupported' ? (
                        <p className="text-sm text-muted-foreground">Dein Browser unterstützt keine Push-Benachrichtigungen.</p>
                      ) : pushState === 'denied' ? (
                        <p className="text-sm text-destructive">Du hast Push-Benachrichtigungen blockiert. Bitte erlaube sie in den Browser-Einstellungen.</p>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {pushState === 'subscribed' ? 'Push aktiv' : 'Push deaktiviert'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {pushState === 'subscribed'
                                ? 'Du erhältst Push-Benachrichtigungen für aktivierte Ereignisse.'
                                : 'Klicke um Browser-Push zu aktivieren.'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant={pushState === 'subscribed' ? 'outline' : 'default'}
                            onClick={pushState === 'subscribed' ? pushUnsubscribe : pushSubscribe}
                            disabled={pushLoading || pushState === 'loading'}
                          >
                            {pushLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : pushState === 'subscribed' ? 'Deaktivieren' : 'Aktivieren'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Benachrichtigungs-Typen</CardTitle>
                    <CardDescription>Wähle für jeden Typ, ob du In-App, E-Mail oder Push Benachrichtigungen erhältst</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Header row */}
                    <div className={`grid gap-4 px-6 py-2 border-b bg-muted/30 ${pushEnabled ? 'grid-cols-[1fr_auto_auto_auto]' : 'grid-cols-[1fr_auto_auto]'}`}>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Typ</span>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16 text-center">In-App</span>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16 text-center">E-Mail</span>
                      {pushEnabled && <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-16 text-center">Push</span>}
                    </div>
                    <div className="divide-y">
                      {notifTypes.map(({ key, label, description, icon }) => (
                        <div key={key} className={`grid gap-4 items-center px-6 py-3 ${pushEnabled ? 'grid-cols-[1fr_auto_auto_auto]' : 'grid-cols-[1fr_auto_auto]'}`}>
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 text-muted-foreground flex-shrink-0">{icon}</div>
                            <div>
                              <p className="text-sm font-medium">{label}</p>
                              <p className="text-xs text-muted-foreground">{description}</p>
                            </div>
                          </div>
                          <div className="w-16 flex justify-center">
                            <Toggle
                              checked={notifPrefs?.[key]?.in_app ?? true}
                              onChange={(v) => setTypeChannel(key, 'in_app', v)}
                              disabled={!notifEnabled}
                            />
                          </div>
                          <div className="w-16 flex justify-center">
                            <Toggle
                              checked={notifPrefs?.[key]?.email ?? false}
                              onChange={(v) => setTypeChannel(key, 'email', v)}
                              disabled={!notifEnabled}
                            />
                          </div>
                          {pushEnabled && (
                            <div className="w-16 flex justify-center">
                              <Toggle
                                checked={notifPrefs?.[key]?.push ?? false}
                                onChange={(v) => setTypeChannel(key, 'push', v)}
                                disabled={!notifEnabled || pushState !== 'subscribed'}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Email Digest */}
                <Card>
                  <CardHeader>
                    <CardTitle>E-Mail Zusammenfassung</CardTitle>
                    <CardDescription>Wie oft soll eine E-Mail-Zusammenfassung gesendet werden?</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(['instant', 'hourly', 'daily', 'never'] as const).map((v) => (
                        <Button
                          key={v}
                          size="sm"
                          variant={emailDigest === v ? 'default' : 'outline'}
                          onClick={() => setEmailDigest(v)}
                        >
                          {emailDigestLabels[v]}
                        </Button>
                      ))}
                    </div>
                    {emailDigest === 'instant' && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Du erhältst E-Mails sofort bei aktivierten Ereignissen (setzt SMTP voraus).
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Quiet Hours */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Moon className="h-5 w-5" />
                      Ruhige Stunden
                    </CardTitle>
                    <CardDescription>
                      In diesem Zeitraum werden keine Push-Benachrichtigungen gesendet
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Ruhige Stunden aktivieren</p>
                        <p className="text-sm text-muted-foreground">
                          Push-Benachrichtigungen werden in diesem Zeitraum stummgeschaltet
                        </p>
                      </div>
                      <Toggle
                        checked={quietHours.enabled}
                        onChange={(v) => setQuietHours({ ...quietHours, enabled: v })}
                      />
                    </div>
                    {quietHours.enabled && (
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Von</label>
                          <input
                            type="time"
                            value={quietHours.start ?? '22:00'}
                            onChange={(e) => setQuietHours({ ...quietHours, start: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Bis</label>
                          <input
                            type="time"
                            value={quietHours.end ?? '08:00'}
                            onChange={(e) => setQuietHours({ ...quietHours, end: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                        <p className="col-span-2 text-xs text-muted-foreground">
                          Zeitzone: UTC. Wenn Von &gt; Bis, gelten die ruhigen Stunden über Mitternacht (z.B. 22:00–08:00).
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button onClick={handleSaveNotifications} disabled={isSaving || updatePrefs.isPending}>
                  {(isSaving || updatePrefs.isPending) ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Einstellungen speichern
                </Button>
              </>
            )}
          </div>
        )}

        {/* ─── Privacy Section ─────────────────────────────────────────── */}
        {activeSection === 'privacy' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profil-Sichtbarkeit</CardTitle>
                <CardDescription>Kontrolliere, wer dein Profil sehen kann</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {[
                  { key: 'profilePublic', label: 'Öffentliches Profil', desc: 'Dein Profil ist für alle sichtbar' },
                  { key: 'showEmail', label: 'E-Mail anzeigen', desc: 'Deine E-Mail-Adresse ist auf dem Profil sichtbar' },
                  { key: 'showGrows', label: 'Grows anzeigen', desc: 'Deine Grows sind öffentlich sichtbar' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                    <Toggle
                      checked={privacy[key as keyof typeof privacy]}
                      onChange={(v) => setPrivacy({ ...privacy, [key]: v })}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button onClick={handleSavePrivacy} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Einstellungen speichern
            </Button>
          </div>
        )}

        {/* ─── Security Section (2FA nur für Admins) ───────────────────── */}
        {activeSection === 'security' && (
          <div className="space-y-4">
            {user?.role !== 'ADMIN' && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Shield className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-foreground">Dein Account ist geschützt</p>
                      <p className="text-sm">Die Zwei-Faktor-Authentifizierung steht für Admin-Accounts zur Verfügung.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {user?.role === 'ADMIN' && <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Zwei-Faktor-Authentifizierung (2FA)
                </CardTitle>
                <CardDescription>
                  Schütze deinen Admin-Account mit einem TOTP-Code (z.B. Google Authenticator, Authy)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                {twoFaStatus && (
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${twoFaStatus.enabled ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted'}`}>
                    {twoFaStatus.enabled ? (
                      <ShieldCheck className="h-5 w-5 text-green-500" />
                    ) : (
                      <ShieldOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{twoFaStatus.enabled ? '2FA ist aktiv' : '2FA ist deaktiviert'}</p>
                      {twoFaStatus.enabled && (
                        <p className="text-sm text-muted-foreground">{twoFaStatus.backupCodesRemaining} Backup-Codes verbleibend</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Backup Codes nach Aktivierung */}
                {twoFaBackupCodes.length > 0 && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-yellow-600">
                      <AlertTriangle className="h-4 w-4" />
                      <p className="font-medium text-sm">Backup-Codes — nur einmal sichtbar!</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Speichere diese Codes sicher. Du kannst sie zum Login verwenden, wenn du keinen Zugriff auf deine Authenticator-App hast.</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {twoFaBackupCodes.map((code, i) => (
                        <code key={i} className="text-sm font-mono bg-muted px-2 py-1 rounded">{code}</code>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        navigator.clipboard.writeText(twoFaBackupCodes.join('\n'));
                        toast.success('Backup-Codes kopiert');
                      }}>
                        <Copy className="mr-2 h-3 w-3" />Codes kopieren
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        const content = 'SeedFinderPro – 2FA Backup-Codes\n\n' + twoFaBackupCodes.join('\n') + '\n\nJeder Code kann nur einmal verwendet werden.';
                        const blob = new Blob([content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'seedfinderpro-backup-codes.txt';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}>
                        <Download className="mr-2 h-3 w-3" />Herunterladen
                      </Button>
                    </div>
                  </div>
                )}

                {/* Setup: QR-Code-Anzeige */}
                {twoFaSetupData && (
                  <div className="space-y-3">
                    <div className="flex flex-col items-center gap-3 p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground text-center">Scanne diesen QR-Code mit deiner Authenticator-App</p>
                      <img src={twoFaSetupData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                      <p className="text-xs text-muted-foreground">Oder gib den Code manuell ein:</p>
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded break-all">{twoFaSetupData.secret}</code>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="6-stelligen Code eingeben"
                        value={twoFaCode}
                        onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        className="font-mono text-center text-lg"
                      />
                      <Button onClick={handle2FaEnable} disabled={twoFaLoading || twoFaCode.length !== 6}>
                        {twoFaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        <span className="ml-2">Aktivieren</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* 2FA aktivieren Button */}
                {!twoFaStatus?.enabled && !twoFaSetupData && (
                  <Button onClick={handle2FaSetup} disabled={twoFaLoading}>
                    {twoFaLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                    2FA einrichten
                  </Button>
                )}

                {/* 2FA deaktivieren */}
                {twoFaStatus?.enabled && twoFaBackupCodes.length === 0 && (
                  <div className="pt-4 border-t space-y-2">
                    <p className="text-sm text-muted-foreground">2FA deaktivieren (TOTP-Code erforderlich):</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="TOTP-Code"
                        value={twoFaDisableCode}
                        onChange={(e) => setTwoFaDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        className="font-mono text-center max-w-32"
                      />
                      <Button variant="destructive" onClick={handle2FaDisable} disabled={twoFaLoading || twoFaDisableCode.length !== 6}>
                        {twoFaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                        <span className="ml-2">2FA deaktivieren</span>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>}
          </div>
        )}

        {/* ─── Billing Section (deaktiviert bis Stripe konfiguriert) ───── */}
        {/* {activeSection === 'billing' && (
          <BillingSection isPremium={!!(user as any)?.premium} />
        )} */}

        {/* ─── DSGVO / Meine Daten Section ─────────────────────────────── */}
        {activeSection === 'dsgvo' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Meine Daten exportieren
                </CardTitle>
                <CardDescription>
                  Lade eine Kopie aller deiner gespeicherten Daten herunter (DSGVO Art. 20)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Der Export enthält: Profil, Grows, Forum-Beiträge, Gamification-Daten — als JSON-Datei.
                </p>
                <Button onClick={handleExportData} disabled={dsgvoExporting}>
                  {dsgvoExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Daten herunterladen
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Account dauerhaft löschen
                </CardTitle>
                <CardDescription>
                  Löscht deinen Account und alle Daten unwiderruflich (DSGVO Art. 17)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
                  <strong>Achtung:</strong> Diese Aktion kann nicht rückgängig gemacht werden. Deine Grows, Daten und Einstellungen werden gelöscht. Forum-Beiträge werden anonymisiert.
                </div>

                {!showDeleteConfirm ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Account löschen
                  </Button>
                ) : (
                  <div className="space-y-3 pt-2 border-t">
                    <p className="text-sm font-medium">Bestätige mit deinem Passwort:</p>
                    <Input
                      type="password"
                      placeholder="Dein Passwort"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="max-w-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={dsgvoDeleting || !deletePassword}
                      >
                        {dsgvoDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Ja, Account löschen
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── Appearance Section ───────────────────────────────────────── */}
        {activeSection === 'appearance' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Design / Skin</CardTitle>
                <CardDescription>Wähle das Erscheinungsbild der App</CardDescription>
              </CardHeader>
              <CardContent>
                <ThemeSwitcher />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sprache</CardTitle>
                <CardDescription>Wähle deine bevorzugte Sprache</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button variant="default">Deutsch</Button>
                  <Button variant="outline">English</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function BillingSection({ isPremium }: { isPremium: boolean }) {
  const [loading, setLoading] = useState(false);

  const openPortal = async () => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/billing/portal', {}) as { url: string };
      window.location.href = data.url;
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Fehler beim Öffnen des Portals');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Abonnement
          </CardTitle>
          <CardDescription>
            {isPremium ? 'Du bist Premium-Mitglied.' : 'Upgrade auf Premium für mehr Features.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPremium ? (
            <>
              <div className="flex items-center gap-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 p-3">
                <Crown className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-300 text-sm">Premium aktiv</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    Alle Premium-Features sind freigeschaltet.
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={openPortal} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Abo verwalten / kündigen
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Mit Premium bekommst du unbegrenzte Grows, mehr KI-Anfragen, erweiterte Statistiken und ein Premium-Badge.
              </p>
              <Button onClick={() => window.location.href = '/premium'}>
                <Crown className="mr-2 h-4 w-4" />
                Premium werden — ab 4,99€/Monat
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

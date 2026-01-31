'use client';

import { useState } from 'react';
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
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
import api from '@/lib/api-client';

// Simple Toggle Component
function Toggle({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="font-medium">{label}</div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('account');

  // Notification settings
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    comments: true,
    replies: true,
    mentions: true,
    priceAlerts: true,
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showEmail: false,
    showGrows: true,
  });

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      await api.patch('/api/preferences', { preferences: notifications });
      toast.success('Benachrichtigungen gespeichert');
    } catch (error) {
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
    } catch (error) {
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

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const sections = [
    { id: 'account', label: 'Account', icon: Settings },
    { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
    { id: 'privacy', label: 'Privatsphäre', icon: Shield },
    { id: 'appearance', label: 'Darstellung', icon: Palette },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Einstellungen</h1>
          <p className="text-muted-foreground">
            Verwalte deine Account- und App-Einstellungen
          </p>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <Button
              key={section.id}
              variant={activeSection === section.id ? 'default' : 'outline'}
              onClick={() => setActiveSection(section.id)}
              className="flex items-center gap-2"
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </Button>
          ))}
        </div>

        {/* Account Section */}
        {activeSection === 'account' && (
          <div className="space-y-4">
            {/* Email */}
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
                <div className="flex items-center gap-4">
                  <Input value={user.email} disabled className="max-w-md" />
                </div>
              </CardContent>
            </Card>

            {/* Password */}
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
              <CardContent className="space-y-4">
                <div className="max-w-md space-y-4">
                  <div className="space-y-2">
                    <Label>Aktuelles Passwort</Label>
                    <Input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      placeholder="********"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Neues Passwort</Label>
                    <Input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      placeholder="********"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Passwort bestätigen</Label>
                    <Input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      placeholder="********"
                    />
                  </div>
                  <Button onClick={handleChangePassword} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Passwort ändern
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notifications Section */}
        {activeSection === 'notifications' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Benachrichtigungs-Kanäle</CardTitle>
                <CardDescription>
                  Wähle, wie du benachrichtigt werden möchtest
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                <Toggle
                  checked={notifications.email}
                  onChange={(checked) => setNotifications({ ...notifications, email: checked })}
                  label="E-Mail-Benachrichtigungen"
                  description="Erhalte wichtige Updates per E-Mail"
                />
                <Toggle
                  checked={notifications.push}
                  onChange={(checked) => setNotifications({ ...notifications, push: checked })}
                  label="Push-Benachrichtigungen"
                  description="Benachrichtigungen auf deinem Gerät"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Benachrichtigungs-Typen</CardTitle>
                <CardDescription>
                  Wähle, worüber du informiert werden möchtest
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                <Toggle
                  checked={notifications.comments}
                  onChange={(checked) => setNotifications({ ...notifications, comments: checked })}
                  label="Kommentare"
                  description="Wenn jemand deinen Grow kommentiert"
                />
                <Toggle
                  checked={notifications.replies}
                  onChange={(checked) => setNotifications({ ...notifications, replies: checked })}
                  label="Antworten"
                  description="Wenn jemand auf dich antwortet"
                />
                <Toggle
                  checked={notifications.mentions}
                  onChange={(checked) => setNotifications({ ...notifications, mentions: checked })}
                  label="Erwähnungen"
                  description="Wenn du erwähnt wirst"
                />
                <Toggle
                  checked={notifications.priceAlerts}
                  onChange={(checked) => setNotifications({ ...notifications, priceAlerts: checked })}
                  label="Preis-Alerts"
                  description="Wenn sich Preise ändern"
                />
              </CardContent>
            </Card>

            <Button onClick={handleSaveNotifications} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Einstellungen speichern
            </Button>
          </div>
        )}

        {/* Privacy Section */}
        {activeSection === 'privacy' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profil-Sichtbarkeit</CardTitle>
                <CardDescription>
                  Kontrolliere, wer dein Profil sehen kann
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                <Toggle
                  checked={privacy.profilePublic}
                  onChange={(checked) => setPrivacy({ ...privacy, profilePublic: checked })}
                  label="Öffentliches Profil"
                  description="Dein Profil ist für alle sichtbar"
                />
                <Toggle
                  checked={privacy.showEmail}
                  onChange={(checked) => setPrivacy({ ...privacy, showEmail: checked })}
                  label="E-Mail anzeigen"
                  description="Deine E-Mail-Adresse ist sichtbar"
                />
                <Toggle
                  checked={privacy.showGrows}
                  onChange={(checked) => setPrivacy({ ...privacy, showGrows: checked })}
                  label="Grows anzeigen"
                  description="Deine Grows sind öffentlich sichtbar"
                />
              </CardContent>
            </Card>

            <Button onClick={handleSavePrivacy} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Einstellungen speichern
            </Button>
          </div>
        )}

        {/* Appearance Section */}
        {activeSection === 'appearance' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>
                  Wähle das Erscheinungsbild der App
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1">
                    Hell
                  </Button>
                  <Button variant="default" className="flex-1">
                    Dunkel
                  </Button>
                  <Button variant="outline" className="flex-1">
                    System
                  </Button>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Theme-Änderungen werden in einer zukünftigen Version verfügbar sein.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sprache</CardTitle>
                <CardDescription>
                  Wähle deine bevorzugte Sprache
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button variant="default">
                    Deutsch
                  </Button>
                  <Button variant="outline">
                    English
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

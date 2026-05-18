'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2, Megaphone, RefreshCw, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import api from '@/lib/api-client';
import { toast } from 'sonner';

export default function AdminAnnouncementPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', isActive: true, ctaUrl: '', ctaLabel: '' });
  const [currentVersion, setCurrentVersion] = useState(1);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role !== 'ADMIN') router.push('/dashboard');
  }, [user, authLoading, router]);

  useEffect(() => {
    api.get('/api/community/announcement')
      .then((data: any) => {
        const a = data?.announcement;
        if (a) {
          setForm({ title: a.title, content: a.content, isActive: a.isActive, ctaUrl: a.ctaUrl || '', ctaLabel: a.ctaLabel || '' });
          setCurrentVersion(a.version);
          setHasExisting(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (bumpVersion = false) => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Titel und Inhalt sind Pflichtfelder');
      return;
    }
    setSaving(true);
    try {
      const data: any = await api.put('/api/community/announcement', { ...form, bumpVersion });
      setCurrentVersion(data.announcement.version);
      setHasExisting(true);
      toast.success(bumpVersion ? 'Gespeichert — alle User sehen das Popup erneut' : 'Gespeichert');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <Link href="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Admin Dashboard
        </Link>

        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Megaphone className="h-8 w-8" />
            Popup-Ankündigung
          </h1>
          <p className="text-muted-foreground mt-1">
            Wird beim ersten Besuch jedes Users als Popup angezeigt. Verschwindet erst nach dem Schließen.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ankündigung bearbeiten</CardTitle>
            <CardDescription>
              {hasExisting
                ? `Aktuelle Version: ${currentVersion} · "Version erhöhen" lässt alle User das Popup erneut sehen`
                : 'Noch keine Ankündigung vorhanden — jetzt erstellen'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Aktiv-Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">Popup aktiv</p>
                <p className="text-xs text-muted-foreground">Deaktivieren um das Popup zu verstecken ohne es zu löschen</p>
              </div>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                className={`relative h-6 w-11 rounded-full transition-colors ${form.isActive ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Titel *</label>
              <Input
                placeholder="z.B. Willkommen in der Beta!"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Inhalt *</label>
              <Textarea
                placeholder="Deine Nachricht an alle User..."
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">Zeilenumbrüche werden übernommen.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Button-URL (optional)</label>
              <Input
                placeholder="z.B. /schriftarten-vergleich.html"
                value={form.ctaUrl}
                onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Wird als auffälliger Button angezeigt. Leer lassen = kein Button.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Button-Beschriftung (optional)</label>
              <Input
                placeholder="z.B. Jetzt abstimmen"
                value={form.ctaLabel}
                onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
              />
            </div>

            {/* Vorschau */}
            {(form.title || form.content) && (
              <div className="rounded-lg border-2 border-dashed p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vorschau</p>
                <p className="font-semibold">{form.title || '—'}</p>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{form.content || '—'}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={() => handleSave(false)} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Speichern
              </Button>
              {hasExisting && (
                <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Speichern + allen Usern erneut zeigen
                </Button>
              )}
            </div>

            {hasExisting && !form.isActive && (
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                <EyeOff className="h-4 w-4" />
                Popup ist deaktiviert — wird keinem User angezeigt
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

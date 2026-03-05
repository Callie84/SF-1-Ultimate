'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdCarousel } from '@/components/ads/ad-carousel';
import {
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Loader2,
  Shield,
  ArrowLeft,
  Eye,
  EyeOff,
  Image,
  ExternalLink,
  Megaphone,
  LayoutDashboard,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useAllAds, useCreateAd, useUpdateAd, useDeleteAd, Ad } from '@/hooks/use-ads';
import { useAdZones, useSaveAdZones, ZoneConfig } from '@/hooks/use-ad-zones';
import { AdZoneEditor } from '@/components/admin/AdZoneEditor';
import { toast } from 'sonner';

const EMPTY_FORM = {
  type: 'rectangle' as 'rectangle' | 'square',
  title: '',
  imageUrl: '',
  link: '',
  linkTarget: '_blank' as '_blank' | '_self',
  altText: '',
  isActive: true,
  order: 0,
};

export default function AdminAdsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data, isLoading, refetch } = useAllAds();
  const createAd = useCreateAd();
  const updateAd = useUpdateAd();
  const deleteAd = useDeleteAd();
  const { data: zonesData } = useAdZones();
  const saveZones = useSaveAdZones();

  const [mainTab, setMainTab] = useState<'ads' | 'zones'>('ads');
  const [activeTab, setActiveTab] = useState<'rectangle' | 'square'>('rectangle');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [localZones, setLocalZones] = useState<ZoneConfig[] | null>(null);

  // Sync localZones from backend when loaded
  const currentZones: ZoneConfig[] = localZones ?? (zonesData?.zones as ZoneConfig[]) ?? [];

  const handleSaveZones = async () => {
    try {
      await saveZones.mutateAsync(currentZones);
      setLocalZones(null);
      toast.success('Zonen-Layout gespeichert');
    } catch {
      toast.error('Fehler beim Speichern');
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || user.role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          {authLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Shield className="h-12 w-12 text-destructive" />
              <p className="text-muted-foreground">Kein Zugriff</p>
              <Button asChild><Link href="/dashboard">Zurück</Link></Button>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  const allAds = data?.ads || [];
  const rectAds = allAds.filter((a) => a.type === 'rectangle');
  const squareAds = allAds.filter((a) => a.type === 'square');
  const displayAds = activeTab === 'rectangle' ? rectAds : squareAds;

  const openCreate = (type: 'rectangle' | 'square') => {
    setForm({ ...EMPTY_FORM, type });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (ad: Ad) => {
    setForm({
      type: ad.type,
      title: ad.title,
      imageUrl: ad.imageUrl,
      link: ad.link,
      linkTarget: ad.linkTarget,
      altText: ad.altText,
      isActive: ad.isActive,
      order: ad.order,
    });
    setEditingId(ad._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.imageUrl || !form.link) {
      toast.error('Titel, Bild-URL und Link sind erforderlich');
      return;
    }

    try {
      if (editingId) {
        await updateAd.mutateAsync({ id: editingId, updates: form });
        toast.success('Anzeige aktualisiert');
      } else {
        await createAd.mutateAsync(form as any);
        toast.success('Anzeige erstellt');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      refetch();
    } catch {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" wirklich löschen?`)) return;
    try {
      await deleteAd.mutateAsync(id);
      toast.success('Anzeige gelöscht');
      refetch();
    } catch {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleToggleActive = async (ad: Ad) => {
    try {
      await updateAd.mutateAsync({ id: ad._id, updates: { isActive: !ad.isActive } });
      toast.success(ad.isActive ? 'Anzeige deaktiviert' : 'Anzeige aktiviert');
      refetch();
    } catch {
      toast.error('Fehler');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back */}
        <Link href="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Admin Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Megaphone className="h-8 w-8" />
              Werbeanzeigen
            </h1>
            <p className="text-muted-foreground">Verwalte Rechteck- und Quadrat-Banner für das Karussell</p>
          </div>
          <Button onClick={() => openCreate(activeTab)}>
            <Plus className="mr-2 h-4 w-4" />
            Neue {activeTab === 'rectangle' ? 'Rechteck-' : 'Quadrat-'}Anzeige
          </Button>
        </div>

        {/* Haupt-Tab-Switcher */}
        <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
          <button
            onClick={() => setMainTab('ads')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              mainTab === 'ads' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Megaphone className="h-4 w-4" />
            Anzeigen verwalten
          </button>
          <button
            onClick={() => setMainTab('zones')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              mainTab === 'zones' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Zonen-Layout
          </button>
        </div>

        {/* ── Zonen-Layout Tab ── */}
        {mainTab === 'zones' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5" />
                Werbe-Zonen Layout
              </CardTitle>
              <CardDescription>
                Ziehe Werbebanner per Drag &amp; Drop auf die gewünschte Position. Klicke auf einen platzierten Banner, um Größe und Einstellungen zu ändern.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AdZoneEditor
                zones={currentZones}
                onChange={(z) => setLocalZones(z)}
              />
              <div className="flex items-center gap-3 pt-2 border-t">
                <Button
                  onClick={handleSaveZones}
                  disabled={saveZones.isPending}
                >
                  {saveZones.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Layout speichern &amp; anwenden
                </Button>
                {localZones && (
                  <button
                    onClick={() => setLocalZones(null)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Zurücksetzen
                  </button>
                )}
                {localZones && (
                  <span className="text-xs text-amber-600 font-medium">● Ungespeicherte Änderungen</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Anzeigen Tab ── */}
        {mainTab === 'ads' && <>

        {/* Vorschau */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Vorschau: Rechteck-Banner</CardTitle>
              <CardDescription className="text-xs">Erscheint oben im Hauptbereich (728 × 90 px)</CardDescription>
            </CardHeader>
            <CardContent>
              <AdCarousel type="rectangle" showControls autoPlayInterval={4000} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Vorschau: Quadrat-Banner</CardTitle>
              <CardDescription className="text-xs">Erscheint in der linken Sidebar (300 × 300 px)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-[200px]">
                <AdCarousel type="square" autoPlayInterval={4000} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formular */}
        {showForm && (
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle>{editingId ? 'Anzeige bearbeiten' : 'Neue Anzeige erstellen'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Typ */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setForm({ ...form, type: 'rectangle' })}
                  className={`rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                    form.type === 'rectangle'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  Rechteck (728 × 90)
                </button>
                <button
                  onClick={() => setForm({ ...form, type: 'square' })}
                  className={`rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                    form.type === 'square'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  Quadrat (300 × 300)
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Titel *</label>
                  <Input
                    placeholder="z.B. SeedBank XY - Spring Sale"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Reihenfolge</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Image className="h-3.5 w-3.5" />
                  Bild-URL *
                </label>
                <Input
                  placeholder="https://example.com/banner.jpg"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                />
                {form.imageUrl && (
                  <div className={`mt-2 overflow-hidden rounded border ${form.type === 'rectangle' ? 'h-[60px]' : 'w-[120px] h-[120px]'}`}>
                    <img
                      src={form.imageUrl}
                      alt="Vorschau"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Link-URL *
                  </label>
                  <Input
                    placeholder="https://example.com"
                    value={form.link}
                    onChange={(e) => setForm({ ...form, link: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Alt-Text</label>
                  <Input
                    placeholder="Beschreibung für Barrierefreiheit"
                    value={form.altText}
                    onChange={(e) => setForm({ ...form, altText: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm font-medium">Anzeige aktiv</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.linkTarget === '_blank'}
                    onChange={(e) => setForm({ ...form, linkTarget: e.target.checked ? '_blank' : '_self' })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm font-medium">In neuem Tab öffnen</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => { setShowForm(false); setEditingId(null); setForm({ ...EMPTY_FORM }); }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createAd.isPending || updateAd.isPending}
                >
                  {(createAd.isPending || updateAd.isPending) ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {editingId ? 'Aktualisieren' : 'Erstellen'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
          {(['rectangle', 'square'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'rectangle' ? `Rechteck (${rectAds.length})` : `Quadrat (${squareAds.length})`}
            </button>
          ))}
        </div>

        {/* Ad-Liste */}
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === 'rectangle' ? 'Rechteck-Banner' : 'Quadrat-Banner'} ({displayAds.length})
            </CardTitle>
            <CardDescription>
              {activeTab === 'rectangle'
                ? 'Erscheinen oben im Hauptbereich als horizontales Banner'
                : 'Erscheinen in der linken Sidebar als quadratische Banner'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : displayAds.length > 0 ? (
              <div className="space-y-3">
                {displayAds.map((ad) => (
                  <div
                    key={ad._id}
                    className={`flex items-center gap-4 rounded-lg border p-3 ${
                      !ad.isActive ? 'opacity-50 bg-muted/30' : ''
                    }`}
                  >
                    {/* Bild-Vorschau */}
                    <div
                      className={`flex-shrink-0 overflow-hidden rounded border bg-muted ${
                        ad.type === 'rectangle' ? 'w-24 h-8' : 'w-12 h-12'
                      }`}
                    >
                      {ad.imageUrl ? (
                        <img
                          src={ad.imageUrl}
                          alt={ad.altText || ad.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                          <Image className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{ad.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{ad.link}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium ${
                          ad.isActive
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {ad.isActive ? 'Aktiv' : 'Inaktiv'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Reihenfolge: {ad.order}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleActive(ad)}
                        title={ad.isActive ? 'Deaktivieren' : 'Aktivieren'}
                      >
                        {ad.isActive ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(ad)}
                        title="Bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(ad._id, ad.title)}
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Megaphone className="mb-3 h-10 w-10 opacity-20" />
                <p className="text-sm">Noch keine {activeTab === 'rectangle' ? 'Rechteck-' : 'Quadrat-'}Anzeigen</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => openCreate(activeTab)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Erste Anzeige erstellen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        </> /* Ende ads Tab */}

      </div>
    </DashboardLayout>
  );
}

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
  BarChart2,
  TrendingUp,
  MousePointerClick,
  Euro,
  Calendar,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useAllAds, useCreateAd, useUpdateAd, useDeleteAd, useAdStats, Ad } from '@/hooks/use-ads';
import { useAdZones, useSaveAdZones, ZoneConfig } from '@/hooks/use-ad-zones';
import {
  useAdLayouts,
  useCreateAdLayout,
  useActivateAdLayout,
  useDuplicateAdLayout,
  useDeleteAdLayout,
  AdLayout,
} from '@/hooks/use-ad-layouts';
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
  clientName: '',
  clientEmail: '',
  startDate: '',
  endDate: '',
  budget: '' as string | number,
  cpm: '' as string | number,
};

export default function AdminAdsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data, isLoading, refetch } = useAllAds();
  const createAd = useCreateAd();
  const updateAd = useUpdateAd();
  const deleteAd = useDeleteAd();
  const { data: statsData, isLoading: statsLoading } = useAdStats();
  const { data: zonesData } = useAdZones();
  const saveZones = useSaveAdZones();

  const [mainTab, setMainTab] = useState<'ads' | 'buchungen' | 'zones' | 'layouts'>('ads');
  const [activeTab, setActiveTab] = useState<'rectangle' | 'square'>('rectangle');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [localZones, setLocalZones] = useState<ZoneConfig[] | null>(null);
  const [localSidebarWidth, setLocalSidebarWidth] = useState<number | null>(null);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [useCurrentZones, setUseCurrentZones] = useState(true);
  const [showLayoutForm, setShowLayoutForm] = useState(false);

  const { data: layoutsData, isLoading: layoutsLoading } = useAdLayouts();
  const createLayout = useCreateAdLayout();
  const activateLayout = useActivateAdLayout();
  const duplicateLayout = useDuplicateAdLayout();
  const deleteLayout = useDeleteAdLayout();

  // Sync localZones from backend when loaded
  const currentZones: ZoneConfig[] = localZones ?? (zonesData?.zones as ZoneConfig[]) ?? [];
  const currentSidebarWidth: number = localSidebarWidth ?? zonesData?.sidebarWidth ?? 256;

  const handleSaveZones = async () => {
    try {
      await saveZones.mutateAsync({ zones: currentZones, sidebarWidth: currentSidebarWidth });
      setLocalZones(null);
      setLocalSidebarWidth(null);
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
      clientName: ad.clientName || '',
      clientEmail: ad.clientEmail || '',
      startDate: ad.startDate ? ad.startDate.split('T')[0] : '',
      endDate: ad.endDate ? ad.endDate.split('T')[0] : '',
      budget: ad.budget || '',
      cpm: ad.cpm || '',
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
      const payload = {
        ...form,
        budget: form.budget !== '' ? Number(form.budget) : undefined,
        cpm: form.cpm !== '' ? Number(form.cpm) : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        clientName: form.clientName || undefined,
        clientEmail: form.clientEmail || undefined,
      };
      if (editingId) {
        await updateAd.mutateAsync({ id: editingId, updates: payload });
        toast.success('Anzeige aktualisiert');
      } else {
        await createAd.mutateAsync(payload as any);
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

  const handleCreateLayout = async () => {
    if (!newLayoutName.trim()) return;
    try {
      await createLayout.mutateAsync({
        name: newLayoutName.trim(),
        ...(useCurrentZones && zonesData
          ? { zones: currentZones, sidebarWidth: currentSidebarWidth }
          : {}),
      });
      setNewLayoutName('');
      setShowLayoutForm(false);
      toast.success('Layout erstellt');
    } catch {
      toast.error('Fehler beim Erstellen');
    }
  };

  const handleActivateLayout = async (layout: AdLayout) => {
    try {
      await activateLayout.mutateAsync(layout._id);
      toast.success(`Layout "${layout.name}" aktiviert`);
    } catch {
      toast.error('Fehler beim Aktivieren');
    }
  };

  const handleDuplicateLayout = async (layout: AdLayout) => {
    try {
      await duplicateLayout.mutateAsync(layout._id);
      toast.success(`Layout "${layout.name}" dupliziert`);
    } catch {
      toast.error('Fehler beim Duplizieren');
    }
  };

  const handleDeleteLayout = async (layout: AdLayout) => {
    if (!confirm(`Layout "${layout.name}" wirklich löschen?`)) return;
    try {
      await deleteLayout.mutateAsync(layout._id);
      toast.success('Layout gelöscht');
    } catch (err: any) {
      toast.error(err?.message ?? 'Fehler beim Löschen');
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
            Anzeigen
          </button>
          <button
            onClick={() => setMainTab('buchungen')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              mainTab === 'buchungen' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            Buchungen & Stats
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
          <button
            onClick={() => setMainTab('layouts')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              mainTab === 'layouts' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Save className="h-4 w-4" />
            Layouts
          </button>
        </div>

        {/* ── Buchungen & Stats Tab ── */}
        {mainTab === 'buchungen' && (
          <div className="space-y-4">
            {/* KPI-Karten */}
            {statsData && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <TrendingUp className="h-4 w-4" />Impressionen
                    </div>
                    <p className="text-2xl font-bold">{statsData.totals.impressions.toLocaleString('de')}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <MousePointerClick className="h-4 w-4" />Klicks
                    </div>
                    <p className="text-2xl font-bold">{statsData.totals.clicks.toLocaleString('de')}</p>
                    <p className="text-xs text-muted-foreground">
                      CTR: {statsData.totals.impressions > 0
                        ? ((statsData.totals.clicks / statsData.totals.impressions) * 100).toFixed(2)
                        : '0.00'}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Euro className="h-4 w-4" />Gebuchtes Budget
                    </div>
                    <p className="text-2xl font-bold">{statsData.totals.budget.toLocaleString('de', { style: 'currency', currency: 'EUR' })}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Calendar className="h-4 w-4" />Buchungen
                    </div>
                    <p className="text-2xl font-bold">{statsData.totals.activeBookings}</p>
                    <p className="text-xs text-muted-foreground">{statsData.totals.scheduledBookings} geplant</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Buchungstabelle */}
            <Card>
              <CardHeader>
                <CardTitle>Alle Buchungen</CardTitle>
                <CardDescription>Impressionen, Klicks und CTR pro Anzeige</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {statsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground">Anzeige</th>
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground">Kunde</th>
                          <th className="text-left px-4 py-2 font-medium text-muted-foreground">Zeitraum</th>
                          <th className="text-right px-4 py-2 font-medium text-muted-foreground">Impr.</th>
                          <th className="text-right px-4 py-2 font-medium text-muted-foreground">Klicks</th>
                          <th className="text-right px-4 py-2 font-medium text-muted-foreground">CTR</th>
                          <th className="text-right px-4 py-2 font-medium text-muted-foreground">Budget</th>
                          <th className="text-center px-4 py-2 font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(statsData?.ads || []).map((ad) => (
                          <tr key={ad._id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium truncate max-w-[160px]">{ad.title}</div>
                              <div className="text-xs text-muted-foreground">{ad.type === 'rectangle' ? 'Rechteck' : 'Quadrat'}</div>
                            </td>
                            <td className="px-4 py-3">
                              {ad.clientName ? (
                                <div>
                                  <div className="flex items-center gap-1 text-sm"><User className="h-3 w-3" />{ad.clientName}</div>
                                  {ad.clientEmail && <div className="text-xs text-muted-foreground">{ad.clientEmail}</div>}
                                </div>
                              ) : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {ad.startDate ? new Date(ad.startDate).toLocaleDateString('de') : '—'}
                              {' → '}
                              {ad.endDate ? new Date(ad.endDate).toLocaleDateString('de') : '∞'}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{(ad.impressions || 0).toLocaleString('de')}</td>
                            <td className="px-4 py-3 text-right font-medium">{(ad.clicks || 0).toLocaleString('de')}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{ad.ctr}%</td>
                            <td className="px-4 py-3 text-right">
                              {ad.budget ? <span>{ad.budget.toLocaleString('de', { style: 'currency', currency: 'EUR' })}</span> : <span className="text-muted-foreground text-xs">—</span>}
                              {ad.estimatedRevenue !== null && ad.cpm && (
                                <div className="text-xs text-green-600">+{ad.estimatedRevenue}€ (CPM)</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-[11px] rounded-full px-2 py-0.5 font-medium ${
                                ad.bookingStatus === 'aktiv' ? 'bg-green-500/10 text-green-600' :
                                ad.bookingStatus === 'geplant' ? 'bg-blue-500/10 text-blue-600' :
                                ad.bookingStatus === 'abgelaufen' ? 'bg-muted text-muted-foreground' :
                                'bg-yellow-500/10 text-yellow-600'
                              }`}>
                                {ad.bookingStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(!statsData?.ads || statsData.ads.length === 0) && (
                      <div className="py-10 text-center text-muted-foreground text-sm">Noch keine Buchungsdaten</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

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
                sidebarWidth={currentSidebarWidth}
                onChange={(z) => setLocalZones(z)}
                onSidebarWidthChange={(w) => setLocalSidebarWidth(w)}
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
                {(localZones || localSidebarWidth !== null) && (
                  <button
                    onClick={() => { setLocalZones(null); setLocalSidebarWidth(null); }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Zurücksetzen
                  </button>
                )}
                {(localZones || localSidebarWidth !== null) && (
                  <span className="text-xs text-amber-600 font-medium">● Ungespeicherte Änderungen</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Layouts Tab ── */}
        {mainTab === 'layouts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Zonen-Layout-Templates</h2>
                <p className="text-sm text-muted-foreground">Speichere benannte Snapshots deiner Zonen-Konfiguration und wechsle zwischen ihnen.</p>
              </div>
              <Button size="sm" onClick={() => setShowLayoutForm((v) => !v)}>
                <Plus className="mr-2 h-4 w-4" />
                Neues Layout
              </Button>
            </div>

            {showLayoutForm && (
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <Input
                    placeholder="Layout-Name (z.B. Sidebar groß)"
                    value={newLayoutName}
                    onChange={(e) => setNewLayoutName(e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCurrentZones}
                      onChange={(e) => setUseCurrentZones(e.target.checked)}
                      className="rounded"
                    />
                    Aktuelle Zonen-Konfiguration übernehmen
                  </label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCreateLayout}
                      disabled={!newLayoutName.trim() || createLayout.isPending}
                    >
                      {createLayout.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Erstellen
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowLayoutForm(false)}>
                      Abbrechen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {layoutsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Lade Layouts…
              </div>
            ) : !layoutsData?.layouts?.length ? (
              <p className="text-muted-foreground text-sm">Noch keine Layouts vorhanden. Erstelle dein erstes Layout.</p>
            ) : (
              <div className="space-y-2">
                {layoutsData.layouts.map((layout) => (
                  <Card key={layout._id} className={layout.isActive ? 'border-emerald-500/50' : ''}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {layout.isActive && (
                          <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full font-medium">
                            Aktiv
                          </span>
                        )}
                        <span className="font-medium">{layout.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {new Date(layout.createdAt).toLocaleDateString('de-DE')}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {layout.zones.length} Zonen
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!layout.isActive && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleActivateLayout(layout)}
                            disabled={activateLayout.isPending}
                            className="text-emerald-600 hover:text-emerald-700"
                          >
                            Aktivieren
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDuplicateLayout(layout)}
                          disabled={duplicateLayout.isPending}
                        >
                          Duplizieren
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteLayout(layout)}
                          disabled={layout.isActive || deleteLayout.isPending}
                          className="text-destructive hover:text-destructive disabled:opacity-30"
                        >
                          Löschen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
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

              {/* Buchungsdaten */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                  <User className="h-4 w-4" />Buchungsdaten (optional)
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Kundenname</label>
                    <Input
                      placeholder="Firma / Kontaktperson"
                      value={form.clientName}
                      onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Kunden-E-Mail</label>
                    <Input
                      type="email"
                      placeholder="kunde@beispiel.de"
                      value={form.clientEmail}
                      onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Startdatum</label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Enddatum</label>
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-1"><Euro className="h-3.5 w-3.5" />Budget (€)</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={form.budget}
                      onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />CPM (€/1000)</label>
                    <Input
                      type="number"
                      placeholder="z.B. 5.00"
                      value={form.cpm}
                      onChange={(e) => setForm({ ...form, cpm: e.target.value })}
                    />
                  </div>
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

        {/* Ad-Liste als Karten mit X-Button */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-muted-foreground">
              {activeTab === 'rectangle' ? 'Rechteck-Banner' : 'Quadrat-Banner'} ({displayAds.length})
            </h2>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : displayAds.length > 0 ? (
            <div className={`grid gap-4 ${activeTab === 'rectangle' ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
              {displayAds.map((ad) => (
                <div
                  key={ad._id}
                  className={`group relative rounded-xl border bg-card overflow-hidden shadow-sm transition-opacity ${!ad.isActive ? 'opacity-40' : ''}`}
                >
                  {/* Banner-Bild */}
                  <div className={`relative w-full bg-muted ${activeTab === 'rectangle' ? 'h-[90px]' : 'aspect-square'}`}>
                    {ad.imageUrl ? (
                      <img
                        src={ad.imageUrl}
                        alt={ad.altText || ad.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                        <Image className="h-8 w-8" />
                      </div>
                    )}

                    {/* X-Button oben rechts — löschen */}
                    <button
                      onClick={() => handleDelete(ad._id, ad.title)}
                      className="absolute top-1.5 right-1.5 z-10 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Anzeige löschen"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>

                    {/* Stift-Button oben links — bearbeiten */}
                    <button
                      onClick={() => openEdit(ad)}
                      className="absolute top-1.5 left-1.5 z-10 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary"
                      title="Bearbeiten"
                    >
                      <Edit className="h-3 w-3" />
                    </button>

                    {/* Aktiv/Inaktiv-Badge */}
                    <span className={`absolute bottom-1.5 left-1.5 text-[10px] rounded-full px-1.5 py-0.5 font-medium ${
                      ad.isActive ? 'bg-green-600 text-white' : 'bg-black/50 text-white'
                    }`}>
                      {ad.isActive ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>

                  {/* Info-Zeile unter dem Bild */}
                  <div className="px-3 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{ad.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{ad.link}</p>
                    </div>
                    <button
                      onClick={() => handleToggleActive(ad)}
                      title={ad.isActive ? 'Deaktivieren' : 'Aktivieren'}
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {ad.isActive
                        ? <EyeOff className="h-3.5 w-3.5" />
                        : <Eye className="h-3.5 w-3.5 text-green-600" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border rounded-xl bg-muted/20">
              <Megaphone className="mb-3 h-10 w-10 opacity-20" />
              <p className="text-sm">Noch keine {activeTab === 'rectangle' ? 'Rechteck-' : 'Quadrat-'}Anzeigen</p>
              <Button variant="outline" className="mt-4" onClick={() => openCreate(activeTab)}>
                <Plus className="mr-2 h-4 w-4" />
                Erste Anzeige erstellen
              </Button>
            </div>
          )}
        </div>

        </> /* Ende ads Tab */}

      </div>
    </DashboardLayout>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Leaf,
  Search,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface Strain {
  _id: string;
  name: string;
  slug: string;
  type: string;
  genetics?: string;
  description?: string;
  thc?: number;
  cbd?: number;
  effects?: string[];
  aromas?: string[];
  imageUrl?: string;
  source?: string;
  isActive: boolean;
  createdAt: string;
}

interface StrainStats {
  total: number;
  active: number;
  inactive: number;
  withThcData: number;
  byType: Record<string, number>;
  bySources: Record<string, number>;
}

export default function AdminStrainsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [strains, setStrains] = useState<Strain[]>([]);
  const [stats, setStats] = useState<StrainStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editStrain, setEditStrain] = useState<Strain | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<Strain | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'hybrid',
    genetics: '',
    description: '',
    thc: '',
    cbd: '',
    effects: '',
    aromas: '',
    imageUrl: '',
  });

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const fetchStrains = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        active: 'all',
      });
      if (search) params.set('search', search);
      if (typeFilter !== 'all') params.set('type', typeFilter);

      const response = await apiClient.get(`/api/community/strains?${params}`);
      setStrains(response.strains);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      toast.error('Fehler beim Laden der Strains');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/api/community/strains/stats');
      setStats(response);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchStrains();
      fetchStats();
    }
  }, [user, page, typeFilter]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      const debounce = setTimeout(() => {
        setPage(1);
        fetchStrains();
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [search]);

  const handleToggle = async (strain: Strain) => {
    try {
      await apiClient.post(`/api/community/strains/${strain._id}/toggle`);
      toast.success(`${strain.name} ${strain.isActive ? 'deaktiviert' : 'aktiviert'}`);
      fetchStrains();
      fetchStats();
    } catch (error) {
      toast.error('Fehler beim Umschalten');
    }
  };

  const handleDelete = async () => {
    if (!showDeleteDialog) return;
    try {
      await apiClient.delete(`/api/community/strains/${showDeleteDialog._id}`);
      toast.success('Strain gelöscht');
      setShowDeleteDialog(null);
      fetchStrains();
      fetchStats();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleCreate = async () => {
    try {
      await apiClient.post('/api/community/strains', {
        ...formData,
        thc: formData.thc ? parseFloat(formData.thc) : null,
        cbd: formData.cbd ? parseFloat(formData.cbd) : null,
        effects: formData.effects.split(',').map(e => e.trim()).filter(Boolean),
        aromas: formData.aromas.split(',').map(a => a.trim()).filter(Boolean),
      });
      toast.success('Strain erstellt');
      setShowCreateDialog(false);
      resetForm();
      fetchStrains();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Erstellen');
    }
  };

  const handleUpdate = async () => {
    if (!editStrain) return;
    try {
      await apiClient.put(`/api/community/strains/${editStrain._id}`, {
        ...formData,
        thc: formData.thc ? parseFloat(formData.thc) : null,
        cbd: formData.cbd ? parseFloat(formData.cbd) : null,
        effects: formData.effects.split(',').map(e => e.trim()).filter(Boolean),
        aromas: formData.aromas.split(',').map(a => a.trim()).filter(Boolean),
      });
      toast.success('Strain aktualisiert');
      setEditStrain(null);
      resetForm();
      fetchStrains();
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Aktualisieren');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'hybrid',
      genetics: '',
      description: '',
      thc: '',
      cbd: '',
      effects: '',
      aromas: '',
      imageUrl: '',
    });
  };

  const openEditDialog = (strain: Strain) => {
    setFormData({
      name: strain.name,
      type: strain.type,
      genetics: strain.genetics || '',
      description: strain.description || '',
      thc: strain.thc?.toString() || '',
      cbd: strain.cbd?.toString() || '',
      effects: strain.effects?.join(', ') || '',
      aromas: strain.aromas?.join(', ') || '',
      imageUrl: strain.imageUrl || '',
    });
    setEditStrain(strain);
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'indica': return 'bg-purple-500';
      case 'sativa': return 'bg-yellow-500';
      case 'hybrid': return 'bg-green-500';
      case 'autoflower': return 'bg-blue-500';
      default: return 'bg-gray-500';
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/admin">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <h1 className="text-3xl font-bold">Strain-Verwaltung</h1>
            </div>
            <p className="text-muted-foreground ml-10">
              Verwalte die Cannabis-Strain-Datenbank
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { fetchStrains(); fetchStats(); }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Aktualisieren
            </Button>
            <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Neuer Strain
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-500">Aktiv</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{stats.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-500">Indica</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byType?.indica || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-500">Sativa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byType?.sativa || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-500">Hybrid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.byType?.hybrid || 0}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Suche nach Name oder Beschreibung..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Typ filtern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  <SelectItem value="indica">Indica</SelectItem>
                  <SelectItem value="sativa">Sativa</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="autoflower">Autoflower</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>THC</TableHead>
                      <TableHead>CBD</TableHead>
                      <TableHead>Quelle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {strains.map((strain) => (
                      <TableRow key={strain._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{strain.name}</div>
                            {strain.genetics && (
                              <div className="text-xs text-muted-foreground">{strain.genetics}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeBadgeColor(strain.type)}>
                            {strain.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{strain.thc ? `${strain.thc.toFixed(1)}%` : '-'}</TableCell>
                        <TableCell>{strain.cbd ? `${strain.cbd.toFixed(1)}%` : '-'}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {strain.source || 'manual'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={strain.isActive ? 'default' : 'secondary'}>
                            {strain.isActive ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggle(strain)}
                              title={strain.isActive ? 'Deaktivieren' : 'Aktivieren'}
                            >
                              {strain.isActive ? (
                                <ToggleRight className="h-4 w-4 text-green-500" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(strain)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowDeleteDialog(strain)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Seite {page} von {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Neuen Strain erstellen</DialogTitle>
            <DialogDescription>
              Füge einen neuen Cannabis-Strain zur Datenbank hinzu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Blue Dream"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Typ</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indica">Indica</SelectItem>
                    <SelectItem value="sativa">Sativa</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="autoflower">Autoflower</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="genetics">Genetik</Label>
              <Input
                id="genetics"
                value={formData.genetics}
                onChange={(e) => setFormData({ ...formData, genetics: e.target.value })}
                placeholder="z.B. Blueberry x Haze"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Beschreibe den Strain..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="thc">THC %</Label>
                <Input
                  id="thc"
                  type="number"
                  step="0.1"
                  value={formData.thc}
                  onChange={(e) => setFormData({ ...formData, thc: e.target.value })}
                  placeholder="z.B. 21.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cbd">CBD %</Label>
                <Input
                  id="cbd"
                  type="number"
                  step="0.1"
                  value={formData.cbd}
                  onChange={(e) => setFormData({ ...formData, cbd: e.target.value })}
                  placeholder="z.B. 0.5"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="effects">Effekte (kommagetrennt)</Label>
              <Input
                id="effects"
                value={formData.effects}
                onChange={(e) => setFormData({ ...formData, effects: e.target.value })}
                placeholder="z.B. relaxed, euphoric, creative"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aromas">Aromen (kommagetrennt)</Label>
              <Input
                id="aromas"
                value={formData.aromas}
                onChange={(e) => setFormData({ ...formData, aromas: e.target.value })}
                placeholder="z.B. berry, sweet, earthy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Bild-URL</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name}>
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editStrain} onOpenChange={(open) => !open && setEditStrain(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Strain bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeite die Strain-Daten.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Typ</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indica">Indica</SelectItem>
                    <SelectItem value="sativa">Sativa</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="autoflower">Autoflower</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-genetics">Genetik</Label>
              <Input
                id="edit-genetics"
                value={formData.genetics}
                onChange={(e) => setFormData({ ...formData, genetics: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Beschreibung</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-thc">THC %</Label>
                <Input
                  id="edit-thc"
                  type="number"
                  step="0.1"
                  value={formData.thc}
                  onChange={(e) => setFormData({ ...formData, thc: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cbd">CBD %</Label>
                <Input
                  id="edit-cbd"
                  type="number"
                  step="0.1"
                  value={formData.cbd}
                  onChange={(e) => setFormData({ ...formData, cbd: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-effects">Effekte (kommagetrennt)</Label>
              <Input
                id="edit-effects"
                value={formData.effects}
                onChange={(e) => setFormData({ ...formData, effects: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-aromas">Aromen (kommagetrennt)</Label>
              <Input
                id="edit-aromas"
                value={formData.aromas}
                onChange={(e) => setFormData({ ...formData, aromas: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-imageUrl">Bild-URL</Label>
              <Input
                id="edit-imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStrain(null)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.name}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Strain löschen</DialogTitle>
            <DialogDescription>
              Bist du sicher, dass du "{showDeleteDialog?.name}" unwiderruflich löschen möchtest?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

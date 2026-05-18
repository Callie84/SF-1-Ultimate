'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Bell, BellOff, Plus, Trash2, Loader2, TrendingDown, Package
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface PriceAlert {
  _id: string;
  seedSlug: string;
  targetPrice: number;
  currency: string;
  isActive: boolean;
  notifyOnDiscount: boolean;
  notifyOnRestock: boolean;
  createdAt: string;
  seed?: { name: string; breeder: string };
}

function useAlerts() {
  return useQuery<{ alerts: PriceAlert[] }>({
    queryKey: ['alerts'],
    queryFn: () => apiClient.get('/api/alerts'),
  });
}

function useDeleteAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/alerts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alarm gelöscht');
    },
    onError: () => toast.error('Fehler beim Löschen'),
  });
}

function useDeactivateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/api/alerts/${id}/deactivate`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alarm deaktiviert');
    },
  });
}

function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { seedSlug: string; targetPrice: number; notifyOnDiscount: boolean; notifyOnRestock: boolean }) =>
      apiClient.post('/api/alerts', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Preisalarm erstellt!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Fehler beim Erstellen'),
  });
}

export default function AlertsPage() {
  const { data, isLoading } = useAlerts();
  const deleteAlert = useDeleteAlert();
  const deactivateAlert = useDeactivateAlert();
  const createAlert = useCreateAlert();

  const [form, setForm] = useState({
    seedSlug: '',
    targetPrice: '',
    notifyOnDiscount: true,
    notifyOnRestock: true,
  });
  const [showForm, setShowForm] = useState(false);

  const alerts = data?.alerts || [];
  const activeAlerts = alerts.filter(a => a.isActive);

  const handleCreate = async () => {
    if (!form.seedSlug.trim()) { toast.error('Seed-Slug erforderlich'); return; }
    const price = parseFloat(form.targetPrice);
    if (isNaN(price) || price <= 0) { toast.error('Gültigen Preis eingeben'); return; }

    await createAlert.mutateAsync({
      seedSlug: form.seedSlug.trim(),
      targetPrice: price,
      notifyOnDiscount: form.notifyOnDiscount,
      notifyOnRestock: form.notifyOnRestock,
    });
    setForm({ seedSlug: '', targetPrice: '', notifyOnDiscount: true, notifyOnRestock: true });
    setShowForm(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-7 w-7 text-primary" />
              Preisalarme
            </h1>
            <p className="text-muted-foreground">
              Werde benachrichtigt wenn ein Seed deinen Zielpreis erreicht
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" />
            Neuer Alarm
          </Button>
        </div>

        {/* Create Form */}
        {showForm && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-base">Preisalarm erstellen</CardTitle>
              <CardDescription>
                Gib den Seed-Slug aus der URL ein (z.B. "white-widow-feminized") und deinen Zielpreis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Seed-Slug</Label>
                  <Input
                    placeholder="z.B. white-widow-feminized"
                    value={form.seedSlug}
                    onChange={e => setForm(f => ({ ...f, seedSlug: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Zielpreis (€)</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="z.B. 9.99"
                    value={form.targetPrice}
                    onChange={e => setForm(f => ({ ...f, targetPrice: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-3 sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.notifyOnDiscount}
                      onChange={e => setForm(f => ({ ...f, notifyOnDiscount: e.target.checked }))}
                      className="rounded"
                    />
                    Bei Preissenkung benachrichtigen
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.notifyOnRestock}
                      onChange={e => setForm(f => ({ ...f, notifyOnRestock: e.target.checked }))}
                      className="rounded"
                    />
                    Bei Wiederverfügbarkeit
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleCreate} disabled={createAlert.isPending} className="gap-2">
                  {createAlert.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Alarm erstellen
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Aktive Alarme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{activeAlerts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alerts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Inaktiv</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {alerts.length - activeAlerts.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert List */}
        <Card>
          <CardHeader>
            <CardTitle>Meine Preisalarme</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="py-12 text-center">
                <TrendingDown className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="font-medium mb-1">Keine Preisalarme</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Erstelle einen Alarm und werde benachrichtigt, wenn der Preis sinkt.
                </p>
                <Button onClick={() => setShowForm(true)} variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Ersten Alarm erstellen
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {alerts.map((alert) => (
                  <div key={alert._id} className="flex items-center justify-between py-3 gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        alert.isActive ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        {alert.isActive
                          ? <Bell className="h-4 w-4 text-primary" />
                          : <BellOff className="h-4 w-4 text-muted-foreground" />
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {alert.seed?.name || alert.seedSlug}
                        </div>
                        {alert.seed?.breeder && (
                          <div className="text-xs text-muted-foreground">{alert.seed.breeder}</div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-sm font-semibold text-primary flex items-center gap-1">
                            <TrendingDown className="h-3 w-3" />
                            Ziel: {alert.targetPrice.toFixed(2)}€
                          </span>
                          {alert.notifyOnDiscount && (
                            <Badge variant="secondary" className="text-[10px] py-0">
                              Preissenkung
                            </Badge>
                          )}
                          {alert.notifyOnRestock && (
                            <Badge variant="secondary" className="text-[10px] py-0">
                              <Package className="h-2.5 w-2.5 mr-1" />
                              Restock
                            </Badge>
                          )}
                          {!alert.isActive && (
                            <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
                              Inaktiv
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {alert.isActive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={() => deactivateAlert.mutate(alert._id)}
                          title="Deaktivieren"
                        >
                          <BellOff className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteAlert.mutate(alert._id)}
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

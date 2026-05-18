'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Beaker,
  Pencil,
  Check,
  X,
  Globe,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

interface Product {
  name: string;
  mlPerLiter: number;
  notes?: string;
}

interface ScheduleEntry {
  week: number;
  phase: 'seedling' | 'vegetative' | 'earlyFlowering' | 'lateFlowering' | 'flush';
  products: Product[];
  phTarget?: number;
  ecTarget?: number;
  notes?: string;
}

interface FeedingPlan {
  _id: string;
  name: string;
  description?: string;
  medium: string;
  schedule: ScheduleEntry[];
  isPublic: boolean;
  usageCount: number;
  createdAt: string;
}

const PHASE_LABELS: Record<string, string> = {
  seedling: 'Sämling',
  vegetative: 'Vegetation',
  earlyFlowering: 'Frühe Blüte',
  lateFlowering: 'Späte Blüte',
  flush: 'Spülung',
};

const PHASE_COLORS: Record<string, string> = {
  seedling: 'bg-yellow-100 text-yellow-700',
  vegetative: 'bg-green-100 text-green-700',
  earlyFlowering: 'bg-purple-100 text-purple-700',
  lateFlowering: 'bg-pink-100 text-pink-700',
  flush: 'bg-blue-100 text-blue-700',
};

const EMPTY_PLAN = {
  name: '',
  description: '',
  medium: 'Erde',
  schedule: [] as ScheduleEntry[],
  isPublic: false,
};

function ScheduleEntryRow({ entry, onDelete }: { entry: ScheduleEntry; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Woche {entry.week}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PHASE_COLORS[entry.phase]}`}>
            {PHASE_LABELS[entry.phase]}
          </span>
          <span className="text-xs text-muted-foreground">
            {entry.products.length} Produkt{entry.products.length !== 1 ? 'e' : ''}
          </span>
          {entry.phTarget && <span className="text-xs text-muted-foreground">pH {entry.phTarget}</span>}
          {entry.ecTarget && <span className="text-xs text-muted-foreground">EC {entry.ecTarget}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-destructive hover:text-destructive/80 p-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {open && entry.products.length > 0 && (
        <div className="border-t px-3 py-2 bg-muted/20">
          <div className="space-y-1">
            {entry.products.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground">{p.mlPerLiter} ml/L</span>
              </div>
            ))}
          </div>
          {entry.notes && <p className="text-xs text-muted-foreground mt-2">{entry.notes}</p>}
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, onEdit, onDelete }: {
  plan: FeedingPlan;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const weeks = plan.schedule.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{plan.name}</CardTitle>
              {plan.isPublic ? (
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">{plan.medium}</Badge>
              <span className="text-xs text-muted-foreground">{weeks} Woche{weeks !== 1 ? 'n' : ''}</span>
              {plan.description && (
                <span className="text-xs text-muted-foreground truncate max-w-xs">{plan.description}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(!open)}>
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {open && plan.schedule.length > 0 && (
        <CardContent className="pt-0 space-y-2">
          {plan.schedule.map((entry, i) => (
            <div key={i} className="border rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">W{entry.week}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${PHASE_COLORS[entry.phase]}`}>
                  {PHASE_LABELS[entry.phase]}
                </span>
                {entry.phTarget && <span className="text-xs text-muted-foreground">pH {entry.phTarget}</span>}
                {entry.ecTarget && <span className="text-xs text-muted-foreground">EC {entry.ecTarget}</span>}
              </div>
              {entry.products.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {entry.products.map((p, j) => (
                    <div key={j} className="flex justify-between text-xs">
                      <span>{p.name}</span>
                      <span className="text-muted-foreground">{p.mlPerLiter} ml/L</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function PlanForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: typeof EMPTY_PLAN & { _id?: string };
  onSave: (data: typeof EMPTY_PLAN) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const [newEntry, setNewEntry] = useState<Partial<ScheduleEntry>>({ week: 1, phase: 'vegetative', products: [] });
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', mlPerLiter: 0 });
  const [showEntryForm, setShowEntryForm] = useState(false);

  const addProduct = () => {
    if (!newProduct.name || !newProduct.mlPerLiter) return;
    setNewEntry(prev => ({
      ...prev,
      products: [...(prev.products || []), { name: newProduct.name!, mlPerLiter: newProduct.mlPerLiter!, notes: newProduct.notes }],
    }));
    setNewProduct({ name: '', mlPerLiter: 0 });
  };

  const addEntry = () => {
    if (!newEntry.week || !newEntry.phase) return;
    const entry: ScheduleEntry = {
      week: newEntry.week!,
      phase: newEntry.phase as ScheduleEntry['phase'],
      products: newEntry.products || [],
      phTarget: newEntry.phTarget,
      ecTarget: newEntry.ecTarget,
      notes: newEntry.notes,
    };
    setForm(prev => ({ ...prev, schedule: [...prev.schedule, entry].sort((a, b) => a.week - b.week) }));
    setNewEntry({ week: (newEntry.week || 1) + 1, phase: newEntry.phase, products: [] });
    setShowEntryForm(false);
  };

  const removeEntry = (idx: number) => {
    setForm(prev => ({ ...prev, schedule: prev.schedule.filter((_, i) => i !== idx) }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{initial._id ? 'Plan bearbeiten' : 'Neuer Feeding-Plan'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Name *</label>
            <Input
              placeholder="z.B. Biobizz Grow"
              value={form.name}
              onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Substrat *</label>
            <Input
              placeholder="z.B. Erde, Kokos, Hydro"
              value={form.medium}
              onChange={(e) => setForm(p => ({ ...p, medium: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Beschreibung</label>
          <Textarea
            placeholder="Kurze Beschreibung..."
            rows={2}
            value={form.description}
            onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPublic"
            checked={form.isPublic}
            onChange={(e) => setForm(p => ({ ...p, isPublic: e.target.checked }))}
            className="rounded"
          />
          <label htmlFor="isPublic" className="text-sm">Öffentlich (Community kann Plan sehen)</label>
        </div>

        {/* Schedule */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Wochenplan ({form.schedule.length} Einträge)</span>
            <Button variant="outline" size="sm" onClick={() => setShowEntryForm(!showEntryForm)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Woche hinzufügen
            </Button>
          </div>

          {form.schedule.map((entry, i) => (
            <ScheduleEntryRow key={i} entry={entry} onDelete={() => removeEntry(i)} />
          ))}

          {showEntryForm && (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Woche</label>
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={newEntry.week}
                    onChange={(e) => setNewEntry(p => ({ ...p, week: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Phase</label>
                  <select
                    value={newEntry.phase}
                    onChange={(e) => setNewEntry(p => ({ ...p, phase: e.target.value as ScheduleEntry['phase'] }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {Object.entries(PHASE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">pH-Ziel</label>
                  <Input
                    type="number"
                    min={0}
                    max={14}
                    step={0.1}
                    placeholder="z.B. 6.2"
                    value={newEntry.phTarget || ''}
                    onChange={(e) => setNewEntry(p => ({ ...p, phTarget: parseFloat(e.target.value) || undefined }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">EC-Ziel</label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    placeholder="z.B. 1.4"
                    value={newEntry.ecTarget || ''}
                    onChange={(e) => setNewEntry(p => ({ ...p, ecTarget: parseFloat(e.target.value) || undefined }))}
                  />
                </div>
              </div>

              {/* Produkte */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground font-medium">Produkte</span>
                {(newEntry.products || []).map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b pb-1">
                    <span>{p.name}</span>
                    <span className="text-muted-foreground">{p.mlPerLiter} ml/L</span>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Produktname"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct(p => ({ ...p, name: e.target.value }))}
                  />
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="ml/L"
                      value={newProduct.mlPerLiter || ''}
                      onChange={(e) => setNewProduct(p => ({ ...p, mlPerLiter: parseFloat(e.target.value) || 0 }))}
                    />
                    <Button variant="outline" size="icon" onClick={addProduct} className="flex-shrink-0">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Notizen</label>
                <Input
                  placeholder="Optional..."
                  value={newEntry.notes || ''}
                  onChange={(e) => setNewEntry(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={addEntry}>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Eintrag hinzufügen
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowEntryForm(false)}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Abbrechen
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button disabled={!form.name || !form.medium || isSaving} onClick={() => onSave(form)}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            {initial._id ? 'Aktualisieren' : 'Plan speichern'}
          </Button>
          <Button variant="ghost" onClick={onCancel}>Abbrechen</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FeedingPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editPlan, setEditPlan] = useState<FeedingPlan | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['feeding-plans'],
    queryFn: () => api.get<{ plans: FeedingPlan[] }>('/api/journal/feeding'),
    staleTime: 2 * 60 * 1000,
  });

  const plans = (data as any)?.plans || [];

  const createMutation = useMutation({
    mutationFn: (body: typeof EMPTY_PLAN) => api.post('/api/journal/feeding', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeding-plans'] });
      toast.success('Plan erstellt!');
      setShowForm(false);
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof EMPTY_PLAN }) =>
      api.patch(`/api/journal/feeding/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeding-plans'] });
      toast.success('Plan aktualisiert!');
      setEditPlan(null);
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/journal/feeding/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeding-plans'] });
      toast.success('Plan gelöscht');
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/journal">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Beaker className="h-6 w-6 sm:h-8 sm:w-8" />
              Nährstoff-Pläne
            </h1>
            <p className="text-muted-foreground">Erstelle und verwalte deine Feeding-Pläne</p>
          </div>
          {!showForm && !editPlan && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Neuer Plan
            </Button>
          )}
        </div>

        {showForm && (
          <PlanForm
            initial={EMPTY_PLAN}
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
            isSaving={createMutation.isPending}
          />
        )}

        {editPlan && (() => {
          const ep = editPlan;
          return (
            <PlanForm
              initial={{
                name: ep.name,
                description: ep.description || '',
                medium: ep.medium,
                schedule: ep.schedule,
                isPublic: ep.isPublic,
                _id: ep._id,
              }}
              onSave={(data) => updateMutation.mutate({ id: ep._id, data })}
              onCancel={() => setEditPlan(null)}
              isSaving={updateMutation.isPending}
            />
          );
        })()}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 && !showForm ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Beaker className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Noch keine Feeding-Pläne</h3>
              <p className="text-muted-foreground mb-4">
                Erstelle Nährstoff-Pläne für deine Grows
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ersten Plan erstellen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {plans.map((plan: FeedingPlan) => (
              <PlanCard
                key={plan._id}
                plan={plan}
                onEdit={() => { setEditPlan(plan); setShowForm(false); }}
                onDelete={() => {
                  if (confirm(`Plan "${plan.name}" wirklich löschen?`)) {
                    deleteMutation.mutate(plan._id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

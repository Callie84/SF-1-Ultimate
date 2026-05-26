# Ad Layout Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mehrere benannte Werbezonen-Layouts speichern, aktivieren und zwischen ihnen wechseln.

**Architecture:** Neues `AdLayout` Mongoose-Modell im community-service speichert benannte Snapshots der ZoneConfig. GET `/api/community/ads/zones` liest künftig das aktive Layout (Fallback auf AdZoneConfig). Neuer "Layouts"-Tab im Admin-UI.

**Tech Stack:** Node.js/Express, Mongoose, React/Next.js, TanStack Query, Tailwind, shadcn/ui

---

## Dateiübersicht

| Aktion | Pfad |
|--------|------|
| Erstellen | `apps/community-service/src/models/AdLayout.model.ts` |
| Erstellen | `apps/web-app/src/hooks/use-ad-layouts.ts` |
| Ändern | `apps/community-service/src/routes/ads.routes.ts` |
| Ändern | `apps/web-app/src/app/admin/ads/page.tsx` |

---

### Task 1: AdLayout Mongoose-Modell

**Files:**
- Create: `apps/community-service/src/models/AdLayout.model.ts`

- [ ] **Step 1: Datei erstellen**

```typescript
// apps/community-service/src/models/AdLayout.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IAdLayoutZone {
  id: string;
  adType: 'rectangle' | 'square';
  width: number;
  height: number;
  isActive: boolean;
  slotCount: 1 | 3;
  slots?: Array<{ html: string; isActive: boolean }>;
}

export interface IAdLayout extends Document {
  name: string;
  zones: IAdLayoutZone[];
  sidebarWidth: number;
  isActive: boolean;
  createdAt: Date;
}

const AdLayoutZoneSchema = new Schema<IAdLayoutZone>(
  {
    id: { type: String, required: true },
    adType: { type: String, enum: ['rectangle', 'square'], required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 112 },
    isActive: { type: Boolean, default: true },
    slotCount: { type: Number, enum: [1, 3], default: 1 },
    slots: [{ html: String, isActive: Boolean }],
  },
  { _id: false }
);

const AdLayoutSchema = new Schema<IAdLayout>(
  {
    name: { type: String, required: true },
    zones: [AdLayoutZoneSchema],
    sidebarWidth: { type: Number, default: 256 },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const AdLayout =
  mongoose.models['AdLayout'] ||
  mongoose.model<IAdLayout>('AdLayout', AdLayoutSchema);
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd /root/SF-1-Ultimate-/apps/community-service
npx tsc --noEmit 2>&1 | head -30
```

Erwartet: keine Fehler für die neue Datei.

- [ ] **Step 3: Commit**

```bash
cd /root/SF-1-Ultimate-
git add apps/community-service/src/models/AdLayout.model.ts
git commit -m "feat(community-service): add AdLayout mongoose model"
```

---

### Task 2: Layout CRUD Routes im community-service

**Files:**
- Modify: `apps/community-service/src/routes/ads.routes.ts`

- [ ] **Step 1: Import ergänzen**

Oben in `ads.routes.ts` nach dem `AdZoneConfig`-Import einfügen:

```typescript
import { AdLayout } from '../models/AdLayout.model';
```

- [ ] **Step 2: GET /layouts — alle Layouts auflisten**

Nach der bestehenden PUT `/zones` Route einfügen:

```typescript
// GET /api/community/ads/layouts — alle Layouts (Admin)
router.get('/layouts', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const layouts = await AdLayout.find().sort({ createdAt: -1 });
    res.json({ layouts });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Laden der Layouts' });
  }
});
```

- [ ] **Step 3: POST /layouts — Layout erstellen**

```typescript
// POST /api/community/ads/layouts — Layout erstellen
router.post('/layouts', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, zones, sidebarWidth } = req.body;
    if (!name) return res.status(400).json({ error: 'Name ist erforderlich' });

    // Falls keine Zones angegeben → aktuellen AdZoneConfig-Stand übernehmen
    let layoutZones = zones;
    let layoutSidebarWidth = sidebarWidth ?? 256;

    if (!layoutZones) {
      const config = await AdZoneConfig.findOne();
      layoutZones = config?.zones ?? [];
      layoutSidebarWidth = config?.sidebarWidth ?? 256;
    }

    const layout = await AdLayout.create({
      name,
      zones: layoutZones,
      sidebarWidth: layoutSidebarWidth,
      isActive: false,
    });

    res.status(201).json({ layout });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Erstellen des Layouts' });
  }
});
```

- [ ] **Step 4: PUT /layouts/:id — Layout umbenennen / Zones updaten**

```typescript
// PUT /api/community/ads/layouts/:id
router.put('/layouts/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, zones, sidebarWidth } = req.body;
    const layout = await AdLayout.findByIdAndUpdate(
      req.params.id,
      { ...(name && { name }), ...(zones && { zones }), ...(sidebarWidth != null && { sidebarWidth }) },
      { new: true }
    );
    if (!layout) return res.status(404).json({ error: 'Layout nicht gefunden' });
    res.json({ layout });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});
```

- [ ] **Step 5: DELETE /layouts/:id — Layout löschen**

```typescript
// DELETE /api/community/ads/layouts/:id
router.delete('/layouts/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const layout = await AdLayout.findById(req.params.id);
    if (!layout) return res.status(404).json({ error: 'Layout nicht gefunden' });
    if (layout.isActive) return res.status(400).json({ error: 'Aktives Layout kann nicht gelöscht werden' });
    await layout.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});
```

- [ ] **Step 6: POST /layouts/:id/activate — Layout aktivieren**

```typescript
// POST /api/community/ads/layouts/:id/activate
router.post('/layouts/:id/activate', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const layout = await AdLayout.findById(req.params.id);
    if (!layout) return res.status(404).json({ error: 'Layout nicht gefunden' });

    // Alle anderen deaktivieren, dann dieses aktivieren
    await AdLayout.updateMany({}, { isActive: false });
    layout.isActive = true;
    await layout.save();

    res.json({ layout });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Aktivieren' });
  }
});
```

- [ ] **Step 7: POST /layouts/:id/duplicate — Layout duplizieren**

```typescript
// POST /api/community/ads/layouts/:id/duplicate
router.post('/layouts/:id/duplicate', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const original = await AdLayout.findById(req.params.id);
    if (!original) return res.status(404).json({ error: 'Layout nicht gefunden' });

    const copy = await AdLayout.create({
      name: `Kopie von ${original.name}`,
      zones: original.zones,
      sidebarWidth: original.sidebarWidth,
      isActive: false,
    });

    res.status(201).json({ layout: copy });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Duplizieren' });
  }
});
```

- [ ] **Step 8: GET /zones anpassen — aktives Layout bevorzugen**

Die bestehende `GET /zones` Route suchen und ersetzen:

```typescript
// GET /api/community/ads/zones — öffentlich (liest aktives Layout, Fallback auf AdZoneConfig)
router.get('/zones', async (req, res) => {
  try {
    // Aktives Layout bevorzugen
    const activeLayout = await AdLayout.findOne({ isActive: true });
    if (activeLayout) {
      return res.json({ zones: activeLayout.zones, sidebarWidth: activeLayout.sidebarWidth });
    }

    // Fallback: AdZoneConfig
    const config = await AdZoneConfig.findOne();
    res.json({
      zones: config?.zones ?? DEFAULT_ZONES,
      sidebarWidth: config?.sidebarWidth ?? 256,
    });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Laden der Zones' });
  }
});
```

- [ ] **Step 9: TypeScript-Check**

```bash
cd /root/SF-1-Ultimate-/apps/community-service
npx tsc --noEmit 2>&1 | head -30
```

Erwartet: keine Fehler.

- [ ] **Step 10: Community-Service neu starten und Routes testen**

```bash
docker restart sf1-community-service
sleep 3
docker logs sf1-community-service --tail 20
```

Erwartet: Service startet ohne Fehler.

```bash
# GET /layouts testen (mit Admin-Token aus .env oder Browser-Cookie)
curl -s http://localhost:3007/api/community/ads/layouts \
  -H "Authorization: Bearer <admin-token>" | jq .
```

Erwartet: `{ "layouts": [] }`

- [ ] **Step 11: Commit**

```bash
cd /root/SF-1-Ultimate-
git add apps/community-service/src/routes/ads.routes.ts
git commit -m "feat(community-service): add AdLayout CRUD routes + update GET /zones"
```

---

### Task 3: Frontend Hook — use-ad-layouts.ts

**Files:**
- Create: `apps/web-app/src/hooks/use-ad-layouts.ts`

- [ ] **Step 1: Hook-Datei erstellen**

```typescript
// apps/web-app/src/hooks/use-ad-layouts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { ZoneConfig } from './use-ad-zones';

export interface AdLayout {
  _id: string;
  name: string;
  zones: ZoneConfig[];
  sidebarWidth: number;
  isActive: boolean;
  createdAt: string;
}

export function useAdLayouts() {
  return useQuery<{ layouts: AdLayout[] }>({
    queryKey: ['ad-layouts'],
    queryFn: () => api.get('/api/community/ads/layouts'),
  });
}

export function useCreateAdLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; zones?: ZoneConfig[]; sidebarWidth?: number }) =>
      api.post('/api/community/ads/layouts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-layouts'] });
    },
  });
}

export function useActivateAdLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/community/ads/layouts/${id}/activate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-layouts'] });
      queryClient.invalidateQueries({ queryKey: ['ad-zones'] });
    },
  });
}

export function useDuplicateAdLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/community/ads/layouts/${id}/duplicate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-layouts'] });
    },
  });
}

export function useDeleteAdLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/community/ads/layouts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-layouts'] });
    },
  });
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd /root/SF-1-Ultimate-/apps/web-app
npx tsc --noEmit 2>&1 | head -30
```

Erwartet: keine Fehler.

- [ ] **Step 3: Commit**

```bash
cd /root/SF-1-Ultimate-
git add apps/web-app/src/hooks/use-ad-layouts.ts
git commit -m "feat(web-app): add use-ad-layouts hook"
```

---

### Task 4: Admin-UI — Layouts-Tab in /admin/ads/page.tsx

**Files:**
- Modify: `apps/web-app/src/app/admin/ads/page.tsx`

- [ ] **Step 1: Imports ergänzen**

Am Anfang der Datei nach den bestehenden Hook-Imports einfügen:

```typescript
import {
  useAdLayouts,
  useCreateAdLayout,
  useActivateAdLayout,
  useDuplicateAdLayout,
  useDeleteAdLayout,
  AdLayout,
} from '@/hooks/use-ad-layouts';
```

- [ ] **Step 2: State für Layouts-Tab ergänzen**

Nach den bestehenden State-Deklarationen einfügen:

```typescript
// Layouts Tab State
const [newLayoutName, setNewLayoutName] = useState('');
const [useCurrentZones, setUseCurrentZones] = useState(true);
const [showLayoutForm, setShowLayoutForm] = useState(false);
```

- [ ] **Step 3: Hooks ergänzen**

Nach den bestehenden Hook-Aufrufen einfügen:

```typescript
const { data: layoutsData, isLoading: layoutsLoading } = useAdLayouts();
const createLayout = useCreateAdLayout();
const activateLayout = useActivateAdLayout();
const duplicateLayout = useDuplicateAdLayout();
const deleteLayout = useDeleteAdLayout();
```

- [ ] **Step 4: Handler-Funktionen ergänzen**

Vor dem `return` Statement einfügen:

```typescript
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
```

- [ ] **Step 5: Tab-Navigation erweitern**

Den bestehenden Tab-Switcher (der `mainTab` setzt) suchen. Er hat aktuell 3 Buttons: `ads`, `buchungen`, `zones`. Einen 4. Button ergänzen:

```tsx
<button
  onClick={() => setMainTab('layouts' as any)}
  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    mainTab === 'layouts'
      ? 'bg-emerald-600 text-white'
      : 'text-gray-400 hover:text-white'
  }`}
>
  Layouts
</button>
```

- [ ] **Step 6: Layouts-Tab-Inhalt einfügen**

Im JSX nach dem `{mainTab === 'zones' && ...}` Block einfügen:

```tsx
{(mainTab as string) === 'layouts' && (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-white">Zonen-Layout-Templates</h2>
      <Button
        size="sm"
        onClick={() => setShowLayoutForm((v) => !v)}
        className="bg-emerald-600 hover:bg-emerald-700"
      >
        + Neues Layout
      </Button>
    </div>

    {showLayoutForm && (
      <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
        <Input
          placeholder="Layout-Name (z.B. Sidebar groß)"
          value={newLayoutName}
          onChange={(e) => setNewLayoutName(e.target.value)}
          className="bg-gray-700 border-gray-600 text-white"
        />
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
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
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Erstellen
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowLayoutForm(false)}
          >
            Abbrechen
          </Button>
        </div>
      </div>
    )}

    {layoutsLoading ? (
      <p className="text-gray-400 text-sm">Lade Layouts…</p>
    ) : !layoutsData?.layouts?.length ? (
      <p className="text-gray-400 text-sm">Noch keine Layouts vorhanden.</p>
    ) : (
      <div className="space-y-2">
        {layoutsData.layouts.map((layout) => (
          <div
            key={layout._id}
            className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3 border border-gray-700"
          >
            <div className="flex items-center gap-3">
              {layout.isActive && (
                <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                  Aktiv
                </span>
              )}
              <span className="text-white font-medium">{layout.name}</span>
              <span className="text-gray-400 text-xs">
                {new Date(layout.createdAt).toLocaleDateString('de-DE')}
              </span>
              <span className="text-gray-500 text-xs">
                {layout.zones.length} Zonen
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!layout.isActive && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleActivateLayout(layout)}
                  disabled={activateLayout.isPending}
                  className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30"
                >
                  Aktivieren
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDuplicateLayout(layout)}
                disabled={duplicateLayout.isPending}
                className="text-gray-400 hover:text-white"
              >
                Duplizieren
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteLayout(layout)}
                disabled={layout.isActive || deleteLayout.isPending}
                className="text-red-400 hover:text-red-300 hover:bg-red-900/30 disabled:opacity-30"
              >
                Löschen
              </Button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 7: TypeScript-Check**

```bash
cd /root/SF-1-Ultimate-/apps/web-app
npx tsc --noEmit 2>&1 | head -40
```

Erwartet: keine Fehler.

- [ ] **Step 8: Frontend-Build testen**

```bash
cd /root/SF-1-Ultimate-/apps/web-app
npx next build 2>&1 | tail -20
```

Erwartet: `✓ Compiled successfully` oder nur Warnungen (keine Fehler).

- [ ] **Step 9: Frontend-Container neu starten**

```bash
docker restart sf1-frontend
sleep 5
docker logs sf1-frontend --tail 20
```

Erwartet: Container startet ohne Fehler.

- [ ] **Step 10: Manueller Test im Browser**

1. `/admin/ads` öffnen → 4. Tab "Layouts" sichtbar ✓
2. "+ Neues Layout" → Name eingeben → "Erstellen" → Toast "Layout erstellt" ✓
3. Zweites Layout erstellen ✓
4. "Aktivieren" auf einem Layout → Badge "Aktiv" erscheint ✓
5. Anderen Tab "Zonen-Layout" öffnen → Reload → Zones entsprechen aktiviertem Layout ✓
6. "Duplizieren" → "Kopie von X" erscheint in Liste ✓
7. Inaktives Layout löschen → verschwindet ✓
8. Aktives Layout löschen → Button disabled ✓

- [ ] **Step 11: Commit**

```bash
cd /root/SF-1-Ultimate-
git add apps/web-app/src/app/admin/ads/page.tsx
git commit -m "feat(web-app): add Layouts tab in /admin/ads with CRUD + activate/duplicate"
```

---

### Task 5: Abschluss

- [ ] **Step 1: DOKUMENTATION.md aktualisieren**

In `/root/SF-1-Ultimate-/DOKUMENTATION.md` neuen Eintrag ergänzen:

```markdown
## Ad Layout Templates [abgeschlossen — 2026-04-30]

**Commits:** [nach Task 4 eintragen]  
**Scope:** Mehrere benannte Werbezonen-Layouts speichern, aktivieren, duplizieren, löschen.  
**Geänderte Dateien:**
- `apps/community-service/src/models/AdLayout.model.ts` (neu)
- `apps/community-service/src/routes/ads.routes.ts` (6 neue Routes + GET /zones angepasst)
- `apps/web-app/src/hooks/use-ad-layouts.ts` (neu)
- `apps/web-app/src/app/admin/ads/page.tsx` (Layouts-Tab)
```

- [ ] **Step 2: Session-Plan aktualisieren**

```bash
# In /root/.claude/session-plan/overview.md s8 auf ✅ setzen
sed -i 's/| s8 | ⏳ /| s8 | ✅ /' /root/.claude/session-plan/overview.md
```

- [ ] **Step 3: s8-Skill löschen**

```bash
rm -rf /root/.claude/skills/s8
```

- [ ] **Step 4: /task-done aufrufen**

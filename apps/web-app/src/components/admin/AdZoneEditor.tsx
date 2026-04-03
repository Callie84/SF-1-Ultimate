'use client';

import { useState, useRef, useCallback } from 'react';
import { ZoneConfig, ZoneId } from '@/hooks/use-ad-zones';
import { Monitor, Smartphone, ToggleLeft, ToggleRight, Info } from 'lucide-react';

// ─── Zonen-Definition ─────────────────────────────────────────────────────────

interface ZoneMeta {
  label: string;
  desc: string;
  defaultW: number;
  defaultH: number;
  // Position im Preview (in %)
  previewTop: number;
  previewLeft: number;
  previewWidth: number;
  previewHeight: number;
  area: 'sidebar' | 'content' | 'page';
  pageLabel?: string;
}

const ZONES: Record<ZoneId, ZoneMeta> = {
  'content-top':    { label: 'Oben (Inhalt)',       desc: 'Leaderboard-Banner über dem Hauptinhalt',     defaultW: 0, defaultH: 112, previewTop: 2,  previewLeft: 26, previewWidth: 72, previewHeight: 14, area: 'content' },
  'content-bottom': { label: 'Unten (Inhalt)',       desc: 'Banner unter dem Hauptinhalt',                 defaultW: 0, defaultH: 90,  previewTop: 82, previewLeft: 26, previewWidth: 72, previewHeight: 14, area: 'content' },
  'sidebar-top':    { label: 'Sidebar Oben',         desc: 'Werbefläche oben in der linken Sidebar',       defaultW: 0, defaultH: 250, previewTop: 2,  previewLeft: 1,  previewWidth: 22, previewHeight: 30, area: 'sidebar' },
  'sidebar-bottom': { label: 'Sidebar Unten',        desc: 'Werbefläche unten in der linken Sidebar',      defaultW: 0, defaultH: 250, previewTop: 62, previewLeft: 1,  previewWidth: 22, previewHeight: 30, area: 'sidebar' },
  'dashboard-top':  { label: 'Dashboard',            desc: 'Nur auf der Dashboard-Seite',                  defaultW: 0, defaultH: 90,  previewTop: 18, previewLeft: 26, previewWidth: 72, previewHeight: 12, area: 'page', pageLabel: 'Dashboard' },
  'community-top':  { label: 'Community',            desc: 'Nur auf der Community-Seite',                  defaultW: 0, defaultH: 90,  previewTop: 18, previewLeft: 26, previewWidth: 72, previewHeight: 12, area: 'page', pageLabel: 'Community' },
  'journal-top':    { label: 'Journal',              desc: 'Nur auf der Journal-Seite',                    defaultW: 0, defaultH: 90,  previewTop: 18, previewLeft: 26, previewWidth: 72, previewHeight: 12, area: 'page', pageLabel: 'Journal' },
  'prices-top':     { label: 'Preisvergleich',       desc: 'Nur auf der Preisvergleichs-Seite',            defaultW: 0, defaultH: 90,  previewTop: 18, previewLeft: 26, previewWidth: 72, previewHeight: 12, area: 'page', pageLabel: 'Preise' },
};

const GLOBAL_ZONES: ZoneId[] = ['content-top', 'content-bottom', 'sidebar-top', 'sidebar-bottom'];
const PAGE_ZONES: ZoneId[] = ['dashboard-top', 'community-top', 'journal-top', 'prices-top'];

const ZONE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  rectangle: { bg: 'rgba(59,130,246,0.25)', border: '#3b82f6', text: '#1d4ed8' },
  square:    { bg: 'rgba(139,92,246,0.25)', border: '#8b5cf6', text: '#6d28d9' },
};

interface Props {
  zones: ZoneConfig[];
  sidebarWidth: number;
  onChange: (zones: ZoneConfig[]) => void;
  onSidebarWidthChange: (w: number) => void;
}

// Custom preview positions (overrides ZONES defaults when user drags)
type PreviewPos = Record<ZoneId, { top: number; left: number } | undefined>;

const SNAP = 5; // snap to 5% grid

function snapTo(val: number): number {
  return Math.round(val / SNAP) * SNAP;
}

export function AdZoneEditor({ zones, sidebarWidth, onChange, onSidebarWidthChange }: Props) {
  const [selectedId, setSelectedId] = useState<ZoneId | null>(null);
  const [activeTab, setActiveTab] = useState<'global' | 'pages'>('global');
  const [previewPos, setPreviewPos] = useState<PreviewPos>({} as PreviewPos);
  const previewRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ id: ZoneId; axis: 'w' | 'h' | 'both'; startX: number; startY: number; startW: number; startH: number } | null>(null);
  const draggingRef = useRef<{ id: ZoneId; startMouseX: number; startMouseY: number; startTop: number; startLeft: number } | null>(null);

  const getZone = (id: ZoneId) => zones.find((z) => z.id === id);
  const isActive = (id: ZoneId) => !!zones.find((z) => z.id === id && z.isActive);

  const toggleZone = (id: ZoneId) => {
    const existing = getZone(id);
    const meta = ZONES[id];
    if (existing) {
      onChange(zones.map((z) => z.id === id ? { ...z, isActive: !z.isActive } : z));
    } else {
      onChange([...zones, { id, adType: 'rectangle', width: meta.defaultW, height: meta.defaultH, isActive: true, slotCount: 1, slots: [] }]);
      setSelectedId(id);
    }
  };

  const setZoneType = (id: ZoneId, adType: 'rectangle' | 'square') => {
    const existing = getZone(id);
    if (existing) {
      onChange(zones.map((z) => z.id === id ? { ...z, adType } : z));
    }
  };

  const updateZone = (id: ZoneId, updates: Partial<ZoneConfig>) => {
    onChange(zones.map((z) => z.id === id ? { ...z, ...updates } : z));
  };

  // Maus-Resize Handler
  const startResize = useCallback((e: React.MouseEvent, id: ZoneId, axis: 'w' | 'h' | 'both') => {
    e.preventDefault();
    e.stopPropagation();
    const zone = getZone(id);
    if (!zone) return;
    resizingRef.current = { id, axis, startX: e.clientX, startY: e.clientY, startW: zone.width || 300, startH: zone.height };

    const onMove = (ev: MouseEvent) => {
      const r = resizingRef.current;
      if (!r) return;
      const dx = ev.clientX - r.startX;
      const dy = ev.clientY - r.startY;
      const updates: Partial<ZoneConfig> = {};
      if (r.axis === 'w' || r.axis === 'both') updates.width = Math.max(100, r.startW + dx);
      if (r.axis === 'h' || r.axis === 'both') updates.height = Math.max(30, r.startH + dy);
      updateZone(r.id, updates);
    };
    const onUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones]);

  // Drag Handler für Preview-Zonen
  const startDrag = useCallback((e: React.MouseEvent, id: ZoneId) => {
    e.preventDefault();
    e.stopPropagation();
    const preview = previewRef.current;
    if (!preview) return;
    const rect = preview.getBoundingClientRect();
    const meta = ZONES[id];
    const curPos = previewPos[id];
    const startTop = curPos?.top ?? meta.previewTop;
    const startLeft = curPos?.left ?? meta.previewLeft;

    draggingRef.current = {
      id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startTop,
      startLeft,
    };
    setSelectedId(id);

    const onMove = (ev: MouseEvent) => {
      const d = draggingRef.current;
      if (!d) return;
      const dx = ((ev.clientX - d.startMouseX) / rect.width) * 100;
      const dy = ((ev.clientY - d.startMouseY) / rect.height) * 100;
      const newTop = Math.max(0, Math.min(85, snapTo(d.startTop + dy)));
      const newLeft = Math.max(0, Math.min(75, snapTo(d.startLeft + dx)));
      setPreviewPos((prev) => ({ ...prev, [d.id]: { top: newTop, left: newLeft } }));
    };
    const onUp = () => {
      draggingRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewPos]);

  const selectedZone = selectedId ? getZone(selectedId) : null;
  const displayZones = activeTab === 'global' ? GLOBAL_ZONES : PAGE_ZONES;

  return (
    <div className="space-y-5">

      {/* Tab */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {(['global', 'pages'] as const).map((t) => (
          <button key={t} onClick={() => { setActiveTab(t); setSelectedId(null); }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${t === activeTab ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t === 'global' ? '🌐 Globale Zonen' : '📄 Seiten-spezifisch'}
          </button>
        ))}
      </div>

      {/* Sidebar-Breite (nur global) */}
      {activeTab === 'global' && (
        <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg border bg-card">
          <span className="text-sm font-medium whitespace-nowrap">Sidebar-Breite:</span>
          <label className="flex items-center gap-1.5 cursor-pointer text-sm">
            <input type="checkbox" checked={sidebarWidth === 0}
              onChange={(e) => onSidebarWidthChange(e.target.checked ? 0 : 256)}
              className="accent-primary" />
            Auto (Inhalt-basiert)
          </label>
          {sidebarWidth !== 0 && (
            <>
              <input type="range" min="180" max="380" step="4" value={sidebarWidth}
                onChange={(e) => onSidebarWidthChange(parseInt(e.target.value))}
                className="flex-1 accent-primary" />
              <span className="text-sm font-mono font-bold text-primary w-16 text-right">{sidebarWidth}px</span>
            </>
          )}
          {sidebarWidth === 0 && (
            <span className="text-sm text-muted-foreground italic">Breite passt sich automatisch dem längsten Navigationseintrag an</span>
          )}
        </div>
      )}

      {/* Zonen-Toggles */}
      <div className={`grid gap-3 ${activeTab === 'pages' ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        {displayZones.map((id) => {
          const active = isActive(id);
          const zone = getZone(id);
          const meta = ZONES[id];
          const selected = selectedId === id;
          return (
            <div key={id}
              onClick={() => { toggleZone(id); if (!active) setSelectedId(id); else setSelectedId(selected ? null : id); }}
              className={`rounded-xl border-2 p-3 cursor-pointer transition-all select-none ${
                active
                  ? selected
                    ? 'border-primary bg-primary/10 shadow-md'
                    : 'border-primary/50 bg-primary/5 hover:border-primary/70'
                  : 'border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">{meta.label}</span>
                {active
                  ? <ToggleRight className="h-5 w-5 text-primary" />
                  : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">{meta.desc}</p>
              {active && zone && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span onClick={(e) => { e.stopPropagation(); setZoneType(id, 'rectangle'); }}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium border cursor-pointer transition-colors ${
                      zone.adType === 'rectangle' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-muted-foreground/30 text-muted-foreground hover:bg-muted'
                    }`}>Rechteck</span>
                  <span onClick={(e) => { e.stopPropagation(); setZoneType(id, 'square'); }}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium border cursor-pointer transition-colors ${
                      zone.adType === 'square' ? 'bg-violet-100 border-violet-400 text-violet-700' : 'border-muted-foreground/30 text-muted-foreground hover:bg-muted'
                    }`}>Quadrat</span>
                  {id === 'content-top' && (
                    <span
                      onClick={(e) => { e.stopPropagation(); updateZone(id, { slotCount: zone.slotCount === 3 ? 1 : 3 }); }}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium border cursor-pointer transition-colors ${
                        zone.slotCount === 3 ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : 'border-muted-foreground/30 text-muted-foreground hover:bg-muted'
                      }`}
                      title="Banner in 3 gleiche Slots aufteilen"
                    >
                      {zone.slotCount === 3 ? '3 Slots ✓' : '3 Slots'}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Visueller Preview (nur global) */}
      {activeTab === 'global' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Live-Vorschau — Zonen mit der Maus verschieben, Unterrand zum Resize ziehen</span>
          </div>
          <div ref={previewRef}
            className="relative rounded-xl border-2 border-muted bg-muted/10 overflow-hidden select-none"
            style={{ height: 320 }}
            onClick={() => setSelectedId(null)}
          >
            {/* Sidebar */}
            <div className="absolute top-0 left-0 bottom-0 bg-muted/40 border-r border-muted-foreground/20 flex items-center justify-center"
              style={{ width: '24%' }}>
              <span className="text-[10px] text-muted-foreground/50 rotate-0">Sidebar</span>
            </div>
            {/* Content */}
            <div className="absolute top-0 right-0 bottom-0 bg-background/30" style={{ left: '25%' }}>
              <div className="absolute inset-[12%] rounded bg-muted/20 border border-dashed border-muted-foreground/20 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground/40">Seiteninhalt</span>
              </div>
            </div>

            {/* Aktive Zonen als Rechtecke — verschiebbar + resizable */}
            {GLOBAL_ZONES.map((id) => {
              const zone = getZone(id);
              if (!zone || !zone.isActive) return null;
              const meta = ZONES[id];
              const colors = ZONE_COLORS[zone.adType];
              const isSelected = selectedId === id;
              const pos = previewPos[id];
              const top = pos?.top ?? meta.previewTop;
              const left = pos?.left ?? meta.previewLeft;
              return (
                <div key={id}
                  onMouseDown={(e) => startDrag(e, id)}
                  className="absolute rounded cursor-grab active:cursor-grabbing transition-shadow"
                  title="Ziehen zum Verschieben"
                  style={{
                    top: `${top}%`,
                    left: `${left}%`,
                    width: `${meta.previewWidth}%`,
                    height: `${meta.previewHeight}%`,
                    background: colors.bg,
                    border: `2px solid ${colors.border}`,
                    outline: isSelected ? `3px solid ${colors.border}` : 'none',
                    outlineOffset: 2,
                    zIndex: isSelected ? 20 : 10,
                    userSelect: 'none',
                  }}
                >
                  <div className="h-full flex flex-col items-center justify-center px-1 pointer-events-none">
                    <span className="text-[9px] font-bold leading-tight text-center" style={{ color: colors.text }}>
                      {meta.label}
                      {id === 'content-top' && zone.slotCount === 3 && (
                        <span className="ml-1 text-emerald-600">[3×]</span>
                      )}
                    </span>
                    <span className="text-[8px] leading-tight" style={{ color: colors.text, opacity: 0.8 }}>
                      {zone.width === 0 ? '100%' : `${zone.width}px`} × {zone.height}px
                    </span>
                    {pos && (
                      <span className="text-[7px] leading-tight opacity-60" style={{ color: colors.text }}>
                        {Math.round(left)}% / {Math.round(top)}%
                      </span>
                    )}
                  </div>
                  {/* Resize-Handle unten */}
                  <div
                    onMouseDown={(e) => startResize(e, id, 'h')}
                    className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize flex items-center justify-center"
                    style={{ zIndex: 30 }}
                    title="Höhe anpassen"
                  >
                    <div className="w-8 h-1 rounded-full bg-current opacity-40" style={{ color: colors.border }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" /> Rechteck-Banner
            <span className="w-2 h-2 rounded-sm bg-violet-400 inline-block ml-2" /> Quadrat-Banner
          </p>
        </div>
      )}

      {/* Größen-Editor für ausgewählte Zone */}
      {selectedId && selectedZone && (
        <div className="rounded-xl border-2 border-primary/40 bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">
              ✏️ {ZONES[selectedId].label} — Größe anpassen
            </h4>
            <button onClick={() => setSelectedId(null)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted">✕ Schließen</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Breite */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Breite</label>
                <span className="text-sm font-mono font-bold text-primary">
                  {selectedZone.width === 0 ? '100% (auto)' : `${selectedZone.width}px`}
                </span>
              </div>
              <input type="range" min="0" max="900" step="10"
                value={selectedZone.width}
                onChange={(e) => updateZone(selectedId, { width: parseInt(e.target.value) })}
                className="w-full accent-primary h-2 cursor-pointer" />
              <div className="flex gap-2">
                {[0, 300, 468, 728, 900].map((w) => (
                  <button key={w} onClick={() => updateZone(selectedId, { width: w })}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                      selectedZone.width === w ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground/30 hover:bg-muted'
                    }`}>
                    {w === 0 ? 'Auto' : `${w}`}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">0 = Volle Breite automatisch</p>
            </div>

            {/* Höhe */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Höhe</label>
                <span className="text-sm font-mono font-bold text-primary">{selectedZone.height}px</span>
              </div>
              <input type="range" min="30" max="600" step="10"
                value={selectedZone.height}
                onChange={(e) => updateZone(selectedId, { height: parseInt(e.target.value) })}
                className="w-full accent-primary h-2 cursor-pointer" />
              <div className="flex gap-2">
                {[60, 90, 112, 120, 250, 300].map((h) => (
                  <button key={h} onClick={() => updateZone(selectedId, { height: h })}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                      selectedZone.height === h ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground/30 hover:bg-muted'
                    }`}>
                    {h}px
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Standard: 112px (Leaderboard) / 250px (Sidebar)</p>
            </div>
          </div>

          {/* Typ-Umschalter */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t">
            <span className="text-sm font-medium">Bannertyp:</span>
            {(['rectangle', 'square'] as const).map((t) => (
              <button key={t} onClick={() => setZoneType(selectedId, t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                  selectedZone.adType === t
                    ? t === 'rectangle' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-violet-100 border-violet-400 text-violet-700'
                    : 'border-muted-foreground/30 text-muted-foreground hover:bg-muted'
                }`}>
                {t === 'rectangle' ? '⬛ Rechteck-Banner (728×90)' : '🟪 Quadrat-Banner (300×300)'}
              </button>
            ))}
          </div>

          {/* Slot-Anzahl (nur content-top) */}
          {selectedId === 'content-top' && (
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t">
              <span className="text-sm font-medium">Slot-Aufteilung:</span>
              {([1, 3] as const).map((n) => (
                <button key={n} onClick={() => updateZone(selectedId, { slotCount: n })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                    (selectedZone.slotCount ?? 1) === n
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                      : 'border-muted-foreground/30 text-muted-foreground hover:bg-muted'
                  }`}>
                  {n === 1 ? '▬ 1 Slot (Standard)' : '▬▬▬ 3 gleiche Slots'}
                </button>
              ))}
              {(selectedZone.slotCount ?? 1) === 3 && (
                <p className="text-xs text-muted-foreground w-full">Banner wird in 3 gleichgroße Werbeflächen aufgeteilt, jeweils mit eigenem Inhalt.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Seiten-spezifisch: Tabelle */}
      {activeTab === 'pages' && (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Seite</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Aktiv</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Typ</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Höhe</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {PAGE_ZONES.map((id) => {
                const zone = getZone(id);
                const meta = ZONES[id];
                const active = isActive(id);
                return (
                  <tr key={id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{meta.pageLabel}</div>
                      <div className="text-[11px] text-muted-foreground">{meta.desc}</div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleZone(id)}
                        className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${active ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                        {active ? 'An' : 'Aus'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {active && zone ? (
                        <div className="flex gap-1">
                          {(['rectangle', 'square'] as const).map((t) => (
                            <button key={t} onClick={() => setZoneType(id, t)}
                              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                                zone.adType === t
                                  ? t === 'rectangle' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-violet-100 border-violet-400 text-violet-700'
                                  : 'border-muted-foreground/30 text-muted-foreground hover:bg-muted'
                              }`}>
                              {t === 'rectangle' ? 'Rechteck' : 'Quadrat'}
                            </button>
                          ))}
                        </div>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {active && zone ? (
                        <div className="flex items-center gap-2">
                          <input type="range" min="30" max="300" step="10"
                            value={zone.height}
                            onChange={(e) => updateZone(id, { height: parseInt(e.target.value) })}
                            className="w-20 accent-primary cursor-pointer" />
                          <span className="text-xs font-mono w-12">{zone.height}px</span>
                        </div>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Aktive Zonen: <strong>{zones.filter((z) => z.isActive).map((z) => ZONES[z.id as ZoneId]?.label).join(', ') || 'Keine'}</strong>. Klicke auf eine Zone-Karte um sie ein-/auszuschalten. Im Vorschau-Bereich kannst du die Zonen anklicken und mit den Schiebereglern anpassen.</p>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { GripVertical, X, Settings, MonitorPlay, Sidebar } from 'lucide-react';
import { ZoneConfig } from '@/hooks/use-ad-zones';

const SLOT_META: Record<string, { label: string; column: 'sidebar' | 'content'; desc: string }> = {
  'sidebar-top': { label: 'Sidebar Oben', column: 'sidebar', desc: 'Ganz oben in der Sidebar' },
  'sidebar-bottom': { label: 'Sidebar Unten', column: 'sidebar', desc: 'Ganz unten in der Sidebar' },
  'content-top': { label: 'Inhalt Oben', column: 'content', desc: 'Über dem Seiteninhalt' },
  'content-bottom': { label: 'Inhalt Unten', column: 'content', desc: 'Unter dem Seiteninhalt' },
};

const ALL_SLOTS = Object.keys(SLOT_META) as ZoneConfig['id'][];
const SIDEBAR_SLOTS: ZoneConfig['id'][] = ['sidebar-top', 'sidebar-bottom'];
const CONTENT_SLOTS: ZoneConfig['id'][] = ['content-top', 'content-bottom'];

interface Props {
  zones: ZoneConfig[];
  onChange: (zones: ZoneConfig[]) => void;
}

export function AdZoneEditor({ zones, onChange }: Props) {
  const [dragSource, setDragSource] = useState<{ type: 'zone'; slotId: string } | { type: 'palette'; adType: 'rectangle' | 'square' } | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const getZone = (slotId: string) =>
    zones.find((z) => z.id === slotId && z.isActive);

  const handleDrop = (targetSlot: ZoneConfig['id']) => {
    setDragOverSlot(null);

    if (!dragSource) return;

    if (dragSource.type === 'palette') {
      // Neue Zone aus Palette → nur wenn Slot leer
      if (getZone(targetSlot)) return;
      const defaultHeight = dragSource.adType === 'rectangle' ? 90 : 250;
      onChange([
        ...zones.filter((z) => z.id !== targetSlot),
        { id: targetSlot, adType: dragSource.adType, width: 0, height: defaultHeight, isActive: true },
      ]);
      setSelectedSlot(targetSlot);
    } else if (dragSource.type === 'zone') {
      const srcSlot = dragSource.slotId;
      if (srcSlot === targetSlot) return;
      const srcZone = getZone(srcSlot);
      if (!srcZone) return;

      // Tauschen: wenn Ziel belegt → swap, sonst nur verschieben
      const targetZone = getZone(targetSlot);
      const newZones = zones.filter((z) => z.id !== srcSlot && z.id !== targetSlot);
      newZones.push({ ...srcZone, id: targetSlot });
      if (targetZone) newZones.push({ ...targetZone, id: srcSlot as ZoneConfig['id'] });
      onChange(newZones);
      setSelectedSlot(targetSlot);
    }

    setDragSource(null);
  };

  const handleRemove = (slotId: string) => {
    onChange(zones.filter((z) => z.id !== slotId));
    if (selectedSlot === slotId) setSelectedSlot(null);
  };

  const handleUpdate = (slotId: string, updates: Partial<ZoneConfig>) => {
    onChange(zones.map((z) => (z.id === slotId ? { ...z, ...updates } : z)));
  };

  const selectedZone = selectedSlot ? getZone(selectedSlot) : null;

  return (
    <div className="space-y-5">
      {/* Palette */}
      <div>
        <p className="text-sm font-medium mb-2 text-muted-foreground">Ziehe einen Anzeigentyp in einen freien Slot:</p>
        <div className="flex gap-3 flex-wrap">
          {(['rectangle', 'square'] as const).map((adType) => (
            <div
              key={adType}
              draggable
              onDragStart={() => setDragSource({ type: 'palette', adType })}
              onDragEnd={() => setDragSource(null)}
              className="cursor-grab active:cursor-grabbing flex items-center gap-2 border-2 border-dashed border-primary/60 rounded-lg px-4 py-2 text-sm font-medium bg-primary/5 hover:bg-primary/10 select-none transition-colors"
            >
              <GripVertical className="h-4 w-4 text-primary" />
              {adType === 'rectangle' ? '⬛ Rechteck-Banner (728 × H px)' : '🟪 Quadrat-Banner (W × H px)'}
            </div>
          ))}
          <div className="text-xs text-muted-foreground flex items-center">
            ← zum Entfernen einfach aus dem Slot in den Papierkorb ziehen
          </div>
        </div>
      </div>

      {/* Visual layout canvas */}
      <div className="border-2 border-muted rounded-xl overflow-hidden bg-muted/10" style={{ height: 400 }}>
        <div className="bg-muted/40 border-b px-3 py-1.5 flex items-center gap-2">
          <MonitorPlay className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Seitenlayout — Vorschau</span>
        </div>

        <div className="flex h-[calc(100%-32px)]">
          {/* Sidebar column */}
          <div className="w-[24%] border-r bg-muted/30 flex flex-col">
            <div className="flex items-center gap-1 px-2 py-1 border-b">
              <Sidebar className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">Sidebar</span>
            </div>
            <div className="flex-1 flex flex-col gap-2 p-2">
              {SIDEBAR_SLOTS.map((slotId) => (
                <ZoneSlot
                  key={slotId}
                  slotId={slotId}
                  zone={getZone(slotId)}
                  isSelected={selectedSlot === slotId}
                  isDragOver={dragOverSlot === slotId}
                  label={SLOT_META[slotId].label}
                  onDragStart={() => setDragSource({ type: 'zone', slotId })}
                  onDragEnd={() => setDragSource(null)}
                  onDragOver={() => setDragOverSlot(slotId)}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={() => handleDrop(slotId)}
                  onSelect={() => setSelectedSlot(selectedSlot === slotId ? null : slotId)}
                  onRemove={() => handleRemove(slotId)}
                  compact
                />
              ))}
            </div>
          </div>

          {/* Content column */}
          <div className="flex-1 flex flex-col p-2 gap-2">
            <ZoneSlot
              slotId="content-top"
              zone={getZone('content-top')}
              isSelected={selectedSlot === 'content-top'}
              isDragOver={dragOverSlot === 'content-top'}
              label="Oben (über Inhalt)"
              onDragStart={() => setDragSource({ type: 'zone', slotId: 'content-top' })}
              onDragEnd={() => setDragSource(null)}
              onDragOver={() => setDragOverSlot('content-top')}
              onDragLeave={() => setDragOverSlot(null)}
              onDrop={() => handleDrop('content-top')}
              onSelect={() => setSelectedSlot(selectedSlot === 'content-top' ? null : 'content-top')}
              onRemove={() => handleRemove('content-top')}
            />
            {/* Mock content */}
            <div className="flex-1 rounded-md bg-muted/20 border border-dashed border-muted-foreground/20 flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground/50">Seiteninhalt</span>
            </div>
            <ZoneSlot
              slotId="content-bottom"
              zone={getZone('content-bottom')}
              isSelected={selectedSlot === 'content-bottom'}
              isDragOver={dragOverSlot === 'content-bottom'}
              label="Unten (unter Inhalt)"
              onDragStart={() => setDragSource({ type: 'zone', slotId: 'content-bottom' })}
              onDragEnd={() => setDragSource(null)}
              onDragOver={() => setDragOverSlot('content-bottom')}
              onDragLeave={() => setDragOverSlot(null)}
              onDrop={() => handleDrop('content-bottom')}
              onSelect={() => setSelectedSlot(selectedSlot === 'content-bottom' ? null : 'content-bottom')}
              onRemove={() => handleRemove('content-bottom')}
            />
          </div>
        </div>
      </div>

      {/* Größen-Editor für ausgewählten Slot */}
      {selectedSlot && selectedZone && (
        <div className="border rounded-xl p-4 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              {SLOT_META[selectedSlot].label} — Größe & Einstellungen
            </h4>
            <button
              onClick={() => setSelectedSlot(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Breite (px) — 0 = automatisch 100%</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="1400"
                  step="10"
                  value={selectedZone.width}
                  onChange={(e) => handleUpdate(selectedSlot, { width: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {selectedZone.width === 0 ? '100%' : `${selectedZone.width}px`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="800"
                step="10"
                value={selectedZone.width}
                onChange={(e) => handleUpdate(selectedSlot, { width: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Höhe (px)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="20"
                  max="800"
                  step="10"
                  value={selectedZone.height}
                  onChange={(e) => handleUpdate(selectedSlot, { height: Math.max(20, parseInt(e.target.value) || 90) })}
                  className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {selectedZone.height}px
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="600"
                step="10"
                value={selectedZone.height}
                onChange={(e) => handleUpdate(selectedSlot, { height: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-1 border-t">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={selectedZone.isActive}
                onChange={(e) => handleUpdate(selectedSlot, { isActive: e.target.checked })}
                className="rounded"
              />
              Zone aktiv (wird auf der Seite angezeigt)
            </label>
            <div className="text-xs text-muted-foreground">
              Typ: <strong>{selectedZone.adType === 'rectangle' ? 'Rechteck-Banner' : 'Quadrat-Banner'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Übersicht aktiver Zonen */}
      <div className="text-xs text-muted-foreground">
        Aktive Zonen: {zones.filter((z) => z.isActive).map((z) => SLOT_META[z.id]?.label).join(', ') || 'Keine'}
      </div>
    </div>
  );
}

// ─── Slot-Komponente ────────────────────────────────────────────────────────

interface SlotProps {
  slotId: string;
  zone?: ZoneConfig;
  isSelected: boolean;
  isDragOver: boolean;
  label: string;
  compact?: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onSelect: () => void;
  onRemove: () => void;
}

function ZoneSlot({
  slotId,
  zone,
  isSelected,
  isDragOver,
  label,
  compact,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onSelect,
  onRemove,
}: SlotProps) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      className={[
        'rounded-lg border-2 border-dashed transition-all duration-150',
        compact ? 'flex-1 min-h-[52px]' : 'h-[60px]',
        isDragOver
          ? 'border-primary bg-primary/15 scale-[1.01]'
          : isSelected
          ? 'border-primary/60 bg-primary/5'
          : 'border-muted-foreground/25 bg-background/50',
      ].join(' ')}
    >
      {zone ? (
        <div
          draggable
          onDragStart={(e) => { e.stopPropagation(); onDragStart(); }}
          onDragEnd={onDragEnd}
          onClick={onSelect}
          className={[
            'h-full w-full rounded-md px-2 py-1 flex items-center gap-2 cursor-grab active:cursor-grabbing select-none transition-colors',
            zone.adType === 'rectangle' ? 'bg-blue-500/15 hover:bg-blue-500/20' : 'bg-violet-500/15 hover:bg-violet-500/20',
            isSelected ? 'ring-2 ring-primary ring-inset' : '',
          ].join(' ')}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold leading-tight truncate">
              {zone.adType === 'rectangle' ? '⬛ Rechteck' : '🟪 Quadrat'}
            </div>
            <div className="text-[9px] text-muted-foreground leading-tight">
              {zone.width === 0 ? '100%' : `${zone.width}px`} × {zone.height}px
              {!zone.isActive && ' · inaktiv'}
            </div>
          </div>
          {isSelected && (
            <Settings className="h-3 w-3 text-primary flex-shrink-0" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="flex-shrink-0 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center gap-0.5 p-1">
          <span className="text-[9px] text-muted-foreground/60 text-center leading-snug">
            {label}
          </span>
          <span className="text-[8px] text-muted-foreground/40">hierher ziehen</span>
        </div>
      )}
    </div>
  );
}

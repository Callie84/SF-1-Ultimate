# Design: Strain-DB — Alle Texte auf Deutsch (s7)

**Datum:** 2026-04-30  
**Status:** Approved  
**Scope:** UI-Layer-Mapping für Strain-Felder effects, flavors, aromas + Meilisearch-Synonyme

---

## Entscheidung: UI-Layer-Mapping (Option A)

MongoDB-Werte bleiben englisch. Übersetzung erfolgt ausschließlich im UI-Layer via `strain-labels.ts`. Meilisearch erhält Synonyme damit deutsche Suche auf englische DB-Werte trifft.

**Begründung:** Kein DB-Eingriff, kein Migrations-Risiko, Imports bleiben unverändert.

---

## 1. strain-labels.ts — Neue Maps

Datei: `/root/SF-1-Ultimate-/apps/web-app/src/lib/strain-labels.ts`

### EFFECTS_LABELS
```
relaxing        → Entspannend
uplifting       → Belebend
energetic       → Energetisierend
creative        → Kreativ
happy           → Glücklich
focused         → Fokussiert
sleepy          → Schläfrig
euphoric        → Euphorisch
calm            → Ruhig
stress-relief   → Stressabbau
pain-relief     → Schmerzlinderung
hungry          → Hungrig
giggly          → Lachanfall
talkative       → Gesprächig
aroused         → Aufgeregt
relaxed         → Entspannt
inspired        → Inspiriert
motivated       → Motiviert
```

### FLAVORS_LABELS (auch für aromas)
```
berry           → Beere
sweet           → Süß
earthy          → Erdig
citrus          → Zitrus
pine            → Kiefer
spicy           → Würzig
fruity          → Fruchtig
herbal          → Kräutig
floral          → Blumig
woody           → Holzig
minty           → Minzig
cheese          → Käsig
diesel          → Diesel
skunk           → Skunk
tropical        → Tropisch
vanilla         → Vanille
grape           → Traube
mango           → Mango
blueberry       → Blaubeere
lemon           → Zitrone
pungent         → Intensiv
pepper          → Pfeffrig
hash            → Haschartig
coffee          → Kaffeeartig
```

### Helper-Funktionen
```typescript
effectLabel(effect: string): string
flavorLabel(flavor: string): string
aromaLabel(aroma: string): string  // alias auf FLAVORS_LABELS
```

Fallback: unbekannte Werte werden unverändert zurückgegeben (kein Error).

---

## 2. UI-Anpassungen

### strain-detail-client.tsx
Datei: `/root/SF-1-Ultimate-/apps/web-app/src/app/strains/[slug]/strain-detail-client.tsx`

- Zeilen ~283–332: `strain.effects.map(e => e)` → `strain.effects.map(effectLabel)`
- Zeilen ~306–318: `strain.aromas.map(a => a)` → `strain.aromas.map(aromaLabel)`
- Zeilen ~320–332: `strain.flavors.map(f => f)` → `strain.flavors.map(flavorLabel)`
- Import in Zeile 21 erweitern: `effectLabel, flavorLabel, aromaLabel` hinzufügen

### strains/page.tsx + compare/page.tsx
Prüfen ob effects/flavors gerendert werden → gleiche Umstellung falls nötig.

---

## 3. Meilisearch-Synonyme

Datei: `/root/SF-1-Ultimate-/apps/search-service/src/config/meilisearch.ts`

Bidirektionale Synonyme für den `strains`-Index:

```typescript
synonyms: {
  "entspannend": ["relaxing", "relaxed"],
  "belebend": ["uplifting"],
  "energetisierend": ["energetic"],
  "kreativ": ["creative"],
  "glücklich": ["happy"],
  "fokussiert": ["focused"],
  "schläfrig": ["sleepy"],
  "euphorisch": ["euphoric"],
  "ruhig": ["calm"],
  "beere": ["berry", "blueberry"],
  "erdig": ["earthy"],
  "zitrus": ["citrus", "lemon"],
  "würzig": ["spicy", "pepper"],
  "kräutig": ["herbal"],
  "fruchtig": ["fruity"],
  "holzig": ["woody"],
  "tropisch": ["tropical"],
}
```

Synonyme werden via Meilisearch-API beim Start des Search-Service gesetzt (bestehende Init-Logik erweitern).

---

## Nicht im Scope

- `genetics`: Freitext (Eigennamen wie "Blueberry x Haze") — keine Übersetzung sinnvoll
- `difficulty`: existiert nicht im Strain-Schema — wird ignoriert
- DB-Migration: ausdrücklich ausgeschlossen
- Admin-Eingabe-Placeholders: bleiben vorerst englisch (Admin-Interface)

---

## Acceptance Criteria

- [ ] Alle effects auf Strain-Karte und Detail-Seite deutsch
- [ ] Alle flavors/aromas auf Strain-Karte und Detail-Seite deutsch
- [ ] Suche auf deutschen Begriffen findet Strains
- [ ] Keine englischen Labels mehr in der UI sichtbar
- [ ] TypeScript: keine Fehler

# Strain-Texte auf Deutsch — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle sichtbaren Strain-Felder (effects, flavors, aromas) in der UI auf Deutsch anzeigen und deutsche Suche via Meilisearch-Synonyme ermöglichen.

**Architecture:** UI-Layer-Mapping — MongoDB-Werte bleiben englisch, `strain-labels.ts` übersetzt beim Rendern. Meilisearch erhält Synonyme für deutsche Suche.

**Tech Stack:** TypeScript, Next.js 14, Meilisearch (npm: meilisearch)

---

## Dateiübersicht

| Datei | Aktion |
|---|---|
| `apps/web-app/src/lib/strain-labels.ts` | Erweitern: +EFFECTS_LABELS, +FLAVORS_LABELS, +3 Helper-Funktionen |
| `apps/web-app/src/app/strains/[slug]/strain-detail-client.tsx` | Import erweitern + Zeilen 290–326 anpassen |
| `apps/web-app/src/app/strains/compare/page.tsx` | Import hinzufügen + Zeilen 174, 192, 373, 381 anpassen |
| `apps/search-service/src/config/meilisearch.ts` | `synonyms` in strains-Config eintragen |

---

## Task 1: strain-labels.ts — Neue Maps und Helper-Funktionen

**Files:**
- Modify: `apps/web-app/src/lib/strain-labels.ts`

- [ ] **Schritt 1: Datei lesen**

```bash
cat apps/web-app/src/lib/strain-labels.ts
```

Erwartung: 36 Zeilen, endet mit `export function seedTypeLabel(...)`.

- [ ] **Schritt 2: EFFECTS_LABELS und FLAVORS_LABELS hinzufügen**

Gesamten Dateiinhalt ersetzen mit:

```typescript
export const TYPE_LABELS: Record<string, string> = {
  indica: 'Indica',
  sativa: 'Sativa',
  hybrid: 'Hybrid',
  autoflower: 'Automatisch blühend',
};

export const SEED_TYPE_LABELS: Record<string, string> = {
  feminized: 'Feminisiert',
  autoflower: 'Automatisch blühend',
  regular: 'Regular',
};

export const CLIMATE_LABELS: Record<string, string> = {
  indoor: 'Innenanbau',
  outdoor: 'Außenanbau',
  both: 'Indoor & Outdoor',
};

export const CBD_LABELS: Record<string, string> = {
  true: 'CBD-reich',
  false: 'THC-dominant',
};

export const EFFECTS_LABELS: Record<string, string> = {
  relaxing: 'Entspannend',
  relaxed: 'Entspannt',
  uplifting: 'Belebend',
  energetic: 'Energetisierend',
  creative: 'Kreativ',
  happy: 'Glücklich',
  focused: 'Fokussiert',
  sleepy: 'Schläfrig',
  euphoric: 'Euphorisch',
  calm: 'Ruhig',
  'stress-relief': 'Stressabbau',
  'pain-relief': 'Schmerzlinderung',
  hungry: 'Hungrig',
  giggly: 'Lachanfall',
  talkative: 'Gesprächig',
  aroused: 'Aufgeregt',
  inspired: 'Inspiriert',
  motivated: 'Motiviert',
  sedated: 'Sediert',
  tingly: 'Kribbelig',
};

export const FLAVORS_LABELS: Record<string, string> = {
  berry: 'Beere',
  sweet: 'Süß',
  earthy: 'Erdig',
  citrus: 'Zitrus',
  pine: 'Kiefer',
  spicy: 'Würzig',
  fruity: 'Fruchtig',
  herbal: 'Kräutig',
  floral: 'Blumig',
  woody: 'Holzig',
  minty: 'Minzig',
  cheese: 'Käsig',
  diesel: 'Diesel',
  skunk: 'Skunk',
  tropical: 'Tropisch',
  vanilla: 'Vanille',
  grape: 'Traube',
  mango: 'Mango',
  blueberry: 'Blaubeere',
  lemon: 'Zitrone',
  pungent: 'Intensiv',
  pepper: 'Pfeffrig',
  hash: 'Haschartig',
  coffee: 'Kaffeeartig',
  lavender: 'Lavendel',
  mint: 'Minze',
  apple: 'Apfel',
  pear: 'Birne',
  peach: 'Pfirsich',
  lime: 'Limette',
};

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

export function climateLabel(climate: string): string {
  return CLIMATE_LABELS[climate] ?? climate;
}

export function seedTypeLabel(seedType: string): string {
  return SEED_TYPE_LABELS[seedType] ?? seedType;
}

export function effectLabel(effect: string): string {
  return EFFECTS_LABELS[effect] ?? effect;
}

export function flavorLabel(flavor: string): string {
  return FLAVORS_LABELS[flavor] ?? flavor;
}

export function aromaLabel(aroma: string): string {
  return FLAVORS_LABELS[aroma] ?? aroma;
}
```

- [ ] **Schritt 3: TypeScript-Check**

```bash
cd apps/web-app && npx tsc --noEmit 2>&1 | grep strain-labels
```

Erwartung: keine Fehler.

- [ ] **Schritt 4: Commit**

```bash
git add apps/web-app/src/lib/strain-labels.ts
git commit -m "feat: add effects/flavors label maps with German translations"
```

---

## Task 2: strain-detail-client.tsx — Helper-Funktionen einsetzen

**Files:**
- Modify: `apps/web-app/src/app/strains/[slug]/strain-detail-client.tsx`

- [ ] **Schritt 1: Import-Zeile erweitern**

Zeile 21 der Datei enthält aktuell:
```typescript
import { typeLabel, climateLabel, seedTypeLabel } from '@/lib/strain-labels';
```

Ersetzen mit:
```typescript
import { typeLabel, climateLabel, seedTypeLabel, effectLabel, flavorLabel, aromaLabel } from '@/lib/strain-labels';
```

- [ ] **Schritt 2: Effects-Render anpassen (Zeile ~290–294)**

Aktuell:
```tsx
{strain.effects.map((effect) => (
  <Badge key={effect} variant="secondary">
    {effect}
  </Badge>
))}
```

Ersetzen mit:
```tsx
{strain.effects.map((effect) => (
  <Badge key={effect} variant="secondary">
    {effectLabel(effect)}
  </Badge>
))}
```

- [ ] **Schritt 3: Aromas-Render anpassen (Zeile ~310–314)**

Aktuell:
```tsx
{strain.aromas.map((a) => (
  <Badge key={a} variant="outline">
    {a}
  </Badge>
))}
```

Ersetzen mit:
```tsx
{strain.aromas.map((a) => (
  <Badge key={a} variant="outline">
    {aromaLabel(a)}
  </Badge>
))}
```

- [ ] **Schritt 4: Flavors-Render anpassen (Zeile ~322–326)**

Aktuell:
```tsx
{strain.flavors.map((f) => (
  <Badge key={f} variant="outline">
    {f}
  </Badge>
))}
```

Ersetzen mit:
```tsx
{strain.flavors.map((f) => (
  <Badge key={f} variant="outline">
    {flavorLabel(f)}
  </Badge>
))}
```

- [ ] **Schritt 5: TypeScript-Check**

```bash
cd apps/web-app && npx tsc --noEmit 2>&1 | grep strain-detail
```

Erwartung: keine Fehler.

- [ ] **Schritt 6: Commit**

```bash
git add apps/web-app/src/app/strains/\[slug\]/strain-detail-client.tsx
git commit -m "feat: translate effects/flavors/aromas in strain detail page"
```

---

## Task 3: compare/page.tsx — Helper-Funktionen einsetzen

**Files:**
- Modify: `apps/web-app/src/app/strains/compare/page.tsx`

Die Datei hat **vier** Render-Stellen für effects/aromas/flavors.

- [ ] **Schritt 1: Import hinzufügen**

Nach Zeile 22 (`import { useStrainSearch, useStrain, Strain } from '@/hooks/use-strains';`) einfügen:
```typescript
import { effectLabel, flavorLabel, aromaLabel } from '@/lib/strain-labels';
```

- [ ] **Schritt 2: Karten-Badge-Render — Effects (Zeile ~174)**

Aktuell:
```tsx
{strain.effects.slice(0, 5).map((effect, i) => (
  <Badge key={i} variant="outline" className="text-xs">
    {effect}
  </Badge>
))}
```

Ersetzen mit:
```tsx
{strain.effects.slice(0, 5).map((effect, i) => (
  <Badge key={i} variant="outline" className="text-xs">
    {effectLabel(effect)}
  </Badge>
))}
```

- [ ] **Schritt 3: Karten-Badge-Render — Aromen/Flavors (Zeile ~192–196)**

Aktuell (im `.map()` nach dem `.slice(0, 5)`):
```tsx
{[...(strain.aromas || []), ...(strain.flavors || [])]
  .filter((v, i, a) => a.indexOf(v) === i)
  .slice(0, 5)
```

Den darauf folgenden `.map()` anpassen. Suche den kompletten Block (ca. Zeile 192–200) und ersetze das innerste `{v}` durch `{aromaLabel(v)}`:

```tsx
{[...(strain.aromas || []), ...(strain.flavors || [])]
  .filter((v, i, a) => a.indexOf(v) === i)
  .slice(0, 5)
  .map((v, i) => (
    <Badge key={i} variant="outline" className="text-xs">
      {aromaLabel(v)}
    </Badge>
  ))}
```

- [ ] **Schritt 4: Tabellen-Render — Effects (Zeile ~373)**

Aktuell:
```tsx
{s.effects?.slice(0, 3).join(', ') || '-'}
```

Ersetzen mit:
```tsx
{s.effects?.slice(0, 3).map(effectLabel).join(', ') || '-'}
```

- [ ] **Schritt 5: Tabellen-Render — Aromen/Flavors (Zeile ~381–384)**

Aktuell:
```tsx
{[...(s.aromas || []), ...(s.flavors || [])]
  .filter((v, i, a) => a.indexOf(v) === i)
  .slice(0, 3)
  .join(', ') || '-'}
```

Ersetzen mit:
```tsx
{[...(s.aromas || []), ...(s.flavors || [])]
  .filter((v, i, a) => a.indexOf(v) === i)
  .slice(0, 3)
  .map(aromaLabel)
  .join(', ') || '-'}
```

- [ ] **Schritt 6: TypeScript-Check**

```bash
cd apps/web-app && npx tsc --noEmit 2>&1 | grep compare
```

Erwartung: keine Fehler.

- [ ] **Schritt 7: Commit**

```bash
git add apps/web-app/src/app/strains/compare/page.tsx
git commit -m "feat: translate effects/aromas in strain compare page"
```

---

## Task 4: Meilisearch-Synonyme für deutsche Suche

**Files:**
- Modify: `apps/search-service/src/config/meilisearch.ts`

- [ ] **Schritt 1: Synonyme in strains-Config eintragen**

In der Datei den `strains`-Block in `INDEX_CONFIGS` (Zeile 27–65) um einen `synonyms`-Key erweitern. Das vollständige `strains`-Objekt wird zu:

```typescript
strains: {
  searchableAttributes: [
    'name',
    'breeder',
    'type',
    'genetics',
    'effects',
    'flavors'
  ],
  filterableAttributes: [
    'type',
    'breeder',
    'thc',
    'cbd',
    'floweringTime',
    'difficulty',
    'indoor',
    'outdoor'
  ],
  sortableAttributes: [
    'name',
    'thc',
    'cbd',
    'floweringTime',
    'popularity',
    'createdAt'
  ],
  rankingRules: [
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
    'popularity:desc'
  ],
  distinctAttribute: 'id',
  stopWords: ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at'],
  synonyms: {
    entspannend: ['relaxing', 'relaxed'],
    entspannt: ['relaxed', 'relaxing'],
    belebend: ['uplifting'],
    energetisierend: ['energetic'],
    kreativ: ['creative'],
    glücklich: ['happy'],
    fokussiert: ['focused'],
    schläfrig: ['sleepy'],
    euphorisch: ['euphoric'],
    ruhig: ['calm'],
    stressabbau: ['stress-relief'],
    schmerzlinderung: ['pain-relief'],
    hungrig: ['hungry'],
    gesprächig: ['talkative'],
    inspiriert: ['inspired'],
    motiviert: ['motivated'],
    beere: ['berry', 'blueberry'],
    erdig: ['earthy'],
    zitrus: ['citrus', 'lemon'],
    kiefer: ['pine'],
    würzig: ['spicy', 'pepper'],
    fruchtig: ['fruity'],
    kräutig: ['herbal'],
    blumig: ['floral'],
    holzig: ['woody'],
    minzig: ['minty', 'mint'],
    käsig: ['cheese'],
    tropisch: ['tropical'],
    traube: ['grape'],
    mango: ['mango'],
    blaubeere: ['blueberry', 'berry'],
    zitrone: ['lemon', 'citrus'],
    intensiv: ['pungent'],
    pfeffrig: ['pepper', 'spicy'],
  }
},
```

- [ ] **Schritt 2: TypeScript-Check**

```bash
cd apps/search-service && npx tsc --noEmit 2>&1 | grep meilisearch
```

Erwartung: keine Fehler (Meilisearch-Settings-Typ akzeptiert `synonyms: Record<string, string[]>`).

- [ ] **Schritt 3: Search-Service neustarten**

```bash
docker restart sf1-search-service
sleep 5
docker logs sf1-search-service --tail 20
```

Erwartung: `[Meilisearch] Updated settings for: strains` im Log.

- [ ] **Schritt 4: Synonyme via API verifizieren**

```bash
curl -s -H "Authorization: Bearer ${MEILISEARCH_KEY}" \
  http://localhost:7700/indexes/strains/settings/synonyms | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('entspannend →', d.get('entspannend', 'NICHT GEFUNDEN'))"
```

Erwartung: `entspannend → ['relaxing', 'relaxed']`

Falls MEILISEARCH_KEY unbekannt:
```bash
grep MEILISEARCH_KEY /root/SF-1-Ultimate-/.env | head -1
```

- [ ] **Schritt 5: Commit**

```bash
git add apps/search-service/src/config/meilisearch.ts
git commit -m "feat: add German synonym mappings to Meilisearch strains index"
```

---

## Task 5: Frontend-Build und manuelle Verifikation

- [ ] **Schritt 1: Frontend neu bauen**

```bash
docker restart sf1-frontend
```

Warten bis der Container wieder `Up` ist:
```bash
docker ps | grep sf1-frontend
```

- [ ] **Schritt 2: Strain-Detail-Seite prüfen**

Eine Strain mit effects/flavors aufrufen (z.B. `/strains/<slug>`). Prüfen:
- Effects-Badges zeigen deutschen Text (z.B. "Entspannend" statt "relaxing")
- Aromen-Badges zeigen deutschen Text (z.B. "Erdig" statt "earthy")
- Geschmack-Badges zeigen deutschen Text

- [ ] **Schritt 3: Compare-Seite prüfen**

`/strains/compare` aufrufen, 2 Strains vergleichen. Prüfen:
- Effekte-Badges in Karten: deutsch
- Tabellen-Zeile "Effekte": deutsch, kommagetrennt
- Tabellen-Zeile "Aromen": deutsch

- [ ] **Schritt 4: Suche auf Deutsch testen**

Im Suchfeld "entspannend" eingeben → soll Strains mit `effects: ["relaxing"]` finden.
Im Suchfeld "erdig" eingeben → soll Strains mit `flavors: ["earthy"]` finden.

- [ ] **Schritt 5: TypeScript-Gesamtcheck**

```bash
cd /root/SF-1-Ultimate-/apps/web-app && npx tsc --noEmit 2>&1 | head -20
```

Erwartung: keine Fehler.

- [ ] **Schritt 6: Abschluss-Commit (falls nötig)**

```bash
git add -A
git status
# nur committen wenn noch unstaged changes existieren
```

---

## Abschluss-Checkliste

- [ ] `overview.md` — s7 auf ✅ setzen: `sed -i 's/| s7 | ⏳/| s7 | ✅/' /root/.claude/session-plan/overview.md`
- [ ] Skill löschen: `rm -rf /root/.claude/skills/s7`
- [ ] `/task-done` aufrufen

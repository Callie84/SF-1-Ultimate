# Seedbanken-Seite + Preise-Verbesserungen — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seedbanken-Seite durchsuchbar + sortierbar machen mit Seed-Preisliste per Bank; Preise-Seite mit Bestpreis-Badge, Bank-Links und Anbieter-Zähler verbessern.

**Architecture:** Price-Service bekommt zwei neue Endpoints (`GET /api/prices/seedbanks` und `GET /api/prices/seedbanks/:slug/seeds`); Frontend-Änderungen nur in `seedbanks/page.tsx` und `prices/page.tsx`.

**Tech Stack:** Express + Mongoose (MongoDB Aggregation), React/Next.js App Router, TanStack Query, Tailwind, shadcn/ui

---

## Datei-Übersicht

| Datei | Aktion |
|-------|--------|
| `apps/price-service/src/routes/prices.routes.ts` | 2 neue Routes hinzufügen |
| `apps/web-app/src/app/seedbanks/page.tsx` | Suchfeld + Sort + seedCount/bestPrice auf Karten + Seeds-Sektion im Accordion |
| `apps/web-app/src/app/prices/page.tsx` | Bestpreis-Badge + Bank-Link + Anbieter-Zähler |

---

## Task 1: Backend — `GET /api/prices/seedbanks` und `GET /api/prices/seedbanks/:slug/seeds`

**Files:**
- Modify: `apps/price-service/src/routes/prices.routes.ts`

Hinweis: Die Frontend-Seite ruft `GET /api/prices/seedbanks` bereits auf — sie schlägt aktuell fehl weil der Endpoint nicht existiert. Der zweite Endpoint (`/:slug/seeds`) ist neu und wird für das Accordion benötigt.

- [ ] **Step 1: Neuen Endpoint `GET /api/prices/seedbanks` hinzufügen**

Direkt VOR `module.exports` / `export default router` in `prices.routes.ts` einfügen. Achtung: Die Route muss VOR allen parametrisierten Routes (`:slug`, `:seedSlug`) definiert werden — Express matcht die erste passende Route.

Füge folgendes VOR dem `router.get('/seed/:slug', ...)` Block ein:

```typescript
/**
 * GET /api/prices/seedbanks
 * Aggregiert alle Seedbanks mit Seed-Anzahl und Bestpreis
 */
router.get('/seedbanks', async (req, res, next) => {
  try {
    const cacheKey = 'seedbanks:overview';
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const agg = await Price.aggregate([
      { $match: { inStock: true, validUntil: { $gte: new Date() } } },
      {
        $group: {
          _id: '$seedbankSlug',
          name: { $first: '$seedbank' },
          bestPrice: { $min: '$price' },
          currency: { $first: '$currency' },
          seedIds: { $addToSet: '$seedId' },
        },
      },
      {
        $project: {
          _id: 0,
          slug: '$_id',
          name: 1,
          bestPrice: 1,
          currency: 1,
          seedCount: { $size: '$seedIds' },
        },
      },
      { $sort: { name: 1 } },
    ]);

    const result = { seedbanks: agg };
    await redis.set(cacheKey, JSON.stringify(result), { EX: 5 * 60 });
    res.json(result);
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 2: Neuen Endpoint `GET /api/prices/seedbanks/:slug/seeds` hinzufügen**

Direkt nach dem `GET /seedbanks` Block einfügen:

```typescript
/**
 * GET /api/prices/seedbanks/:slug/seeds
 * Alle Seeds (mit Preisen) einer bestimmten Seedbank
 */
router.get('/seedbanks/:slug/seeds', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const cacheKey = `seedbanks:seeds:${slug}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const prices = await Price.find({
      seedbankSlug: slug,
      inStock: true,
      validUntil: { $gte: new Date() },
    })
      .sort({ price: 1 })
      .lean();

    // Gruppiere nach seedSlug — günstigstes Angebot pro Seed
    const seedMap = new Map<string, {
      seedSlug: string;
      seedName: string;
      type: string;
      packSize: string;
      price: number;
      currency: string;
      url: string;
      inStock: boolean;
    }>();

    for (const p of prices) {
      if (!seedMap.has(p.seedSlug)) {
        seedMap.set(p.seedSlug, {
          seedSlug: p.seedSlug,
          seedName: p.seedSlug
            .split('-')
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
          type: '',          // Seed-Typ nicht in Price gespeichert
          packSize: p.packSize,
          price: p.price,
          currency: p.currency,
          url: p.affiliateUrl || p.url,
          inStock: p.inStock,
        });
      }
    }

    const seeds = Array.from(seedMap.values()).sort((a, b) => a.price - b.price);
    const result = { seeds, total: seeds.length };
    await redis.set(cacheKey, JSON.stringify(result), { EX: 5 * 60 });
    res.json(result);
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 3: Endpoint manuell testen**

```bash
# Im Price-Service Container testen
docker exec sf1-price-service curl -s http://localhost:3003/api/prices/seedbanks | python3 -m json.tool | head -40
```

Erwartetes Ergebnis: JSON mit `{ seedbanks: [{ slug, name, bestPrice, seedCount, currency }] }`

```bash
# Seeds einer Bank testen (slug aus vorherigem Ergebnis nehmen)
docker exec sf1-price-service curl -s "http://localhost:3003/api/prices/seedbanks/fastbuds/seeds" | python3 -m json.tool | head -40
```

Erwartetes Ergebnis: JSON mit `{ seeds: [...], total: N }`

- [ ] **Step 4: Commit**

```bash
git add apps/price-service/src/routes/prices.routes.ts
git commit -m "feat(price-service): add GET /seedbanks and GET /seedbanks/:slug/seeds endpoints"
```

---

## Task 2: Frontend — Seedbanken-Seite: Suche, Sortierung + Seeds im Accordion

**Files:**
- Modify: `apps/web-app/src/app/seedbanks/page.tsx`

Hinweis: Die Seite hat bereits einen `SeedbankCard`-Accordion der Reviews zeigt. Wir erweitern:
1. `SeedbankPage` bekommt Suchfeld + Sort-State
2. Bank-Karten zeigen `seedCount` + `bestPrice` aus dem neuen Endpoint
3. Im aufgeklappten Accordion erscheint eine Seeds-Sektion VOR den Reviews

- [ ] **Step 1: Neue Imports und Types ergänzen**

Am Anfang von `apps/web-app/src/app/seedbanks/page.tsx` nach dem letzten `import`-Block einfügen:

```typescript
import { Search, ArrowUpDown, ShoppingCart, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
```

Und das bestehende `SeedbankInfo` Interface ersetzen (aktuell hat es nur `slug` und `name`):

```typescript
interface SeedbankInfo {
  slug: string;
  name: string;
  seedCount?: number;
  bestPrice?: number;
  currency?: string;
}
```

- [ ] **Step 2: Seeds-Sektion in `SeedbankCard` hinzufügen**

In der `SeedbankCard` Komponente (Zeile ~88) — direkt NACH der öffnenden `<CardContent>` im aufgeklappten Bereich, VOR dem Review-Formular. Das `isExpanded` Flag existiert bereits.

Füge folgenden State und Query in `SeedbankCard` ein (nach dem bestehenden `deleteReview` useMutation Block):

```typescript
const { data: seedsData, isLoading: seedsLoading } = useQuery({
  queryKey: ['seedbank-seeds', seedbank.slug],
  queryFn: () => api.get<{ seeds: Array<{
    seedSlug: string;
    seedName: string;
    packSize: string;
    price: number;
    currency: string;
    url: string;
    inStock: boolean;
  }>; total: number }>(`/api/prices/seedbanks/${seedbank.slug}/seeds`),
  enabled: isExpanded,
  staleTime: 5 * 60_000,
});

const bankSeeds = (seedsData as any)?.seeds || [];
```

- [ ] **Step 3: Seeds-Sektion im JSX einfügen**

Im `SeedbankCard` JSX — nach `{isExpanded && (` und dem öffnenden `<CardContent>` Tag, VOR dem Review-Abschnitt:

```tsx
{/* Seeds-Sektion */}
{seedsLoading ? (
  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
    <Loader2 className="h-4 w-4 animate-spin" />
    Lade Seeds...
  </div>
) : bankSeeds.length > 0 ? (
  <div className="mb-6">
    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
      <ShoppingCart className="h-3.5 w-3.5" />
      Seeds bei {seedbank.name} ({bankSeeds.length})
    </h4>
    <div className="rounded-lg border overflow-hidden">
      {bankSeeds.slice(0, 8).map((seed: any, idx: number) => (
        <div
          key={seed.seedSlug}
          className={`flex items-center justify-between px-3 py-2 text-sm ${idx > 0 ? 'border-t' : ''}`}
        >
          <div className="flex-1 min-w-0">
            <span className="font-medium truncate block">{seed.seedName}</span>
            <span className="text-xs text-muted-foreground">{seed.packSize}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className="font-bold text-primary">
              {seed.price.toFixed(2)}{seed.currency === 'EUR' ? '€' : seed.currency}
            </span>
            <a
              href={`/api/prices/affiliate/redirect?to=${encodeURIComponent(seed.url)}&seedbank=${encodeURIComponent(seedbank.slug)}&strain=${encodeURIComponent(seed.seedSlug)}&strainName=${encodeURIComponent(seed.seedName)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground hover:bg-primary/90"
            >
              Shop <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      ))}
    </div>
    {bankSeeds.length > 8 && (
      <p className="text-xs text-muted-foreground mt-1 text-center">
        + {bankSeeds.length - 8} weitere Seeds
      </p>
    )}
  </div>
) : null}
```

- [ ] **Step 4: Browse-Sektion in `SeedbanksPage` — Suchfeld + Sort + seedCount/bestPrice**

In der `SeedbanksPage` Funktion — nach den bestehenden `useQuery` Hooks neue States hinzufügen:

```typescript
const [searchQuery, setSearchQuery] = useState('');
const [sortBy, setSortBy] = useState<'name' | 'seeds' | 'price'>('name');
```

Dann die gefilterte/sortierte Liste berechnen (nach `const ratings = ...`):

```typescript
const filteredSeedbanks = seedbanks
  .filter((sb: SeedbankInfo) =>
    sb.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  .sort((a: SeedbankInfo, b: SeedbankInfo) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'seeds') return (b.seedCount || 0) - (a.seedCount || 0);
    if (sortBy === 'price') return (a.bestPrice || 999) - (b.bestPrice || 999);
    return 0;
  });
```

- [ ] **Step 5: Suchfeld + Sort-UI in den JSX-Header der Seite einfügen**

Den bestehenden Header-Block (mit `<h1>Seedbank-Bewertungen</h1>`) durch folgenden ersetzen:

```tsx
<div>
  <h1 className="text-2xl sm:text-3xl font-bold">Seedbanken</h1>
  <p className="text-muted-foreground">
    Preise vergleichen, Seeds entdecken und Shops bewerten
  </p>
</div>

{/* Suche + Sortierung */}
<div className="flex flex-col sm:flex-row gap-3">
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      type="text"
      placeholder="Seedbank suchen..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="pl-10"
    />
  </div>
  <div className="flex items-center gap-2">
    <ArrowUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    <select
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value as 'name' | 'seeds' | 'price')}
      className="h-10 rounded-md border bg-background px-3 text-sm"
    >
      <option value="name">Name A–Z</option>
      <option value="seeds">Meiste Seeds</option>
      <option value="price">Bester Preis</option>
    </select>
  </div>
</div>
```

- [ ] **Step 6: `filteredSeedbanks` statt `seedbanks` rendern + seedCount/bestPrice auf Karten**

Im bestehenden Render-Block `seedbanks.map(...)` durch `filteredSeedbanks.map(...)` ersetzen:

```tsx
{filteredSeedbanks.length === 0 && searchQuery ? (
  <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
    Keine Seedbank gefunden für „{searchQuery}"
  </div>
) : (
  <div className="space-y-3">
    {filteredSeedbanks.map((sb: SeedbankInfo) => (
      <div key={sb.slug} id={sb.slug}>
        <SeedbankCard
          seedbank={sb}
          avgRating={ratings[sb.slug]?.avgRating}
          reviewCount={ratings[sb.slug]?.count}
        />
        {/* seedCount + bestPrice als kleine Info-Zeile unter dem Kartenheader */}
      </div>
    ))}
  </div>
)}
```

Und in der `SeedbankCard` — im Karten-Header (nach dem Bank-Namen, im noch-nicht-expanded Zustand) folgendes ergänzen (in der Nähe der `meta.description` Ausgabe):

```tsx
{/* Seed-Stats */}
<div className="flex items-center gap-3 mt-1 flex-wrap">
  {seedbank.seedCount != null && (
    <span className="text-xs text-muted-foreground">
      {seedbank.seedCount} Seeds verfügbar
    </span>
  )}
  {seedbank.bestPrice != null && (
    <span className="text-xs font-medium text-green-600 dark:text-green-400">
      ab {seedbank.bestPrice.toFixed(2)}€
    </span>
  )}
</div>
```

- [ ] **Step 7: Seite im Browser prüfen**

```bash
# Frontend-Rebuild prüfen ob nötig (Production-Build)
docker logs sf1-web-app --tail 5
```

Navigiere zu `https://seedfinderpro.de/seedbanks` und prüfe:
- Suchfeld filtert die Liste in Echtzeit
- Sortierung wechselt die Reihenfolge
- Bank anklicken → Accordion öffnet mit Seeds-Sektion oben + Reviews darunter
- „Shop"-Button leitet weiter

- [ ] **Step 8: Frontend-Rebuild**

```bash
cd /root/SF-1-Ultimate- && docker-compose up -d --no-deps --build web-app 2>&1 | tail -10
```

Warte bis Container healthy ist:
```bash
watch -n5 'docker ps --format "{{.Names}}\t{{.Status}}" | grep web-app'
```

- [ ] **Step 9: Commit**

```bash
git add apps/web-app/src/app/seedbanks/page.tsx
git commit -m "feat(seedbanks): add search, sort, seedCount/bestPrice display and inline seed list"
```

---

## Task 3: Frontend — Preise-Seite: Bestpreis-Badge + Bank-Link + Anbieter-Zähler

**Files:**
- Modify: `apps/web-app/src/app/prices/page.tsx`

Hinweis: Die Preise sind bereits nach `price` aufsteigend sortiert — `seed.prices[0]` ist immer das günstigste Angebot. Das Bestpreis-Badge braucht daher nur auf `idx === 0` geprüft werden.

- [ ] **Step 1: Import für Link ergänzen**

In `apps/web-app/src/app/prices/page.tsx` — nach den bestehenden Imports:

```typescript
import Link from 'next/link';
```

- [ ] **Step 2: Hilfsfunktion für eindeutige Anbieter-Anzahl**

Nach den `TYPE_COLORS` Konstanten einfügen:

```typescript
function uniqueBankCount(prices: PriceEntry[]): number {
  return new Set(prices.map((p) => p.seedbankSlug || p.seedbank)).size;
}
```

- [ ] **Step 3: Anbieter-Zähler im Seed-Card-Header**

Im Seed-Card-Header Block (Zeile ~317 — wo `seed.prices.length Angebote` steht):

Die bestehende Zeile:
```tsx
{seed.prices && seed.prices.length > 0 && (
  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
    <Package className="h-3 w-3" />
    {seed.prices.length} {seed.prices.length === 1 ? 'Angebot' : 'Angebote'}
  </span>
)}
```

Ersetzen durch:
```tsx
{seed.prices && seed.prices.length > 0 && (
  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
    <Package className="h-3 w-3" />
    {uniqueBankCount(seed.prices)} {uniqueBankCount(seed.prices) === 1 ? 'Anbieter' : 'Anbieter'}
  </span>
)}
```

- [ ] **Step 4: Bestpreis-Kopfzeile in der aufgeklappten Ansicht**

Im Expanded-Block (direkt nach `<div className="border-t bg-muted/30">`, VOR der `seed.prices.map(...)` Schleife) einfügen:

```tsx
{/* Bestpreis-Kopfzeile */}
{seed.prices.length > 0 && (
  <div className="px-4 py-2 flex items-center gap-2 flex-wrap text-sm border-b border-border/50 bg-green-500/5">
    <span className="text-muted-foreground">
      {uniqueBankCount(seed.prices)} Anbieter
    </span>
    <span className="text-muted-foreground">·</span>
    <span>
      Bester Preis:{' '}
      <span className="font-bold text-green-600 dark:text-green-400">
        {seed.prices[0].price.toFixed(2)}€
      </span>
      {' bei '}
      <Link
        href={`/seedbanks#${seed.prices[0].seedbankSlug || seed.prices[0].seedbank.toLowerCase().replace(/\s+/g, '-')}`}
        className="font-medium underline underline-offset-2 hover:text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {seed.prices[0].seedbank}
      </Link>
    </span>
  </div>
)}
```

- [ ] **Step 5: Bestpreis-Badge in der Zeilen-Liste + Bank-Name als Link**

Im `seed.prices.map((price, idx) => ...)` Block — die bestehende Zeile mit `{price.seedbank}` ersetzen:

Bestehend (Zeile ~345):
```tsx
<div className="text-sm font-medium">{price.seedbank}</div>
```

Ersetzen durch:
```tsx
<div className="flex items-center gap-2">
  <Link
    href={`/seedbanks#${price.seedbankSlug || price.seedbank.toLowerCase().replace(/\s+/g, '-')}`}
    className="text-sm font-medium hover:underline"
    onClick={(e) => e.stopPropagation()}
  >
    {price.seedbank}
  </Link>
  {idx === 0 && (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
      Bester Preis
    </span>
  )}
</div>
```

- [ ] **Step 6: Frontend-Rebuild**

```bash
cd /root/SF-1-Ultimate- && docker-compose up -d --no-deps --build web-app 2>&1 | tail -10
```

Warte bis healthy:
```bash
watch -n5 'docker ps --format "{{.Names}}\t{{.Status}}" | grep web-app'
```

- [ ] **Step 7: Manuell testen**

Navigiere zu `https://seedfinderpro.de/prices`:
- Einen Strain suchen (z.B. „AK") → Karte zeigt „X Anbieter" Badge
- Karte anklicken → Kopfzeile „N Anbieter · Bester Preis: €X,XX bei [Bank]" erscheint
- Bank-Name in Kopfzeile und in der Liste ist anklickbar → leitet zu `/seedbanks#<slug>`
- Günstigste Zeile hat „Bester Preis" Badge (grün)

- [ ] **Step 8: Commit**

```bash
git add apps/web-app/src/app/prices/page.tsx
git commit -m "feat(prices): add best-price badge, bank links, unique supplier count"
```

---

## Abschluss-Check

- [ ] `GET /api/prices/seedbanks` gibt `{ seedbanks: [{ slug, name, seedCount, bestPrice, currency }] }` zurück
- [ ] `GET /api/prices/seedbanks/:slug/seeds` gibt `{ seeds: [...], total: N }` zurück
- [ ] Seedbanken-Seite: Suche + Sort funktionieren client-side
- [ ] Seedbanken-Seite: Aufgeklappte Karte zeigt Seeds + Preise + „Shop"-Button
- [ ] Seedbanken-Seite: Bank-Karte hat `id="<slug>"` für Anchor-Links
- [ ] Preise-Seite: Bestpreis-Kopfzeile erscheint im aufgeklappten Zustand
- [ ] Preise-Seite: „Bester Preis"-Badge auf günstigster Zeile
- [ ] Preise-Seite: Bank-Name ist Link zu `/seedbanks#<slug>`
- [ ] Beide Seiten im Production-Build getestet

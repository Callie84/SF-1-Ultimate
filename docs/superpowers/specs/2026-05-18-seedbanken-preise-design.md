# Design: Seedbanken-Seite + Preise-Verbesserungen

**Datum:** 2026-05-18  
**Status:** Approved  
**Projekt:** SF-1 Ultimate (seedfinderpro.de)

---

## Scope

Zwei Features + ein bereits erledigter Bug-Fix:

1. **Seedbanken-Seite** (`/seedbanks`) — suchbar, sortierbar, mit aufklappbaren Seed-Preislisten pro Bank
2. **Preise-Seite** (`/prices`) — Suchergebnis zeigt Anbieter-Anzahl, Bestpreis mit Bank-Name, alles anklickbar
3. **OAuth Bug-Fix** — Google OAuth Credentials eingetragen, Auth-Service neu gestartet ✅ (bereits erledigt)

---

## Feature 1 — Seedbanken-Seite

### Backend: Neuer Aggregations-Endpoint

**Service:** `price-service`  
**Route:** `GET /api/prices/seedbanks`  
**Datei:** `apps/price-service/src/routes/prices.routes.ts`

Aggregiert alle Banken aus der `Price`-Collection:

```typescript
// Response-Format
[
  {
    slug: "fastbuds",
    name: "Fast Buds",
    seedCount: 42,
    bestPrice: 8.90,
    currency: "EUR"
    // avgRating kommt NICHT aus diesem Endpoint — Price-Service hat keinen Zugriff
    // auf Community-Service-Ratings. Frontend lädt Ratings separat via
    // GET /api/community/seedbank-reviews/:bank (bereits vorhanden) oder
    // zeigt Ratings nur wenn Bank-Karte aufgeklappt wird.
  }
]
```

Implementierung via MongoDB Aggregation Pipeline auf dem `Price`-Model:
- `$group` by `seedbankSlug`
- `$min` für `bestPrice`
- `$addToSet` für einzigartige `seedId` → count
- Sortierung standardmäßig nach `name`

Bestehender Endpoint für Seeds einer Bank: `GET /api/prices/search?seedbank=<slug>` — wird wiederverwendet, kein neuer Endpoint nötig.

### Frontend: Seedbanken-Seite

**Datei:** `apps/web-app/src/app/seedbanks/page.tsx`

**Struktur der Seite (von oben nach unten):**

1. **Browse-Sektion (neu, oben)**
   - Suchfeld: filtert Banken in Echtzeit nach Name (client-side, kein API-Call)
   - Sortier-Dropdown: Name A–Z / Beste Bewertung / Meiste Seeds / Bester Preis
   - Bank-Karten-Grid: je Karte:
     - Flag-Emoji + Name
     - „X Seeds verfügbar"
     - „Ab €X,XX" (Bestpreis)
     - Ø-Bewertung (falls vorhanden)
     - `id="<slug>"` auf jeder Karte (für Anchor-Links von `/prices` aus)
   - Klick → klappt auf (Accordion)

2. **Aufgeklappter Bereich (inline, pro Bank)**
   - Tabelle/Liste aller Seeds dieser Bank
   - Spalten: Seed-Name, Typ (Feminized/Auto/Regular), Packgröße, Preis, Lagernd, „Zum Shop"-Button
   - „Zum Shop"-Button = Affiliate-Link (`/api/prices/click?...`)
   - Laden via `GET /api/prices/search?seedbank=<slug>` beim ersten Aufklappen

3. **Review-Sektion (bestehend, unverändert, darunter)**
   - Bestehende Bewertungs-Funktionalität bleibt vollständig erhalten

**State-Management:**
- `expandedBank: string | null` — welche Bank aufgeklappt ist
- `seedsCache: Record<slug, SeedWithPrices[]>` — einmal geladen, gecacht
- `query: string` — Suchfeld-Text
- `sortBy: 'name' | 'rating' | 'seeds' | 'price'` — Sortierung

---

## Feature 2 — Preise-Seite Verbesserungen

**Datei:** `apps/web-app/src/app/prices/page.tsx`

### Änderungen an der Suchergebnis-Darstellung

**Für jeden Seed im Suchergebnis (aufgeklappte Ansicht):**

1. **Neue Kopfzeile über der Anbieter-Liste:**
   ```
   [Seed-Name] · [N] Anbieter · Bester Preis: €X,XX bei [Bank-Name]
   ```
   - Bank-Name = interner Link zu `/seedbanks` (mit `#<slug>` Anchor, scrollt zur Bank)
   - Bester Preis grün hervorgehoben (Badge oder farbiger Text)

2. **Bestpreis-Badge in der Tabellen-Zeile:**
   - Die günstigste Zeile bekommt ein „Bester Preis"-Badge (grün)
   - Bank-Name in jeder Zeile: anklickbar → `/seedbanks#<slug>`
   - Preis-Button: externer Affiliate-Link (unverändert)

3. **Anbieter-Zähler im Seed-Header:**
   - Bestehende Karten-Ansicht bekommt Chip: „7 Anbieter"
   - Sichtbar auch wenn noch nicht aufgeklappt

### Keine Struktur-Änderungen
Die Seite bleibt als eigenständige Route `/prices` erhalten. Kein Merge mit `/seedbanks`.

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `apps/price-service/src/routes/prices.routes.ts` | Neuer `GET /seedbanks` Endpoint |
| `apps/web-app/src/app/seedbanks/page.tsx` | Browse-Sektion + Accordion oben einfügen |
| `apps/web-app/src/app/prices/page.tsx` | Kopfzeile, Bestpreis-Badge, Bank-Links |

---

## Nicht in Scope

- Neue Routen (`/seedbanks/[slug]`) — bewusst nicht, Accordion ist ausreichend
- Meilisearch-Integration für Seedbank-Suche — Overkill, client-side Filter reicht
- Rating-System für Seedbanken ändern — Review-Sektion bleibt unberührt
- Discord OAuth — kein Thema dieser Session

---

## Akzeptanzkriterien

- [ ] `/seedbanks`: Suchfeld filtert Banken in Echtzeit
- [ ] `/seedbanks`: Sortierung nach Name/Bewertung/Seeds/Preis funktioniert
- [ ] `/seedbanks`: Klick auf Bank zeigt Seeds + Preise inline (Accordion)
- [ ] `/seedbanks`: „Zum Shop"-Button leitet über Affiliate-Link weiter
- [ ] `/prices`: Suchergebnis zeigt Anbieter-Anzahl im Seed-Header
- [ ] `/prices`: Bestpreis mit Bank-Name hervorgehoben in Kopfzeile
- [ ] `/prices`: Bank-Name ist interner Link zu `/seedbanks`
- [ ] Google OAuth: Button löst keinen 500-Fehler mehr aus ✅

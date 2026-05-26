# Flavor-Coverage Pipeline — Design Spec
**Datum:** 2026-05-26  
**Status:** Approved  
**Ziel:** Flavor-Coverage von 7% auf 95%+ erhöhen, ausschließlich mit akkuraten Daten

---

## Problem

- 11.647 Seeds in DB, nur 831 (7%) haben Flavor-Daten
- Ursachen:
  1. Seedfinder.eu hat URL-Struktur geändert + Cloudflare-Schutz → aktueller Scraper liefert 0 Treffer
  2. Cron-Batch auf 50 Seeds/Lauf limitiert
  3. Nur 10 englische Flavor-Tags → schlechte Datenqualität
- Flavor-Vokabular: nur 10 englische Tags (earthy, sweet, citrus, pine, diesel, berry, fruity, spicy, lemon, pungent)

---

## Lösung: Zweiphasige Pipeline

### Phase 1 — Lokaler Crawl-Import (Einmalig)

**Datenquelle:** `/root/SF-Brain/strain_output/strains_database.json`  
- 4.503 Strains mit deutschen Freitext-Feldern (`taste`, `description`)
- Einmalig lokal verfügbar, kein externes Netz nötig

**Vorgehen:**
1. Lade alle 4.503 Crawl-Einträge
2. Name-Normalisierung: lowercase, Sonderzeichen entfernen, Hyphens zu Spaces
3. Match gegen Seeds in MongoDB (Name-Match, Breeder optional als Tiebreaker)
4. Extrahiere deutsche Flavor-Tags per Keyword-Patterns aus `taste`-Feld
5. Speichere mit `flavorSource: 'crawl'`

**Erwartung:** ~1.500 neue Seeds mit Flavors (+13% Coverage)

---

### Phase 2 — Seedfinder.eu Scraper (Täglich, kontinuierlich)

**Neue URL-Struktur:** `https://seedfinder.eu/de/strain-info/{name-slug}/{breeder-slug}/`  
**HTTP-Adapter:** Firecrawl (bereits im Stack) statt direktem axios → Cloudflare-Bypass

**Vorgehen:**
1. Priorisiere Seeds: erst ohne jegliche Flavors, dann `flavorSource: 'crawl'`
2. Generiere slugs aus name/breeder (lowercase, spaces → hyphens)
3. Scrappe via Firecrawl, parse Flavor-Tags aus neuer HTML-Struktur
4. Speichere mit `flavorSource: 'seedfinder'`
5. Batch: 200 Seeds/Lauf (statt bisher 50)

**Cron:** täglich 02:00 Uhr (bleibt bestehen)  
**Erwartung:** ~200 Seeds/Tag → 95% Coverage nach ~50 Tagen

---

## Datenmodell

### Seed.model.ts — Erweiterung

```ts
flavorSource: {
  type: String,
  enum: ['crawl', 'seedfinder', 'manual'],
  required: false,
}
```

### Update-Logik (Priorität)

```
manual     → NIEMALS überschreiben
seedfinder → NIEMALS überschreiben (seedfinder ist finale Quelle)
crawl      → überschreibbar durch seedfinder
(leer)     → überschreibbar durch alle
```

---

## Deutsches Flavor-Vokabular (~40 Tags)

Neue Datei: `apps/price-service/src/config/flavor-vocabulary.de.ts`

| Tag (DE) | Erkennungs-Keywords |
|----------|---------------------|
| erdig | erdig, erde, erdige, waldboden, humus |
| fruchtig | fruchtig, frucht, früchte, obst |
| süß | süß, süßlich, zucker, karamel |
| Zitrus | zitrus, zitrone, orange, grapefruit, limette, lime |
| Kiefer | kiefer, pine, kiefern, terpentin |
| Diesel | diesel, kraftstoff, benzin, petroleum |
| Skunk | skunk, stinkend, intensiv, pungent |
| Würzig | würzig, scharf, pfeffer, gewürz |
| Holzig | holzig, holz, holzige, wald |
| Beere | beere, beeren, himbeere, heidelbeere, brombeere |
| Tropisch | tropisch, mango, ananas, papaya, exotisch |
| Blumig | blumig, blume, lavendel, rose, jasmin |
| Minzig | minzig, minze, menthol, kühl |
| Käse | käse, käsig, cheddar |
| Kaffee | kaffee, mokka, espresso |
| Schokolade | schokolade, kakao, nuss |
| Vanille | vanille, vanillig |
| Haselnuss | haselnuss, nuss, nussig, mandel |
| Kräuter | kräuter, krautig, oregano, thymian, salbei |
| Kiefernharz | harz, harzig, resinös |
| Erde | loam, lehm, schwarzerde |
| Lakritz | lakritz, anis, fenchel |
| Sandelholz | sandelholz, zeder, kampfer |
| Ingwer | ingwer, ingwerwurzel |
| Pfirsich | pfirsich, aprikose, nektarine |
| Melone | melone, wassermelone |
| Traube | traube, weintrauben, wein |
| Kirsche | kirsche, kirschen |
| Lemon | lemon, zitrone, zitronig |
| Tabak | tabak, tabakig, rauch |
| Kokosnuss | kokosnuss, kokos |
| Hanf | hanf, cannabis, gras |
| Eukalyptus | eukalyptus, kampfer |
| Rosmarin | rosmarin, basilikum |
| Erdbeere | erdbeere, erdbeer |
| Blaubeere | blaubeere, heidelbeere |
| Honig | honig, honigartig |
| Pflaume | pflaume, zwetschge |
| Pinie | pinie, piniennadel |
| Champagne | champagner, sekt, spritzig |

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `apps/price-service/src/models/Seed.model.ts` | `flavorSource` Feld hinzufügen |
| `apps/price-service/src/config/flavor-vocabulary.de.ts` | Neue Datei — 40 DE Tags |
| `apps/price-service/src/services/crawl-flavor-import.service.ts` | Neue Datei — Phase 1 |
| `apps/price-service/src/services/seedfinder-enrichment.service.ts` | Phase 2 Refactor |
| `apps/price-service/src/index.ts` | Cron Batch 50→200, Phase-1-Endpoint |

---

## Admin-Endpoint (Phase 1 Trigger)

```
POST /api/admin/flavors/import-crawl
→ Startet Phase-1-Import im Hintergrund
→ Response: { queued: true, estimatedSeeds: 4503 }
```

Auth: JWT + ADMIN-Rolle (wie alle /api/admin/* Endpoints)

---

## Erfolgs-Kriterien

- [ ] Phase 1 abgeschlossen: Coverage ≥ 20%
- [ ] Phase 2 läuft: Täglich 200 Seeds ohne Fehler
- [ ] Nach 7 Tagen: Coverage ≥ 35%
- [ ] Kein `manual`-Flavor wird überschrieben
- [ ] `flavorSource` für alle neuen Einträge gesetzt
- [ ] Meilisearch-Index wird nach jedem Batch neu indexiert (flavors sind suchbar)

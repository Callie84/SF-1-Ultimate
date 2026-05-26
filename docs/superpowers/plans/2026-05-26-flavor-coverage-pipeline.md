# Flavor-Coverage Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flavor-Coverage von 7% auf 95%+ erhöhen via zweiphasiger Pipeline: Phase 1 (lokaler Crawl-Import, einmalig), Phase 2 (Seedfinder.eu via Firecrawl, täglich 200 Seeds).

**Architecture:** Phase 1 matched 4.503 gecrawlte Strains per Name gegen DB-Seeds und extrahiert deutsche Flavor-Tags per Vocabulary-Patterns. Phase 2 baut den Seedfinder.eu-Scraper mit korrekter URL und Firecrawl-Adapter neu auf. Ein `flavorSource`-Feld trackt Datenqualität und steuert welche Einträge überschrieben werden dürfen.

**Tech Stack:** TypeScript, Mongoose (MongoDB), Express, Firecrawl API (v0), cheerio, Node.js

---

## Datei-Übersicht

| Datei | Aktion | Zweck |
|-------|--------|-------|
| `apps/price-service/src/models/Seed.model.ts` | Modify | `flavorSource` Feld hinzufügen |
| `apps/price-service/src/config/flavor-vocabulary.de.ts` | Create | 40 deutsche Flavor-Tags mit Keyword-Patterns |
| `apps/price-service/src/services/crawl-flavor-import.service.ts` | Create | Phase 1: Crawl-Daten→DB |
| `apps/price-service/src/services/seedfinder-enrichment.service.ts` | Modify | Phase 2: neue URL + Firecrawl + DE-Vocabulary |
| `apps/price-service/src/index.ts` | Modify | Admin-Endpoint + Cron-Batch 50→200 |

---

## Task 1: `flavorSource` Feld ins Seed-Model

**Files:**
- Modify: `apps/price-service/src/models/Seed.model.ts`

- [ ] **Step 1: ISeed Interface erweitern**

In `Seed.model.ts` nach der Zeile `effects?: string[];` einfügen:

```ts
// Flavor-Datenquelle für Qualitäts-Tracking
flavorSource?: 'crawl' | 'seedfinder' | 'manual';
```

- [ ] **Step 2: Schema erweitern**

Nach `effects: [String],` einfügen:

```ts
flavorSource: {
  type: String,
  enum: ['crawl', 'seedfinder', 'manual'],
},
```

- [ ] **Step 3: Verifikation**

```bash
cd /root/SF-1-Ultimate-
docker exec sf1-price-service node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URL).then(async () => {
  const { Seed } = require('./src/models/Seed.model');
  const s = await Seed.findOne({flavors: {\$not: {\$size: 0}}});
  await Seed.updateOne({_id: s._id}, {\$set: {flavorSource: 'seedfinder'}});
  const updated = await Seed.findById(s._id).lean();
  console.log('flavorSource:', updated.flavorSource);
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
" 2>/dev/null
```

Erwartete Ausgabe: `flavorSource: seedfinder`

- [ ] **Step 4: Commit**

```bash
git -C /root/SF-1-Ultimate- add apps/price-service/src/models/Seed.model.ts
git -C /root/SF-1-Ultimate- commit -m "feat: add flavorSource field to Seed model"
```

---

## Task 2: Deutsches Flavor-Vokabular

**Files:**
- Create: `apps/price-service/src/config/flavor-vocabulary.de.ts`

- [ ] **Step 1: Datei anlegen**

```ts
// Deutsches Flavor-Vokabular für Cannabis-Strains
// Jeder Eintrag: { tag: string, keywords: string[] }
// Keywords werden case-insensitiv gegen Freitext gematcht

export interface FlavorEntry {
  tag: string;
  keywords: string[];
}

export const DE_FLAVOR_VOCABULARY: FlavorEntry[] = [
  { tag: 'erdig',        keywords: ['erdig', 'erde', 'erdige', 'waldboden', 'humus', 'earthy'] },
  { tag: 'fruchtig',     keywords: ['fruchtig', 'frucht', 'früchte', 'obst', 'fruity'] },
  { tag: 'süß',          keywords: ['süß', 'süßlich', 'zucker', 'karamell', 'karamel', 'sweet'] },
  { tag: 'Zitrus',       keywords: ['zitrus', 'zitrone', 'orange', 'grapefruit', 'limette', 'lime', 'citrus', 'zitronig'] },
  { tag: 'Kiefer',       keywords: ['kiefer', 'kiefernnadel', 'pine', 'pinienharz', 'terpentin'] },
  { tag: 'Diesel',       keywords: ['diesel', 'kraftstoff', 'benzin', 'petroleum'] },
  { tag: 'Skunk',        keywords: ['skunk', 'stinkend', 'pungent', 'intensiv', 'scharf riechend'] },
  { tag: 'würzig',       keywords: ['würzig', 'würze', 'pfeffer', 'gewürz', 'spicy', 'scharf'] },
  { tag: 'holzig',       keywords: ['holzig', 'holz', 'holzige', 'wald', 'woody', 'zeder'] },
  { tag: 'Beere',        keywords: ['beere', 'beeren', 'himbeere', 'heidelbeere', 'brombeere', 'berry', 'beerenfrucht'] },
  { tag: 'tropisch',     keywords: ['tropisch', 'mango', 'ananas', 'papaya', 'exotisch', 'tropical'] },
  { tag: 'blumig',       keywords: ['blumig', 'blume', 'lavendel', 'rose', 'jasmin', 'floral'] },
  { tag: 'minzig',       keywords: ['minzig', 'minze', 'menthol', 'kühl', 'mint', 'pfefferminz'] },
  { tag: 'Käse',         keywords: ['käse', 'käsig', 'cheddar', 'cheese'] },
  { tag: 'Kaffee',       keywords: ['kaffee', 'mokka', 'espresso', 'coffee'] },
  { tag: 'Schokolade',   keywords: ['schokolade', 'kakao', 'chocolate', 'cocoa'] },
  { tag: 'Vanille',      keywords: ['vanille', 'vanillig', 'vanilla'] },
  { tag: 'nussig',       keywords: ['haselnuss', 'nuss', 'nussig', 'mandel', 'walnut', 'nutty'] },
  { tag: 'kräuterig',    keywords: ['kräuter', 'krautig', 'oregano', 'thymian', 'salbei', 'herbal', 'herb'] },
  { tag: 'harzig',       keywords: ['harz', 'harzig', 'resinös', 'klebrig', 'resinous'] },
  { tag: 'Lakritz',      keywords: ['lakritz', 'anis', 'fenchel', 'anise', 'licorice'] },
  { tag: 'Sandelholz',   keywords: ['sandelholz', 'kampfer', 'camphor', 'sandalwood'] },
  { tag: 'Ingwer',       keywords: ['ingwer', 'ingwerwurzel', 'ginger'] },
  { tag: 'Pfirsich',     keywords: ['pfirsich', 'aprikose', 'nektarine', 'peach'] },
  { tag: 'Melone',       keywords: ['melone', 'wassermelone', 'melon'] },
  { tag: 'Traube',       keywords: ['traube', 'weintraube', 'wein', 'grape'] },
  { tag: 'Kirsche',      keywords: ['kirsche', 'kirschen', 'cherry'] },
  { tag: 'Lemon',        keywords: ['lemon', 'lemony', 'zitrone', 'zitronig'] },
  { tag: 'Tabak',        keywords: ['tabak', 'tabakig', 'rauch', 'tobacco', 'smoky'] },
  { tag: 'Kokosnuss',    keywords: ['kokosnuss', 'kokos', 'coconut'] },
  { tag: 'Eukalyptus',   keywords: ['eukalyptus', 'eucalyptus'] },
  { tag: 'Erdbeere',     keywords: ['erdbeere', 'erdbeer', 'strawberry'] },
  { tag: 'Heidelbeere',  keywords: ['heidelbeere', 'blaubeere', 'blueberry'] },
  { tag: 'Honig',        keywords: ['honig', 'honigartig', 'honey'] },
  { tag: 'Pflaume',      keywords: ['pflaume', 'zwetschge', 'plum'] },
  { tag: 'Champagner',   keywords: ['champagner', 'sekt', 'spritzig', 'champagne'] },
  { tag: 'Rosmarin',     keywords: ['rosmarin', 'basilikum', 'rosemary'] },
  { tag: 'Zitronengras', keywords: ['zitronengras', 'lemongrass'] },
  { tag: 'Pinie',        keywords: ['pinie', 'piniennadel', 'pine needle'] },
  { tag: 'Apfel',        keywords: ['apfel', 'apfelig', 'apple'] },
];

/**
 * Extrahiere Flavor-Tags aus einem deutschen Freitext
 * Gibt de-duplizierten Array zurück (max 5 Tags)
 */
export function extractFlavorsFromText(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  const textLower = text.toLowerCase();
  const found: string[] = [];

  for (const entry of DE_FLAVOR_VOCABULARY) {
    if (found.length >= 5) break;
    const matches = entry.keywords.some(kw => textLower.includes(kw.toLowerCase()));
    if (matches && !found.includes(entry.tag)) {
      found.push(entry.tag);
    }
  }

  return found;
}
```

- [ ] **Step 2: Verifikation der Extraktion**

```bash
cd /root/SF-1-Ultimate-/apps/price-service
node -e "
const { extractFlavorsFromText } = require('./src/config/flavor-vocabulary.de');
// Nein — erst transpilieren: nutze inline Test
" 2>/dev/null

# Via tsx:
npx tsx -e "
import { extractFlavorsFromText } from './src/config/flavor-vocabulary.de.ts';
console.log(extractFlavorsFromText('Dieser Strain hat einen erdigen, würzigen Charakter mit Zitrusnoten'));
console.log(extractFlavorsFromText('Süßer Mango-Geschmack, tropische Frucht mit Vanillenoten'));
console.log(extractFlavorsFromText(''));
" 2>/dev/null
```

Erwartete Ausgabe:
```
[ 'erdig', 'würzig', 'Zitrus' ]
[ 'süß', 'tropisch', 'Vanille' ]
[]
```

- [ ] **Step 3: Commit**

```bash
git -C /root/SF-1-Ultimate- add apps/price-service/src/config/flavor-vocabulary.de.ts
git -C /root/SF-1-Ultimate- commit -m "feat: add German flavor vocabulary with 40 tags"
```

---

## Task 3: Phase 1 — Crawl-Flavor-Import Service

**Files:**
- Create: `apps/price-service/src/services/crawl-flavor-import.service.ts`

- [ ] **Step 1: Service anlegen**

```ts
// Phase 1 — Einmaliger Import aus lokalem Crawl
// Quelle: /root/SF-Brain/strain_output/strains_database.json
// Matcht gecrawlte Strains gegen DB-Seeds, extrahiert DE Flavor-Tags

import fs from 'fs';
import path from 'path';
import { Seed } from '../models/Seed.model';
import { extractFlavorsFromText } from '../config/flavor-vocabulary.de';
import { logger } from '../utils/logger';

const CRAWL_PATH = '/root/SF-Brain/strain_output/strains_database.json';

interface CrawlStrain {
  name: string;
  breeder: string;
  taste?: string | string[];
  description?: string;
}

/**
 * Normalisiert einen Namen für Matching:
 * lowercase, Hyphens/Punkte zu Spaces, mehrfache Spaces bereinigen
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[-_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class CrawlFlavorImportService {
  /**
   * Lädt Crawl-Daten und baut einen schnellen Lookup auf
   */
  private loadCrawlData(): Map<string, CrawlStrain> {
    if (!fs.existsSync(CRAWL_PATH)) {
      throw new Error(`Crawl-Datei nicht gefunden: ${CRAWL_PATH}`);
    }

    const raw = fs.readFileSync(CRAWL_PATH, 'utf-8');
    const strains: CrawlStrain[] = JSON.parse(raw);

    const map = new Map<string, CrawlStrain>();
    for (const s of strains) {
      if (s.name) {
        map.set(normalizeName(s.name), s);
      }
    }

    logger.info(`[CrawlImport] ${strains.length} Crawl-Einträge geladen, ${map.size} eindeutige Namen`);
    return map;
  }

  /**
   * Extrahiert Flavor-Text aus einem Crawl-Eintrag
   * taste-Feld kann String oder String-Array sein
   */
  private getFlavorText(strain: CrawlStrain): string {
    const parts: string[] = [];

    if (strain.taste) {
      if (Array.isArray(strain.taste)) {
        parts.push(...strain.taste);
      } else {
        parts.push(strain.taste);
      }
    }

    if (strain.description) {
      parts.push(strain.description);
    }

    return parts.join(' ');
  }

  /**
   * Importiert Flavors für alle matchbaren Seeds
   * Überspringt Seeds mit flavorSource 'seedfinder' oder 'manual'
   * @returns Anzahl aktualisierter Seeds
   */
  async importAll(): Promise<{ matched: number; updated: number; skipped: number }> {
    const crawlMap = this.loadCrawlData();

    // Nur Seeds ohne seedfinder/manual Daten
    const seeds = await Seed.find({
      $or: [
        { flavors: { $exists: false } },
        { flavors: { $size: 0 } },
        { flavorSource: 'crawl' },
        { flavorSource: { $exists: false } },
      ],
      flavorSource: { $nin: ['seedfinder', 'manual'] },
    }).select('_id name flavorSource').lean();

    logger.info(`[CrawlImport] ${seeds.length} Seeds für Import gefunden`);

    let matched = 0;
    let updated = 0;
    let skipped = 0;

    for (const seed of seeds) {
      const normalizedSeedName = normalizeName(seed.name);
      const crawlEntry = crawlMap.get(normalizedSeedName);

      if (!crawlEntry) {
        skipped++;
        continue;
      }

      matched++;
      const flavorText = this.getFlavorText(crawlEntry);
      const flavors = extractFlavorsFromText(flavorText);

      if (flavors.length === 0) {
        skipped++;
        continue;
      }

      await Seed.updateOne(
        { _id: seed._id },
        { $set: { flavors, flavorSource: 'crawl' } }
      );
      updated++;

      if (updated % 100 === 0) {
        logger.info(`[CrawlImport] Fortschritt: ${updated} aktualisiert...`);
      }
    }

    logger.info(`[CrawlImport] Abgeschlossen — matched: ${matched}, updated: ${updated}, skipped: ${skipped}`);
    return { matched, updated, skipped };
  }
}

export const crawlFlavorImport = new CrawlFlavorImportService();
```

- [ ] **Step 2: Commit**

```bash
git -C /root/SF-1-Ultimate- add apps/price-service/src/services/crawl-flavor-import.service.ts
git -C /root/SF-1-Ultimate- commit -m "feat: add CrawlFlavorImportService for Phase 1 import"
```

---

## Task 4: Admin-Endpoint für Phase 1

**Files:**
- Modify: `apps/price-service/src/index.ts`

- [ ] **Step 1: Import hinzufügen**

Am Anfang der Datei nach den bestehenden imports einfügen:

```ts
import { crawlFlavorImport } from './services/crawl-flavor-import.service';
```

- [ ] **Step 2: Endpoint einfügen**

Direkt nach dem `fix-decimals` Endpoint (nach der schließenden `});`) einfügen:

```ts
// Phase 1: Crawl-Flavor-Import (einmalig ausführbar)
app.post('/api/prices/admin/flavors/import-crawl', requireAdmin, async (req, res) => {
  try {
    logger.info('[Admin] Starte Crawl-Flavor-Import...');
    // Im Hintergrund ausführen — großer Batch
    crawlFlavorImport.importAll()
      .then(result => logger.info(`[Admin] Crawl-Import fertig: ${JSON.stringify(result)}`))
      .catch(err => logger.error('[Admin] Crawl-Import Fehler:', err.message));

    res.json({ success: true, message: 'Import gestartet (läuft im Hintergrund)' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 3: Container neustarten und Endpoint testen**

```bash
docker restart sf1-price-service && sleep 8

# JWT generieren
JWT=$(node -e "
const jwt=require('./apps/auth-service/node_modules/jsonwebtoken');
const fs=require('fs');
const env=fs.readFileSync('.env','utf8');
const s=env.match(/JWT_SECRET=(.+)/)?.[1]?.trim();
console.log(jwt.sign({userId:'admin',role:'ADMIN'},s,{expiresIn:'1h'}));
" 2>/dev/null)

# Endpoint aufrufen
curl -s -X POST http://172.28.0.24:3011/api/prices/admin/flavors/import-crawl \
  -H "Authorization: Bearer $JWT" | python3 -m json.tool
```

Erwartete Ausgabe:
```json
{
  "success": true,
  "message": "Import gestartet (läuft im Hintergrund)"
}
```

- [ ] **Step 4: Logs prüfen**

```bash
sleep 30 && docker logs sf1-price-service --tail 20 2>&1 | grep CrawlImport
```

Erwartete Ausgabe:
```
[CrawlImport] 4503 Crawl-Einträge geladen, 4503 eindeutige Namen
[CrawlImport] XXXX Seeds für Import gefunden
[CrawlImport] Abgeschlossen — matched: ..., updated: ..., skipped: ...
```

- [ ] **Step 5: Coverage prüfen**

```bash
docker exec sf1-price-service node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URL).then(async () => {
  const { Seed } = require('./dist/models/Seed.model');
  const total = await Seed.countDocuments({});
  const withFlavors = await Seed.countDocuments({flavors: {\$exists: true, \$not: {\$size: 0}}});
  const crawlSource = await Seed.countDocuments({flavorSource: 'crawl'});
  console.log('Total:', total, 'Mit Flavors:', withFlavors, 'Crawl-Quelle:', crawlSource);
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
" 2>/dev/null
```

Erwartung: `crawlSource > 500`

- [ ] **Step 6: Commit**

```bash
git -C /root/SF-1-Ultimate- add apps/price-service/src/index.ts
git -C /root/SF-1-Ultimate- commit -m "feat: add admin endpoint for Phase 1 crawl flavor import"
```

---

## Task 5: Phase 2 — Seedfinder.eu Scraper neu aufbauen

**Files:**
- Modify: `apps/price-service/src/services/seedfinder-enrichment.service.ts`

- [ ] **Step 1: Neue URL-Struktur + Firecrawl-Integration testen**

Zuerst testen ob Firecrawl eine Seedfinder-Seite liefert:

```bash
# Manueller Test mit curl via Firecrawl API
FIRECRAWL_KEY=$(grep FIRECRAWL_API_KEY /root/SF-1-Ultimate-/.env | cut -d= -f2)

curl -s -X POST https://api.firecrawl.dev/v0/scrape \
  -H "Authorization: Bearer $FIRECRAWL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://seedfinder.eu/de/strain-info/northern-lights/sensi-seeds/","formats":["html"],"waitFor":2000}' \
  | python3 -c "
import sys, json, re
d = json.load(sys.stdin)
print('success:', d.get('success'))
html = d.get('html') or d.get('data', {}).get('html', '')
print('html len:', len(html))
# Suche nach Flavor-Keywords
for kw in ['Geschmack', 'Aroma', 'Geruch', 'erdig', 'fruchtig', 'taste', 'flavor']:
    m = re.search(r'.{0,30}' + kw + r'.{0,80}', html, re.IGNORECASE)
    print(kw + ':', m.group(0)[:100] if m else 'nicht gefunden')
"
```

**Hinweis:** Wenn die Firecrawl-Response `success: false` oder keine Flavor-Daten enthält, dokumentiere die tatsächliche HTML-Struktur für den Parser (Step 3).

- [ ] **Step 2: Service komplett ersetzen**

`apps/price-service/src/services/seedfinder-enrichment.service.ts` vollständig ersetzen mit:

```ts
// Seedfinder Enrichment Service v2
// Nutzt neue seedfinder.eu URL-Struktur + Firecrawl für Cloudflare-Bypass
// Deutschen Flavor-Tags via DE_FLAVOR_VOCABULARY

import * as cheerio from 'cheerio';
import { Seed } from '../models/Seed.model';
import { firecrawlService } from './firecrawl.service';
import { extractFlavorsFromText, DE_FLAVOR_VOCABULARY } from '../config/flavor-vocabulary.de';
import { logger } from '../utils/logger';

export interface SeedfinderStrainData {
  flavors?: string[];
  effects?: string[];
  thc?: number;
  cbd?: number;
}

export class SeedfinderEnrichmentService {
  private readonly baseUrl = 'https://seedfinder.eu';
  private readonly rateLimitMs = 3000;
  private lastRequestTime = 0;

  /**
   * Generiert Seedfinder-URL aus Name und Breeder
   * "Northern Lights" + "Sensi Seeds" → /de/strain-info/northern-lights/sensi-seeds/
   */
  buildStrainUrl(name: string, breeder: string): string {
    const nameSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const breederSlug = breeder.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `${this.baseUrl}/de/strain-info/${nameSlug}/${breederSlug}/`;
  }

  /**
   * Scrappe eine Seedfinder-Seite via Firecrawl
   */
  async fetchStrainPage(url: string): Promise<string | null> {
    await this.respectRateLimit();

    if (!firecrawlService.isEnabled()) {
      logger.warn('[SeedfinderV2] Firecrawl nicht verfügbar — Enrichment übersprungen');
      return null;
    }

    return firecrawlService.scrapeWithJsRendering(url);
  }

  /**
   * Parst Strain-Daten aus Seedfinder HTML
   * Sucht nach deutschen Flavor-Keywords im gesamten Seitentext
   */
  parseStrainPage(html: string): SeedfinderStrainData {
    const data: SeedfinderStrainData = {};
    const $ = cheerio.load(html);

    // Gesamter Seitentext für Keyword-Extraktion
    const pageText = $('body').text();

    // Flavors via DE-Vocabulary aus Seitentext
    const flavors = extractFlavorsFromText(pageText);
    if (flavors.length > 0) {
      data.flavors = flavors;
    }

    // THC % — Pattern: "THC: 18%", "18% THC", "bis zu 22% THC"
    const thcMatch = pageText.match(/(?:THC[:\s]+(?:bis zu |up to |max )?|(\d+(?:[.,]\d+)?)\s*%\s*THC)(\d+(?:[.,]\d+)?)/i)
      || pageText.match(/(\d+(?:[.,]\d+)?)\s*%\s*THC/i)
      || pageText.match(/THC[:\s]+(\d+(?:[.,]\d+)?)/i);
    if (thcMatch) {
      const val = parseFloat((thcMatch[2] || thcMatch[1]).replace(',', '.'));
      if (val > 0 && val <= 35) data.thc = val;
    }

    // CBD %
    const cbdMatch = pageText.match(/(\d+(?:[.,]\d+)?)\s*%\s*CBD/i)
      || pageText.match(/CBD[:\s]+(\d+(?:[.,]\d+)?)/i);
    if (cbdMatch) {
      const val = parseFloat(cbdMatch[1].replace(',', '.'));
      if (val >= 0 && val <= 30) data.cbd = val;
    }

    // Effects via Keyword-Liste
    const effectKeywords = [
      ['entspannend', 'relaxing'],
      ['aufheiternd', 'uplifting'],
      ['energetisch', 'energetic'],
      ['kreativ', 'creative'],
      ['glücklich', 'happy'],
      ['fokussiert', 'focused'],
      ['schläfrig', 'sleepy'],
      ['euphorisch', 'euphoric'],
    ];
    const textLower = pageText.toLowerCase();
    const effects = effectKeywords
      .filter(([de, en]) => textLower.includes(de) || textLower.includes(en))
      .map(([de]) => de)
      .slice(0, 5);

    if (effects.length > 0) data.effects = effects;

    return data;
  }

  /**
   * Reichert einen einzelnen Seed an
   */
  async enrichSeed(seedId: string, seedName: string, breeder: string): Promise<boolean> {
    const url = this.buildStrainUrl(seedName, breeder);
    logger.debug(`[SeedfinderV2] Scraping: ${url}`);

    const html = await this.fetchStrainPage(url);
    if (!html) return false;

    const strainData = this.parseStrainPage(html);

    if (!strainData.flavors && !strainData.thc && !strainData.cbd) {
      logger.debug(`[SeedfinderV2] Keine Daten für "${seedName}"`);
      return false;
    }

    const updateData: any = { flavorSource: 'seedfinder' };
    if (strainData.flavors?.length) updateData.flavors = strainData.flavors;
    if (strainData.effects?.length) updateData.effects = strainData.effects;
    if (strainData.thc !== undefined) updateData.thc = strainData.thc;
    if (strainData.cbd !== undefined) updateData.cbd = strainData.cbd;

    await Seed.updateOne({ _id: seedId }, { $set: updateData });
    logger.debug(`[SeedfinderV2] "${seedName}" angereichert — Flavors: ${strainData.flavors?.join(', ')}`);
    return true;
  }

  /**
   * Batch-Enrichment:
   * Priorität 1: Seeds ohne Flavors
   * Priorität 2: Seeds mit flavorSource 'crawl' (können überschrieben werden)
   * @param batchSize Seeds pro Lauf (default: 200)
   */
  async enrichAllMissingFlavors(batchSize = 200): Promise<number> {
    // Priorität 1: ohne Flavors
    const priority1 = await Seed.find({
      $or: [
        { flavors: { $exists: false } },
        { flavors: { $size: 0 } },
      ],
      flavorSource: { $nin: ['seedfinder', 'manual'] },
    }).select('_id name breeder').limit(batchSize).lean();

    // Priorität 2: crawl-Quelle (bis Batch voll)
    const remaining = batchSize - priority1.length;
    const priority2 = remaining > 0
      ? await Seed.find({ flavorSource: 'crawl' })
          .select('_id name breeder')
          .limit(remaining)
          .lean()
      : [];

    const seeds = [...priority1, ...priority2];

    if (seeds.length === 0) {
      logger.info('[SeedfinderV2] Alle Seeds mit Seedfinder-Daten versorgt');
      return 0;
    }

    logger.info(`[SeedfinderV2] Batch: ${priority1.length} ohne Flavors + ${priority2.length} crawl-Upgrade (${seeds.length} gesamt)`);

    let enriched = 0;
    for (const seed of seeds) {
      const ok = await this.enrichSeed(String(seed._id), seed.name, seed.breeder || '');
      if (ok) enriched++;
    }

    logger.info(`[SeedfinderV2] Fertig — ${enriched}/${seeds.length} angereichert`);
    return enriched;
  }

  private async respectRateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.rateLimitMs) {
      await new Promise(r => setTimeout(r, this.rateLimitMs - elapsed));
    }
    this.lastRequestTime = Date.now();
  }
}

export const seedfinderEnrichment = new SeedfinderEnrichmentService();
```

- [ ] **Step 3: Parser an tatsächliche HTML-Struktur anpassen**

Nach dem Firecrawl-Test aus Step 1: Wenn der Seitentext Flavor-Keywords enthält, ist kein weiteres Anpassen nötig. Wenn nicht, logge die HTML-Struktur und passe `parseStrainPage()` entsprechend an (z.B. spezifischere cheerio-Selektoren).

- [ ] **Step 4: URL-Builder testen**

```bash
cd /root/SF-1-Ultimate-/apps/price-service
npx tsx -e "
import { SeedfinderEnrichmentService } from './src/services/seedfinder-enrichment.service.ts';
const svc = new SeedfinderEnrichmentService();
console.log(svc.buildStrainUrl('Northern Lights', 'Sensi Seeds'));
console.log(svc.buildStrainUrl('OG Kush #18', 'DNA Genetics'));
console.log(svc.buildStrainUrl('Blue Dream', 'DJ Short'));
" 2>/dev/null
```

Erwartete Ausgabe:
```
https://seedfinder.eu/de/strain-info/northern-lights/sensi-seeds/
https://seedfinder.eu/de/strain-info/og-kush-18/dna-genetics/
https://seedfinder.eu/de/strain-info/blue-dream/dj-short/
```

- [ ] **Step 5: Commit**

```bash
git -C /root/SF-1-Ultimate- add apps/price-service/src/services/seedfinder-enrichment.service.ts
git -C /root/SF-1-Ultimate- commit -m "feat: rebuild seedfinder enrichment with new URL + Firecrawl + DE vocabulary"
```

---

## Task 6: Cron-Batch auf 200 erhöhen + Meilisearch-Reindex

**Files:**
- Modify: `apps/price-service/src/index.ts`

- [ ] **Step 1: Cron-Batch-Größe erhöhen**

In `index.ts` den Cron-Block suchen (bei `scheduleEnrichment`) und `enrichAllMissingFlavors()` ohne Argument aufrufen — der neue Default ist 200:

```ts
// Seedfinder Enrichment — täglich um 02:00 Uhr
const scheduleEnrichment = () => {
  const now = new Date();
  const next = new Date();
  next.setHours(2, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - now.getTime();

  setTimeout(async () => {
    try {
      const enrichedCount = await seedfinderEnrichment.enrichAllMissingFlavors(200);
      logger.info(`[EnrichmentCron] ${enrichedCount} Seeds angereichert`);
    } catch (error) {
      logger.error('[EnrichmentCron] Fehler:', error);
    }
    scheduleEnrichment();
  }, delay);
};
scheduleEnrichment();
```

- [ ] **Step 2: Container neustarten + Logs prüfen**

```bash
docker restart sf1-price-service && sleep 8
docker logs sf1-price-service --tail 10 2>&1 | grep -E "bereit|Enrichment|SeedfinderV2"
```

Erwartete Ausgabe (kein Fehler beim Start):
```
[Server] Price Service v2.0 (Hybrid) bereit!
```

- [ ] **Step 3: Manuellen Enrichment-Lauf triggern (Test)**

```bash
# JWT generieren
JWT=$(node -e "
const jwt=require('./apps/auth-service/node_modules/jsonwebtoken');
const fs=require('fs');
const env=fs.readFileSync('.env','utf8');
const s=env.match(/JWT_SECRET=(.+)/)?.[1]?.trim();
console.log(jwt.sign({userId:'admin',role:'ADMIN'},s,{expiresIn:'1h'}));
" 2>/dev/null)

# Manuelle Ausführung via bestehenden Admin-Endpoint (falls vorhanden)
# Alternativ: direkt via docker exec
docker exec sf1-price-service node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URL).then(async () => {
  // kurzen Batch-Test mit 3 Seeds
  const { seedfinderEnrichment } = require('./dist/services/seedfinder-enrichment.service');
  const result = await seedfinderEnrichment.enrichAllMissingFlavors(3);
  console.log('Angereichert:', result);
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
" 2>/dev/null
```

**Hinweis:** Wenn Firecrawl 0 Flavors zurückgibt, liegt es an der HTML-Struktur. In dem Fall `parseStrainPage()` aus Task 5 mit den tatsächlich erhaltenen HTML-Inhalten debuggen:

```bash
# Debug: Welche HTML-Inhalte liefert Firecrawl?
docker exec sf1-price-service node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URL).then(async () => {
  const { firecrawlService } = require('./dist/services/firecrawl.service');
  const { SeedfinderEnrichmentService } = require('./dist/services/seedfinder-enrichment.service');
  const svc = new SeedfinderEnrichmentService();
  const url = svc.buildStrainUrl('Northern Lights', 'Sensi Seeds');
  const html = await firecrawlService.scrapeWithJsRendering(url);
  if (html) {
    console.log('HTML-Länge:', html.length);
    // Erste 2000 Zeichen zeigen
    console.log(html.substring(0, 2000));
  } else {
    console.log('Kein HTML erhalten');
  }
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
" 2>/dev/null
```

- [ ] **Step 4: Finaler Coverage-Check**

```bash
docker exec sf1-price-service node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URL).then(async () => {
  const { Seed } = require('./dist/models/Seed.model');
  const total = await Seed.countDocuments({});
  const withFlavors = await Seed.countDocuments({flavors: {\$exists: true, \$not: {\$size: 0}}});
  const byCrawl = await Seed.countDocuments({flavorSource: 'crawl'});
  const bySeedfinder = await Seed.countDocuments({flavorSource: 'seedfinder'});
  console.log('Total:', total);
  console.log('Mit Flavors:', withFlavors, '(' + Math.round(withFlavors/total*100) + '%)');
  console.log('Quelle crawl:', byCrawl, '| seedfinder:', bySeedfinder);
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
" 2>/dev/null
```

Erwartung nach Phase 1: ≥20% Coverage

- [ ] **Step 5: Commit**

```bash
git -C /root/SF-1-Ultimate- add apps/price-service/src/index.ts
git -C /root/SF-1-Ultimate- commit -m "feat: increase enrichment cron batch to 200, trigger Phase 1 crawl import"
```

---

## Erfolgskriterien (gesamt)

- [ ] Phase 1 abgeschlossen: Coverage ≥ 20%
- [ ] `flavorSource` für alle neuen Einträge gesetzt
- [ ] Kein `flavorSource: 'manual'` oder `'seedfinder'` Eintrag überschrieben
- [ ] Phase 2 Cron läuft täglich ohne Fehler (docker logs prüfen)
- [ ] URL-Builder generiert korrekte slugs
- [ ] Deutsches Vokabular mit ≥ 10 verschiedenen Tags in Produktion vorhanden

# SF-1 Price Service v2.0 (Hybrid Feed System)

Cannabis Seed Preisvergleich-Service mit 11 Feed-Adaptern, BullMQ Job Queue und Echtzeit-Updates.

**Letztes Update:** 2026-02-18
**Architektur:** axios + cheerio (kein Playwright/Browser noetig)
**Produkte importiert:** ~2.611 aus 10 Shops

---

## Architektur-Uebersicht

```
Price Service v2.0
├── src/
│   ├── index.ts                  # Express Server + Admin-Endpoints + Scheduler
│   ├── feeds/
│   │   ├── base.feed.ts          # BaseFeed Klasse (axios + cheerio)
│   │   ├── index.ts              # Feed-Registry (alle 11 Adapter)
│   │   └── adapters/
│   │       ├── fastbuds.feed.ts        # JSON-LD Extraktion
│   │       ├── seedsman.feed.ts        # GraphQL API
│   │       ├── rqs.feed.ts             # PrestaShop HTML
│   │       ├── dutch-passion.feed.ts   # PrestaShop HTML
│   │       ├── sensi-seeds.feed.ts     # nopCommerce HTML
│   │       ├── zamnesia.feed.ts        # PrestaShop HTML
│   │       ├── greenhouse.feed.ts      # CS-Cart HTML
│   │       ├── paradise-seeds.feed.ts  # WooCommerce HTML
│   │       ├── anesia-seeds.feed.ts    # WooCommerce HTML
│   │       ├── mr-hanf.feed.ts         # xtCommerce HTML
│   │       └── weed-seed-shop.feed.ts  # CSV-Feed (Cloudflare)
│   ├── workers/
│   │   └── feed.worker.ts        # BullMQ Worker (FeedProduct -> ScrapedProduct)
│   ├── services/
│   │   └── price.service.ts      # MongoDB Save (Seeds + Prices)
│   ├── models/
│   │   ├── Seed.ts
│   │   ├── Price.ts
│   │   └── PriceAlert.ts
│   ├── routes/
│   │   ├── price.routes.ts
│   │   └── alert.routes.ts
│   └── scrapers/
│       └── base.scraper.ts       # Nur noch fuer ScrapedProduct Interface
```

## Feed-Adapter Status

| # | Shop | Slug | Methode | Produkte | Affiliate |
|---|------|------|---------|----------|-----------|
| 1 | Seedsman | seedsman | GraphQL API | 878 | 8% |
| 2 | Mr. Hanf | mr-hanf | HTML (xtCommerce) | 551 | 10% |
| 3 | Dutch Passion | dutch-passion | HTML (PrestaShop) | 540 | 10-15% |
| 4 | Sensi Seeds | sensi-seeds | HTML (nopCommerce) | 148 | 10-15% |
| 5 | Greenhouse Seeds | greenhouse-seeds | HTML (CS-Cart) | 121 | 10-15% |
| 6 | Anesia Seeds | anesia-seeds | HTML (WooCommerce) | 120 | 15% |
| 7 | Zamnesia | zamnesia | HTML (PrestaShop) | 108 | 12-15% |
| 8 | Paradise Seeds | paradise-seeds | HTML (WooCommerce) | 66 | 10% |
| 9 | Royal Queen Seeds | royal-queen-seeds | HTML (PrestaShop) | 53 | 12-15% |
| 10 | FastBuds | fastbuds | JSON-LD | 26 | 15% |
| 11 | Weed Seed Shop | weed-seed-shop | CSV-Feed | 0* | 30% |
| | **Gesamt** | | | **~2.611** | |

*Weed Seed Shop: Cloudflare-Schutz blockiert HTML-Scraping. Braucht CSV-Feed-URL aus Affiliate-Portal (Env: `WEEDSEEDSHOP_FEED_URL`).

## Shop-Details und URLs

### Seedsman (SPA - GraphQL)
- **Domain:** seedsman.com
- **Methode:** Oeffentliche GraphQL API (`/graphql`)
- **Query:** `products(search: "feminized seeds", pageSize: 50)`
- **Fallback:** CSV via `SEEDSMAN_FEED_URL`

### FastBuds (JSON-LD)
- **Domain:** 2fast4buds.com
- **URLs:** `/autoflowering-cannabis-seeds`, `/feminized-seeds`
- **Methode:** `<script type="application/ld+json">` Extraktion
- **Daten:** `@graph` Array, `@type === 'Product'`

### Royal Queen Seeds (PrestaShop)
- **Domain:** www.royalqueenseeds.de
- **URLs:** `/33-feminisierte-hanfsamen`, `/34-autoflowering-hanfsamen`, `/54-regulaere-cannabissamen`
- **Selektoren:** `li.ajax_block_product`, `h3.product-title a.product-link`, `.prices-block .price`

### Dutch Passion (PrestaShop)
- **Domain:** dutch-passion.com
- **URLs:** `/de/hanfsamen/feminisierte-hanfsamen`, `/de/hanfsamen/autoflower-hanfsamen`, `/de/hanfsamen/regulare-hanfsamen`
- **Selektoren:** `div.product-miniature.card`, `.product-miniature__title`, `.product-miniature__pricing`

### Sensi Seeds (nopCommerce)
- **Domain:** sensiseeds.com
- **URLs:** `/de/feminisierte-samen`, `/de/autoflowering-samen`, `/de/regulaere-samen`
- **Selektoren:** `div.item-box`, `.product-title a`, `.price.actual-price`
- **Besonderheit:** Preis-Format "Von EUR36,00"

### Zamnesia (PrestaShop)
- **Domain:** www.zamnesia.de
- **URLs:** `/35-cannabis-seeds/295-feminized-cannabis-seeds`, `/35-cannabis-seeds/294-autoflowering-cannabis-seeds`, `/35-cannabis-seeds/296-regular-cannabis-seeds`
- **Selektoren:** `div.ajax_block_product`, `a.product_link`, `.integer_part_of_price` + `.fractial_part_of_price`
- **Besonderheit:** Preis in Integer + Fractional aufgeteilt

### Greenhouse Seeds (CS-Cart)
- **Domain:** shop.greenhouseseeds.nl (Subdomain!)
- **URL:** `/feminised-cannabis-seeds/`
- **Selektoren:** `div.ty-column4`, `a.product-title`, `span.ty-price-num`
- **Besonderheit:** Alle ~160 Produkte auf einer Seite, kein Paging

### Paradise Seeds (WooCommerce)
- **Domain:** www.paradise-seeds.com
- **URLs:** `/cannabis-seeds/`, `/autoflower-cannabis-seeds/`
- **Selektoren:** `li.product`, `.woocommerce-loop-product__title`, `.woocommerce-Price-amount`

### Anesia Seeds (WooCommerce)
- **Domain:** anesiaseeds.com (KEIN Bindestrich!)
- **URLs:** `/de/product-category/feminized-seeds/`, `/de/product-category/autoflowering-seeds/`
- **Selektoren:** `li.product.type-product`, `.woocommerce-loop-product__title`, `.woocommerce-Price-amount`

### Mr. Hanf (xtCommerce)
- **Domain:** mr-hanf.de
- **URLs:** `/samen-shop/feminisierte-samen/`, `/samen-shop/autoflowering-samen/`
- **Selektoren:** `div.listingrow.card`, `h2.lr_title a`, `span.standard_price`
- **Besonderheit:** 3535 Produkte, 6/Seite, Breeder in `cite` Element, THC in Specs-Tabelle
- **Limit:** Max 50 Seiten pro Kategorie

### Weed Seed Shop (Cloudflare)
- **Domain:** weedseedshop.com
- **Status:** Cloudflare 403 - HTML nicht scrapebar
- **Loesung:** CSV-Feed-URL aus Affiliate-Portal konfigurieren
- **Env:** `WEEDSEEDSHOP_FEED_URL`

## API Endpoints

### Preise (oeffentlich)
```
GET  /api/prices/today           - Heutige Preise
GET  /api/prices/search?q=...    - Seeds suchen
GET  /api/prices/seed/:slug      - Preise fuer ein Seed
GET  /api/prices/compare?slugs=  - Seeds vergleichen
GET  /api/prices/trending        - Trending Seeds
GET  /api/prices/browse          - Alle Seeds browsen
```

### Alerts (authentifiziert)
```
POST   /api/alerts               - Preisalarm erstellen
GET    /api/alerts               - Eigene Alerts abrufen
PATCH  /api/alerts/:id/deactivate - Alert deaktivieren
DELETE /api/alerts/:id           - Alert loeschen
```

### Admin
```
GET  /admin/feeds                - Alle Feeds + Status
GET  /admin/feed/:seedbank       - Feed-Info fuer einen Shop
POST /admin/feed/:seedbank/now   - Sofort-Import eines Shops
POST /admin/feeds/run-all        - Alle Feeds importieren
GET  /admin/feeds/stats          - BullMQ Queue-Statistik
```

## Environment Variables

### Pflicht
```env
MONGODB_URL=mongodb://sf1-mongodb:27017/sf1-prices
REDIS_URL=redis://sf1-redis:6379
PORT=3002
```

### Affiliate IDs (optional, fuer Affiliate-Links)
```env
FASTBUDS_AFFILIATE_ID=
SEEDSMAN_AFFILIATE_ID=
RQS_AFFILIATE_ID=
DUTCHPASSION_AFFILIATE_ID=
SENSISEEDS_AFFILIATE_ID=
ZAMNESIA_AFFILIATE_ID=
GREENHOUSE_AFFILIATE_ID=
PARADISE_AFFILIATE_ID=
ANESIA_AFFILIATE_ID=
MRHANF_AFFILIATE_ID=
WEEDSEEDSHOP_AFFILIATE_ID=
```

### Feed-URLs (optional, fuer CSV/API-Feeds statt HTML-Scraping)
```env
SEEDSMAN_FEED_URL=
WEEDSEEDSHOP_FEED_URL=        # Pflicht fuer Weed Seed Shop (Cloudflare!)
```

## Scheduling

- **Erster Import:** 30 Sekunden nach Container-Start
- **Taeglicher Import:** 02:00 UTC (alle Feeds)
- **Rate Limiting:** 1.5 Sekunden zwischen HTTP-Requests
- **BullMQ Concurrency:** 2 Jobs gleichzeitig, max 6 Jobs/Minute

## Wichtige Befehle

```bash
# Container neustarten
docker restart sf1-price-service

# Logs anzeigen
docker logs sf1-price-service --tail 50 -f

# Einzelnen Feed testen
docker exec sf1-price-service wget -qO- --post-data='' "http://localhost:3002/admin/feed/seedsman/now"

# Alle Feeds starten
docker exec sf1-price-service wget -qO- --post-data='' "http://localhost:3002/admin/feeds/run-all"

# Feed-Status pruefen
docker exec sf1-price-service wget -qO- "http://localhost:3002/admin/feeds"

# Queue-Stats
docker exec sf1-price-service wget -qO- "http://localhost:3002/admin/feeds/stats"

# MongoDB: Anzahl Seeds pruefen
docker exec sf1-mongodb mongosh sf1-prices --eval "db.seeds.countDocuments()"

# MongoDB: Anzahl Preise pruefen
docker exec sf1-mongodb mongosh sf1-prices --eval "db.prices.countDocuments()"

# MongoDB: Seeds pro Shop
docker exec sf1-mongodb mongosh sf1-prices --eval "db.prices.aggregate([{'\$group':{_id:'\$seedbank',count:{'\$sum':1}}},{'\$sort':{count:-1}}]).toArray()"
```

## Technische Details

### BaseFeed (base.feed.ts)
- HTTP Client: axios mit Browser User-Agent
- HTML Parser: cheerio
- Rate Limiting: 1500ms zwischen Requests
- Timeout: 15 Sekunden
- Methoden: `fetchHtml()`, `fetchJson()`, `fetchCsv()`, `detectSeedType()`, `parsePrice()`, `parseSeedCount()`

### FeedProduct Interface
```typescript
interface FeedProduct {
  name: string;
  breeder: string;
  type: 'feminized' | 'autoflower' | 'regular' | 'cbd';
  price: number;
  currency: string;
  originalPrice?: number;
  discount?: number;
  inStock: boolean;
  packSize: string;
  seedCount: number;
  url: string;
  affiliateUrl?: string;
  thc?: string;
  cbd?: string;
  floweringTime?: string;
  genetics?: string;
  imageUrl?: string;
}
```

### Feed Worker (feed.worker.ts)
- Konvertiert `FeedProduct` -> `ScrapedProduct` fuer `priceService.saveScrapedProducts()`
- BullMQ Queue: `feed-imports`
- Concurrency: 2
- Rate Limit: 6 Jobs pro Minute
- Retry: 2 Versuche bei Fehler

### Neuen Adapter hinzufuegen

1. Datei erstellen: `src/feeds/adapters/neuer-shop.feed.ts`
```typescript
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class NeuerShopFeed extends BaseFeed {
  protected seedbankName = 'Neuer Shop';
  protected seedbankSlug = 'neuer-shop';
  protected baseUrl = 'https://neuer-shop.com';
  protected source: FeedSource = 'html';
  protected affiliateId = process.env.NEUERSHOP_AFFILIATE_ID || '';

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    return `${productUrl}?ref=${this.affiliateId}`;
  }

  async importAll(): Promise<FeedProduct[]> {
    // HTML scrapen, Produkte extrahieren
    const $ = await this.fetchHtml(`${this.baseUrl}/seeds/`);
    const products: FeedProduct[] = [];
    // ... cheerio Selektoren ...
    return products;
  }
}
```

2. In `src/feeds/index.ts` registrieren:
```typescript
import { NeuerShopFeed } from './adapters/neuer-shop.feed';
registry.set('neuer-shop', new NeuerShopFeed());
```

## Aenderungshistorie

### v2.0 (2026-02-18) - Hybrid Feed System
- **Breaking:** Playwright/Browser komplett entfernt, nur noch axios + cheerio
- **Breaking:** Alte scraper.worker.ts und feed-manager.ts entfernt
- 11 Feed-Adapter implementiert (vorher 3)
- Seedsman: GraphQL API statt HTML
- FastBuds: JSON-LD statt CSS-Selektoren
- Alle URLs und Selektoren auf aktuelle Shop-Versionen aktualisiert
- BullMQ Worker fuer Job-Queue
- Admin-Endpoints fuer manuellen Import
- ~2.611 Produkte aus 10 Shops importiert

### v1.0 (Original)
- Playwright-basiertes Scraping (3 Shops: Zamnesia, RQS, Sensi Seeds)
- Brauchte Chromium Browser im Container
- Wurde durch Cloudflare/Bot-Detection blockiert

// Feed Importer - Linda Seeds (linda-seeds.com)
// Platform: Custom Shop System
// Categories: /de/feminisierte-, /de/autoflowering-, /de/regulaere-hanfsamen-kaufen/
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';
import { firecrawlService } from '../../services/firecrawl.service';
import * as cheerio from 'cheerio';

export class LindaSeedsFeed extends BaseFeed {
  protected seedbankName = 'Linda Seeds';
  protected seedbankSlug = 'linda-seeds';
  protected baseUrl = 'https://www.linda-seeds.com';
  protected source: FeedSource = 'html';
  protected rateLimitMs = 2000;

  private readonly categories = [
    { path: '/de/feminisierte-hanfsamen-kaufen', type: 'feminized' as const },
    { path: '/de/autoflowering-hanfsamen-kaufen', type: 'autoflower' as const },
    { path: '/de/regulaere-hanfsamen-kaufen', type: 'regular' as const },
    { path: '/de/cbd-hanfsamen-kaufen', type: 'feminized' as const },
  ];

  async importAll(): Promise<FeedProduct[]> {
    const allProducts: FeedProduct[] = [];
    const seenUrls = new Set<string>();

    for (const { path, type } of this.categories) {
      try {
        const products = await this.scrapeCategory(path, type);
        for (const p of products) {
          if (!seenUrls.has(p.url)) {
            seenUrls.add(p.url);
            allProducts.push(p);
          }
        }
        if (products.length > 0) {
          logger.info(`[${this.seedbankName}] ${path}: ${products.length} Produkte`);
        }
      } catch (error: any) {
        logger.debug(`[${this.seedbankName}] Category ${path} failed: ${error.message}`);
      }
    }

    logger.info(`[${this.seedbankName}] Gesamt: ${allProducts.length} Produkte`);
    return allProducts;
  }

  private async scrapeCategory(
    categoryPath: string,
    defaultType: 'feminized' | 'autoflower' | 'regular'
  ): Promise<FeedProduct[]> {
    const products: FeedProduct[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 20) {
      try {
        const url = page === 1
          ? `${this.baseUrl}${categoryPath}`
          : `${this.baseUrl}${categoryPath}?page=${page}`;

        // Versuche zuerst mit Cheerio
        let $ = await this.fetchHtml(url);
        let items = $('article.card-item');

        // Wenn keine Produkte gefunden, versuche Firecrawl (wegen JavaScript-Pricing)
        if (items.length === 0 && firecrawlService.isEnabled()) {
          logger.info(`[${this.seedbankName}] ${categoryPath} Seite ${page}: Cheerio hat 0 Items, versuche Firecrawl...`);
          const htmlFromFirecrawl = await firecrawlService.scrapeWithJsRendering(url);
          if (htmlFromFirecrawl) {
            $ = cheerio.load(htmlFromFirecrawl);
            items = $('article.card-item');
          }
        }

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        items.each((_i, el) => {
          try {
            const $el = $(el);

            // Produkt-ID und Titel
            const productId = $el.attr('id');
            const titleLink = $el.find('.card_title a').first();
            const name = titleLink.text().trim();
            const url = titleLink.attr('href') || '';

            if (!name || !url) return;

            // Preis aus hidden div: id="id_{productId}_0"
            let price: number | null = null;
            if (productId) {
              const priceDiv = $(`#id_${productId}_0`);
              if (priceDiv.length) {
                const priceText = priceDiv.html() || '';
                // Enthält HTML wie: <div class="h2 special muy-1">35.50 EUR</div>
                const priceMatch = priceText.match(/(\d+[\.,]\d+)\s*EUR/);
                if (priceMatch) {
                  price = parseFloat(priceMatch[1].replace(',', '.'));
                }
              }
            }

            // Fallback: Versuche Preis direkt zu parsen
            if (!price) {
              const priceText = $el.find('.price, .h2.special').first().text();
              price = this.parsePrice(priceText);
            }

            if (!price) return;

            // Bild
            const imageUrl = $el.find('img').first().attr('src') || '';

            // Breeder aus Subtitle
            const breeder = $el.find('.sub-cart-title a').first().text().trim() || '';

            // Seed Count aus Name
            const seedCount = this.parseSeedCount(name) || 5;

            // Typ detektieren
            const type = this.detectSeedType(name);

            const cleanName = name
              .replace(/\s*\d+\s*(seeds?|samen)\s*/gi, '')
              .replace(/\s*(feminized|autoflower|auto|regular)\s*/gi, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            products.push({
              name: cleanName,
              breeder: breeder || 'Linda Seeds',
              type,
              price,
              currency: 'EUR',
              inStock: true,
              packSize: `${seedCount} Seeds`,
              seedCount,
              url,
              imageUrl: imageUrl || undefined,
            });
          } catch {}
        });

        page++;
      } catch (error: any) {
        logger.error(`[${this.seedbankName}] Seite ${page} Fehler: ${error.message}`);
        hasMore = false;
      }
    }

    return products;
  }
}

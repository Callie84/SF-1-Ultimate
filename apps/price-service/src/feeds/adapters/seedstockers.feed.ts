// Feed Importer - Seedstockers (Elementor/PrestaShop Hybrid)
// Neue URL-Struktur seit 2026-03: /en/{type}-cannabis-seeds
// Preise werden via productsVariantsJson[id] als eingebettetes JSON geladen
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class SeedstockersFeed extends BaseFeed {
  protected seedbankName = 'Seedstockers';
  protected seedbankSlug = 'seedstockers';
  protected baseUrl = 'https://www.seedstockers.com';
  protected source: FeedSource = 'html';

  protected affiliateId = process.env.SEEDSTOCKERS_AFFILIATE_ID || '';

  private readonly categories = [
    { path: '/en/feminised-cannabis-seeds', type: 'feminized' as const },
    { path: '/en/autoflower-cannabis-seeds', type: 'autoflower' as const },
    { path: '/en/regular-cannabis-seeds', type: 'regular' as const },
  ];

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    const separator = productUrl.includes('?') ? '&' : '?';
    return `${productUrl}${separator}a_aid=${this.affiliateId}`;
  }

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
        logger.info(`[${this.seedbankName}] ${path}: ${products.length} Produkte`);
      } catch (error: any) {
        logger.error(`[${this.seedbankName}] Fehler bei ${path}: ${error.message}`);
      }
    }

    logger.info(`[${this.seedbankName}] Gesamt: ${allProducts.length} Produkte`);
    return allProducts;
  }

  private extractVariantPrices(html: string): Map<string, number> {
    // Extrahiert Preise aus eingebettetem productsVariantsJson[id] = JSON.parse('...')
    const priceMap = new Map<string, number>();
    const pattern = /productsVariantsJson\[(\d+)\]\s*=\s*JSON\.parse\('(.*?)'\);/gs;
    let match;

    while ((match = pattern.exec(html)) !== null) {
      const productId = match[1];
      const rawJson = match[2].replace(/\\"/g, '"');
      try {
        const variants: Record<string, any> = JSON.parse(rawJson);
        // Finde den günstigsten Nicht-Collection Preis
        let minPrice = Infinity;
        for (const variant of Object.values(variants)) {
          const name = variant.name || '';
          const priceStr = variant.price || '0';
          if (name === 'Collection' || priceStr === '0,00') continue;
          const price = parseFloat(priceStr.replace(',', '.'));
          if (!isNaN(price) && price > 0 && price < minPrice) {
            minPrice = price;
          }
        }
        if (minPrice !== Infinity) {
          priceMap.set(productId, minPrice);
        }
      } catch {
        // Skip ungültige JSON-Blöcke
      }
    }

    return priceMap;
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

        const $ = await this.fetchHtml(url);
        const rawHtml = $.html();

        // Preise aus eingebettetem JSON extrahieren
        const priceMap = this.extractVariantPrices(rawHtml);

        const items = $('.product-description');

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        items.each((_i, el) => {
          try {
            const $el = $(el);

            // Name und Link
            const titleEl = $el.find('.h3.product-title a, h3.product-title a').first();
            const name = titleEl.text().trim();
            const link = titleEl.attr('href') || '';
            if (!name || !link) return;

            const fullUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;

            // Bild
            const imageUrl = $el.closest('.product-container, .col-md-4, .elementor-widget-wrap')
              .find('img.product-thumbnail, .thumbnail.product-thumbnail img, img[src*="seedstockers"]').first().attr('src')
              || $el.closest('[class*="column"]').find('img').first().attr('src') || '';

            // Produkt-ID aus addToCartFormWrapper (im gleichen Container)
            const productId = $el.closest('[class*="product"]')
              .find('[data-product-id]').first().attr('data-product-id')
              || $el.parent().parent().find('[data-product-id]').first().attr('data-product-id')
              || '';

            const price = productId ? (priceMap.get(productId) ?? 0) : 0;
            if (!price) return;

            const type = this.detectSeedType(name + ' ' + categoryPath) || defaultType;
            const seedCount = this.parseSeedCount(name) || 1;
            const outOfStock = !!$el.find('.product-unavailable, .out-of-stock').length;

            products.push({
              name: name.replace(/\s*©\s*|\s*\d+\s*(seeds?|fem\.?|auto\.?)\s*/gi, ' ').replace(/\s+/g, ' ').trim(),
              breeder: 'Seedstockers',
              type,
              price,
              currency: 'EUR',
              inStock: !outOfStock,
              packSize: `${seedCount} Seeds`,
              seedCount,
              url: fullUrl,
              affiliateUrl: this.generateAffiliateUrl(fullUrl),
              imageUrl: imageUrl || undefined,
            });
          } catch {}
        });

        hasMore = $('a[rel="next"], a.next, li.next a, .pagination .next a').length > 0;
        page++;

      } catch (error: any) {
        logger.error(`[${this.seedbankName}] Seite ${page} Fehler: ${error.message}`);
        hasMore = false;
      }
    }

    return products;
  }
}

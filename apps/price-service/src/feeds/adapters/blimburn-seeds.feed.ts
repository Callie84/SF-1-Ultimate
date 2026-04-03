// Feed Importer - Blimburn Seeds (blimburnseeds.com)
// Platform: WooCommerce Store REST API (/wp-json/wc/store/v1/products)
// Preise in Cent (integer), z.B. 1750 = $17.50
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class BlimburnSeedsFeed extends BaseFeed {
  protected seedbankName = 'Blimburn Seeds';
  protected seedbankSlug = 'blimburn-seeds';
  protected baseUrl = 'https://blimburnseeds.com';
  protected source: FeedSource = 'html';
  protected rateLimitMs = 2000;

  protected affiliateId = process.env.BLIMBURN_AFFILIATE_ID || '';

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    const separator = productUrl.includes('?') ? '&' : '?';
    return `${productUrl}${separator}ref=${this.affiliateId}`;
  }

  async importAll(): Promise<FeedProduct[]> {
    const allProducts: FeedProduct[] = [];
    const seenUrls = new Set<string>();

    try {
      const products = await this.scrapeViaApi();
      for (const p of products) {
        if (!seenUrls.has(p.url)) {
          seenUrls.add(p.url);
          allProducts.push(p);
        }
      }
      logger.info(`[${this.seedbankName}] API: ${allProducts.length} Produkte`);
    } catch (error: any) {
      logger.error(`[${this.seedbankName}] API Fehler: ${error.message}`);
    }

    logger.info(`[${this.seedbankName}] Gesamt: ${allProducts.length} Produkte`);
    return allProducts;
  }

  private async scrapeViaApi(): Promise<FeedProduct[]> {
    const products: FeedProduct[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
      try {
        const apiUrl = `${this.baseUrl}/wp-json/wc/store/v1/products?per_page=100&page=${page}`;
        const data = await this.fetchJson<any[]>(apiUrl);

        if (!Array.isArray(data) || data.length === 0) {
          hasMore = false;
          break;
        }

        for (const product of data) {
          try {
            const name = product.name || '';
            if (!name) continue;

            // Preis ist in Minor Units (Cent): 1750 = $17.50
            const priceRaw = product.prices?.price || product.prices?.regular_price || '0';
            const price = parseFloat(priceRaw) / 100;
            if (price <= 0) continue;

            const permalink = product.permalink || '';
            if (!permalink) continue;

            // Typ aus Kategorien ableiten
            const categories: string[] = (product.categories || []).map((c: any) => c.name?.toLowerCase() || '');
            let type: 'feminized' | 'autoflower' | 'regular' = 'feminized';
            if (categories.some(c => c.includes('autoflower') || c.includes('auto '))) {
              type = 'autoflower';
            } else if (categories.some(c => c.includes('regular'))) {
              type = 'regular';
            }

            const imageUrl = product.images?.[0]?.src || '';
            const seedCount = this.parseSeedCount(name) || 3;

            const cleanName = name
              .replace(/\s*\d+\s*(seeds?|samen)\s*/gi, '')
              .replace(/\s*(feminized|autoflower|automatic|auto|regular)\s*/gi, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            products.push({
              name: cleanName,
              breeder: 'Blimburn Seeds',
              type,
              price,
              currency: 'USD',
              inStock: product.is_in_stock !== false,
              packSize: `${seedCount} Seeds`,
              seedCount,
              url: permalink,
              affiliateUrl: this.generateAffiliateUrl(permalink),
              imageUrl: imageUrl || undefined,
            });
          } catch {}
        }

        hasMore = data.length === 100;
        page++;

      } catch (error: any) {
        logger.error(`[${this.seedbankName}] API Seite ${page} Fehler: ${error.message}`);
        hasMore = false;
      }
    }

    return products;
  }
}

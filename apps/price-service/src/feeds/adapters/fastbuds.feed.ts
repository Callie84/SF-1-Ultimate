// Feed Importer - FastBuds (Affiliate: bis 50%! Höchste Provision)
// Uses JSON-LD structured data embedded in HTML pages
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class FastBudsFeed extends BaseFeed {
  protected seedbankName = 'FastBuds';
  protected seedbankSlug = 'fastbuds';
  protected baseUrl = 'https://2fast4buds.com';
  protected source: FeedSource = 'html';

  protected affiliateId = process.env.FASTBUDS_AFFILIATE_ID || '';

  private categoryUrls = [
    '/autoflowering-cannabis-seeds',
    '/feminized-seeds',
  ];

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    const separator = productUrl.includes('?') ? '&' : '?';
    return `${productUrl}${separator}ref=${this.affiliateId}`;
  }

  async importAll(): Promise<FeedProduct[]> {
    const allProducts: FeedProduct[] = [];
    const seenUrls = new Set<string>();

    for (const categoryUrl of this.categoryUrls) {
      try {
        const products = await this.scrapeCategory(categoryUrl);
        for (const p of products) {
          if (!seenUrls.has(p.url)) {
            seenUrls.add(p.url);
            allProducts.push(p);
          }
        }
        logger.info(`[${this.seedbankName}] ${categoryUrl}: ${products.length} Produkte`);
      } catch (error: any) {
        logger.error(`[${this.seedbankName}] Fehler bei ${categoryUrl}: ${error.message}`);
      }
    }

    logger.info(`[${this.seedbankName}] Gesamt: ${allProducts.length} Produkte`);
    return allProducts;
  }

  private async scrapeCategory(categoryPath: string): Promise<FeedProduct[]> {
    const products: FeedProduct[] = [];

    try {
      const url = `${this.baseUrl}${categoryPath}`;
      const $ = await this.fetchHtml(url);

      // FastBuds embeds JSON-LD Product data
      $('script[type="application/ld+json"]').each((_i, el) => {
        try {
          const json = $(el).html();
          if (!json) return;

          const data = JSON.parse(json);
          const items = data['@graph'] || (data['@type'] === 'Product' ? [data] : []);

          for (const item of items) {
            if (item['@type'] !== 'Product') continue;

            const name = item.name;
            const offers = item.offers;
            if (!name || !offers) continue;

            const lowPrice = parseFloat(offers.lowPrice || offers.price || '0');
            if (lowPrice <= 0) continue;

            const productUrl = offers.url || item.url || '';
            const imageUrl = Array.isArray(item.image) ? item.image[0] : item.image;
            const type = this.detectSeedType(categoryPath + ' ' + name);

            products.push({
              name: name.replace(/\s*Auto(™|flower)?\s*/i, ' Auto ').trim(),
              breeder: 'FastBuds',
              type,
              price: lowPrice,
              currency: offers.priceCurrency || 'EUR',
              inStock: offers.availability?.includes('InStock') ?? true,
              packSize: '1 Seed',
              seedCount: 1,
              url: productUrl,
              affiliateUrl: this.generateAffiliateUrl(productUrl),
              imageUrl: imageUrl || undefined,
            });
          }
        } catch (err) {
          // Skip invalid JSON-LD
        }
      });

      logger.info(`[${this.seedbankName}] ${categoryPath}: ${products.length} Produkte via JSON-LD`);
    } catch (error: any) {
      logger.error(`[${this.seedbankName}] Import fehlgeschlagen: ${error.message}`);
    }

    return products;
  }
}

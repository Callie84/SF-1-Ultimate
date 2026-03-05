// Feed Importer - Greenhouse Seeds (CS-Cart Shop)
// All ~160 products on one page, no pagination needed
// Products in div.ty-column4, prices in span.ty-price-num
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class GreenhouseFeed extends BaseFeed {
  protected seedbankName = 'Greenhouse Seeds';
  protected seedbankSlug = 'greenhouse-seeds';
  protected baseUrl = 'https://shop.greenhouseseeds.nl';
  protected source: FeedSource = 'html';

  protected affiliateId = process.env.GREENHOUSE_AFFILIATE_ID || '';

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    const separator = productUrl.includes('?') ? '&' : '?';
    return `${productUrl}${separator}ref=${this.affiliateId}`;
  }

  async importAll(): Promise<FeedProduct[]> {
    try {
      const products = await this.scrapeCatalog();
      logger.info(`[${this.seedbankName}] Gesamt: ${products.length} Produkte`);
      return products;
    } catch (error: any) {
      logger.error(`[${this.seedbankName}] Fehler: ${error.message}`);
      return [];
    }
  }

  private async scrapeCatalog(): Promise<FeedProduct[]> {
    const products: FeedProduct[] = [];

    // All products load on one page with default items_per_page
    const url = `${this.baseUrl}/feminised-cannabis-seeds/`;
    const $ = await this.fetchHtml(url);

    const items = $('div.ty-column4');
    logger.info(`[${this.seedbankName}] ${items.length} Produkt-Elemente gefunden`);

    items.each((_i, el) => {
      try {
        const $el = $(el);

        // Product name from a.product-title
        const titleLink = $el.find('a.product-title').first();
        const name = titleLink.text().trim();
        const link = titleLink.attr('href') || '';

        if (!name || !link) return;

        // Price: find span.ty-price, get numeric value from second ty-price-num span
        const priceSpan = $el.find('span.ty-price').first();
        // Get all ty-price-num spans - first is "€", second is the number
        const priceNums = priceSpan.find('span.ty-price-num');
        let priceText = '';
        if (priceNums.length >= 2) {
          priceText = priceNums.eq(1).text().trim(); // e.g. "55.00"
        } else if (priceNums.length === 1) {
          priceText = priceNums.first().text().trim();
        }

        const price = this.parsePrice(priceText);
        if (!price) return;

        // Image
        const imageUrl = $el.find('img.ty-pict').first().attr('src') || '';

        // Genetics info
        const genetics = $el.find('div[class*="grid-list__genetics_mod"]').first().text().trim() || undefined;

        // Seed count from features variants
        let seedCount = 1;
        const firstVariant = $el.find('span.ty-grid-list__item-features-variant').first().text().trim();
        if (firstVariant) {
          seedCount = this.parseSeedCount(firstVariant) || 1;
        }

        const fullUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;

        // Detect type from name and URL
        const type = this.detectSeedType(name + ' ' + fullUrl);

        products.push({
          name,
          breeder: 'Greenhouse Seeds',
          type,
          price,
          currency: 'EUR',
          inStock: true, // Listed products are in stock
          packSize: `${seedCount} Seeds`,
          seedCount,
          url: fullUrl,
          affiliateUrl: this.generateAffiliateUrl(fullUrl),
          imageUrl: imageUrl || undefined,
          genetics,
        });
      } catch (err) {
        // Skip
      }
    });

    return products;
  }
}

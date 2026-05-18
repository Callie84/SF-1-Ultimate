// Feed Importer - Weed Seed Shop (Affiliate: 30% flat!)
// NOTE: Weed Seed Shop is behind Cloudflare protection.
// HTML scraping is currently blocked (403).
// This adapter will work once a CSV/Feed URL is configured via WEEDSEEDSHOP_FEED_URL env var.
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class WeedSeedShopFeed extends BaseFeed {
  protected seedbankName = 'Weed Seed Shop';
  protected seedbankSlug = 'weed-seed-shop';
  protected baseUrl = 'https://www.weedseedshop.com';
  protected source: FeedSource = 'csv';

  protected affiliateId = process.env.WEEDSEEDSHOP_AFFILIATE_ID || '';
  private feedUrl = process.env.WEEDSEEDSHOP_FEED_URL || '';

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    const separator = productUrl.includes('?') ? '&' : '?';
    return `${productUrl}${separator}a_aid=${this.affiliateId}`;
  }

  async importAll(): Promise<FeedProduct[]> {
    if (!this.feedUrl) {
      logger.warn(`[${this.seedbankName}] Kein WEEDSEEDSHOP_FEED_URL konfiguriert. Cloudflare blockiert HTML-Scraping. Feed-URL im Affiliate-Portal beantragen.`);
      return [];
    }

    try {
      return await this.importFromCsv();
    } catch (error: any) {
      logger.error(`[${this.seedbankName}] CSV-Import fehlgeschlagen: ${error.message}`);
      return [];
    }
  }

  private async importFromCsv(): Promise<FeedProduct[]> {
    logger.info(`[${this.seedbankName}] Importiere CSV-Feed`);

    const rows = await this.fetchCsv(this.feedUrl);
    if (rows.length < 2) throw new Error('CSV-Feed leer');

    const headers = rows[0].map(h => h.toLowerCase().trim());
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('product'));
    const priceIdx = headers.findIndex(h => h.includes('price'));
    const urlIdx = headers.findIndex(h => h.includes('url') || h.includes('link'));
    const stockIdx = headers.findIndex(h => h.includes('stock'));
    const imageIdx = headers.findIndex(h => h.includes('image'));

    const products: FeedProduct[] = [];

    for (let i = 1; i < rows.length; i++) {
      try {
        const row = rows[i];
        if (row.length < 3) continue;

        const name = nameIdx >= 0 ? row[nameIdx]?.trim() : '';
        const priceStr = priceIdx >= 0 ? row[priceIdx]?.trim() : '';
        if (!name || !priceStr) continue;

        const price = this.parsePrice(priceStr);
        if (!price) continue;

        const url = urlIdx >= 0 ? row[urlIdx]?.trim() : '';
        const stockStr = stockIdx >= 0 ? row[stockIdx]?.trim() : 'in stock';
        const imageUrl = imageIdx >= 0 ? row[imageIdx]?.trim() : '';
        const seedCount = this.parseSeedCount(name) || 1;

        products.push({
          name: name.replace(/\s*-?\s*\d+\s*(seeds?|pack)\s*/i, '').trim(),
          breeder: 'Weed Seed Shop',
          type: this.detectSeedType(name),
          price,
          currency: 'EUR',
          inStock: !stockStr.toLowerCase().includes('out'),
          packSize: `${seedCount} Seeds`,
          seedCount,
          url: url || `${this.baseUrl}/search?q=${encodeURIComponent(name)}`,
          affiliateUrl: url ? this.generateAffiliateUrl(url) : undefined,
          imageUrl: imageUrl || undefined,
        });
      } catch (err) {
        // Skip
      }
    }

    logger.info(`[${this.seedbankName}] CSV-Import: ${products.length} Produkte`);
    return products;
  }
}

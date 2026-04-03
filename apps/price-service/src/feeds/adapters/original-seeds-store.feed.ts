// Feed Importer - Original Sensible Seeds (originalsensible.com)
// Platform: Custom PHP — product listings with div.product_block
// Kategorien: /feminized-cannabis-seeds, /autoflowering-cannabis-seeds
// Paginierung: keine (alle Produkte auf einer Seite)
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class OriginalSeedsStoreFeed extends BaseFeed {
  protected seedbankName = 'Original Sensible Seeds';
  protected seedbankSlug = 'original-sensible-seeds';
  protected baseUrl = 'https://originalsensible.com';
  protected source: FeedSource = 'html';
  protected rateLimitMs = 2000;

  protected affiliateId = process.env.ORIGINALSEEDS_AFFILIATE_ID || '';

  private readonly collections = [
    { slug: 'feminized-cannabis-seeds', type: 'feminized' as const },
    { slug: 'autoflowering-cannabis-seeds', type: 'autoflower' as const },
  ];

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    const separator = productUrl.includes('?') ? '&' : '?';
    return `${productUrl}${separator}ref=${this.affiliateId}`;
  }

  async importAll(): Promise<FeedProduct[]> {
    const allProducts: FeedProduct[] = [];
    const seenUrls = new Set<string>();

    for (const { slug, type } of this.collections) {
      try {
        const products = await this.scrapeCollection(slug, type);
        for (const p of products) {
          if (!seenUrls.has(p.url)) {
            seenUrls.add(p.url);
            allProducts.push(p);
          }
        }
        logger.info(`[${this.seedbankName}] ${slug}: ${products.length} Produkte`);
      } catch (error: any) {
        logger.error(`[${this.seedbankName}] Fehler bei ${slug}: ${error.message}`);
      }
    }

    logger.info(`[${this.seedbankName}] Gesamt: ${allProducts.length} Produkte`);
    return allProducts;
  }

  private async scrapeCollection(
    collectionSlug: string,
    defaultType: 'feminized' | 'autoflower' | 'regular'
  ): Promise<FeedProduct[]> {
    const products: FeedProduct[] = [];

    const url = `${this.baseUrl}/${collectionSlug}`;
    const $ = await this.fetchHtml(url);

    // Custom PHP shop: div.product_block
    const items = $('div.product_block');

    items.each((_i, el) => {
      try {
        const $el = $(el);

        // Name und Link: .product_info .product_name a
        const nameEl = $el.find('.product_info .product_name a').first();
        const name = nameEl.text().trim();
        const link = nameEl.attr('href') || '';
        if (!name || !link) return;

        // Preis: .product_price_mobile span ("FROM $14.29")
        const priceText = $el.find('.product_price_mobile span, .product_price span').first().text().trim()
          || $el.find('[class*="price"]').first().text().trim();
        // "FROM $14.29" → parsePrice entfernt "FROM "
        const price = this.parsePrice(priceText.replace(/from\s*/i, ''));
        if (!price) return;

        const imageUrl = $el.find('img').first().attr('src') || '';
        const fullUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
        const type = this.detectSeedType(name + ' ' + collectionSlug) || defaultType;
        const seedCount = this.parseSeedCount(name) || 3;

        const cleanName = name
          .replace(/\s*\d+\s*(seeds?|samen)\s*/gi, '')
          .replace(/\s*(feminized|autoflower|automatic|auto|regular)\s*/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        products.push({
          name: cleanName,
          breeder: 'Original Sensible Seeds',
          type,
          price,
          currency: 'USD',
          inStock: !$el.find('[class*="out-of-stock"], [class*="sold-out"]').length,
          packSize: `${seedCount} Seeds`,
          seedCount,
          url: fullUrl,
          affiliateUrl: this.generateAffiliateUrl(fullUrl),
          imageUrl: imageUrl || undefined,
        });
      } catch {}
    });

    return products;
  }
}

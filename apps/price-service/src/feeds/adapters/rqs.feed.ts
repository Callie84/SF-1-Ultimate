// Feed Importer - Royal Queen Seeds (Affiliate: 15-20%, Cookie unbegrenzt!)
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class RQSFeed extends BaseFeed {
  protected seedbankName = 'Royal Queen Seeds';
  protected seedbankSlug = 'royal-queen-seeds';
  protected baseUrl = 'https://www.royalqueenseeds.de';
  protected source: FeedSource = 'html';

  protected affiliateId = process.env.RQS_AFFILIATE_ID || '';

  // RQS uses numeric category IDs in URLs
  private categoryUrls = [
    '/33-feminisierte-hanfsamen',
    '/34-autoflowering-hanfsamen',
    '/54-regulaere-cannabissamen',
  ];

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    return `https://www.royalqueenseeds.de/?ref=${this.affiliateId}&url=${encodeURIComponent(productUrl)}`;
  }

  async importAll(): Promise<FeedProduct[]> {
    const allProducts: FeedProduct[] = [];

    for (const categoryUrl of this.categoryUrls) {
      try {
        const products = await this.scrapeCategory(categoryUrl);
        allProducts.push(...products);
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
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 5) {
      try {
        const url = page === 1
          ? `${this.baseUrl}${categoryPath}`
          : `${this.baseUrl}${categoryPath}?p=${page}`;

        const $ = await this.fetchHtml(url);

        // RQS uses PrestaShop-style product listings
        const items = $('li.ajax_block_product');

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        items.each((_i, el) => {
          try {
            const $el = $(el);

            const name = $el.find('h3.product-title a.product-link').first().text().trim()
              || $el.find('.product-title a').first().text().trim();
            const priceText = $el.find('.prices-block .price').first().text().trim();
            const link = $el.find('a.product-link, a.product-image-link').first().attr('href') || '';
            const imageUrl = $el.find('img.product-image').first().attr('data-src')
              || $el.find('img.product-image').first().attr('src') || '';

            const price = this.parsePrice(priceText);
            if (!name || !price) return;

            const fullUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
            const type = this.detectSeedType(categoryPath + ' ' + name);

            const packMatch = name.match(/(\d+)\s*(seeds?|samen|stück)/i);
            const seedCount = packMatch ? parseInt(packMatch[1]) : 3;

            products.push({
              name: name.replace(/\s*-?\s*\d+\s*(seeds?|samen|stück)\s*/i, '').trim(),
              breeder: 'Royal Queen Seeds',
              type,
              price,
              currency: 'EUR',
              inStock: !$el.find('.out-of-stock, .sold-out').length,
              packSize: `${seedCount} Seeds`,
              seedCount,
              url: fullUrl,
              affiliateUrl: this.generateAffiliateUrl(fullUrl),
              imageUrl: imageUrl || undefined,
            });
          } catch (err) {
            // Skip
          }
        });

        // Check pagination
        hasMore = $('li.pagination_next a, a.next, a[rel="next"]').length > 0;
        page++;

      } catch (error: any) {
        logger.error(`[${this.seedbankName}] Seite ${page}: ${error.message}`);
        hasMore = false;
      }
    }

    return products;
  }
}

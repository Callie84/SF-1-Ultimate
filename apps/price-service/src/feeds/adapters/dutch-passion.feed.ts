// Feed Importer - Dutch Passion (Affiliate: 20-30%, Post Affiliate Pro)
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class DutchPassionFeed extends BaseFeed {
  protected seedbankName = 'Dutch Passion';
  protected seedbankSlug = 'dutch-passion';
  protected baseUrl = 'https://dutch-passion.com';
  protected source: FeedSource = 'html';

  protected affiliateId = process.env.DUTCH_PASSION_AFFILIATE_ID || '';

  private categoryUrls = [
    '/de/hanfsamen/feminisierte-hanfsamen',
    '/de/hanfsamen/autoflower-hanfsamen',
    '/de/hanfsamen/regulare-hanfsamen',
  ];

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    return `https://dutch-passion.com/aff.php?aff=${this.affiliateId}&url=${encodeURIComponent(productUrl)}`;
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

    while (hasMore && page <= 10) {
      try {
        const url = page === 1
          ? `${this.baseUrl}${categoryPath}`
          : `${this.baseUrl}${categoryPath}?page=${page}`;

        const $ = await this.fetchHtml(url);

        // Dutch Passion uses PrestaShop with product-miniature cards
        const items = $('div.product-miniature.card, article.product-miniature');

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        items.each((_i, el) => {
          try {
            const $el = $(el);

            const name = $el.find('.product-miniature__title').first().text().trim()
              || $el.find('h5, h3, .product-title').first().text().trim();
            const priceText = $el.find('.product-miniature__pricing').first().text().trim()
              || $el.find('.price').first().text().trim();
            const link = $el.find('a.stretched-link, a.product-miniature__thumb-link').first().attr('href')
              || $el.find('a[href*="hanfsamen"]').first().attr('href')
              || $el.find('a').first().attr('href') || '';
            const imageUrl = $el.find('img').first().attr('data-src')
              || $el.find('img').first().attr('src') || '';

            const price = this.parsePrice(priceText);
            if (!name || !price) return;

            const fullUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
            const type = this.detectSeedType(categoryPath + ' ' + name);
            const seedCount = this.parseSeedCount(name) || 3;

            products.push({
              name: name.replace(/\s*-?\s*\d+\s*(seeds?|samen|stück|pack)\s*/i, '').trim(),
              breeder: 'Dutch Passion',
              type,
              price,
              currency: 'EUR',
              inStock: !$el.find('.out-of-stock, .sold-out, .unavailable').length,
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

        hasMore = $('a[rel="next"], .next a, li.next a').length > 0;
        page++;

      } catch (error: any) {
        logger.error(`[${this.seedbankName}] Seite ${page}: ${error.message}`);
        hasMore = false;
      }
    }

    return products;
  }
}

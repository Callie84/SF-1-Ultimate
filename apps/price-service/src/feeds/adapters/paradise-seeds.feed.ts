// Feed Importer - Paradise Seeds (WooCommerce Shop)
// HTML scraping via cheerio
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class ParadiseSeedsFeed extends BaseFeed {
  protected seedbankName = 'Paradise Seeds';
  protected seedbankSlug = 'paradise-seeds';
  protected baseUrl = 'https://www.paradise-seeds.com';
  protected source: FeedSource = 'html';

  protected affiliateId = process.env.PARADISE_AFFILIATE_ID || '';

  private categoryUrls = [
    '/cannabis-seeds/',
    '/autoflower-cannabis-seeds/',
  ];

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    const separator = productUrl.includes('?') ? '&' : '?';
    return `${productUrl}${separator}aff=${this.affiliateId}`;
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
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
      try {
        const url = page === 1
          ? `${this.baseUrl}${categoryPath}`
          : `${this.baseUrl}${categoryPath}page/${page}/`;

        const $ = await this.fetchHtml(url);

        // WooCommerce product listings
        const items = $('li.product, li[class*="type-product"]');

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        items.each((_i, el) => {
          try {
            const $el = $(el);

            const name = $el.find('.woocommerce-loop-product__title, h2').first().text().trim();
            const priceText = $el.find('.woocommerce-Price-amount').first().text().trim()
              || $el.find('.price').first().text().trim();
            const link = $el.find('a.woocommerce-LoopProduct-link').first().attr('href')
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
              breeder: 'Paradise Seeds',
              type,
              price,
              currency: 'EUR',
              inStock: !$el.hasClass('outofstock') && !$el.find('.out-of-stock').length,
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

        hasMore = $('a.next.page-numbers, .woocommerce-pagination a.next').length > 0;
        page++;

      } catch (error: any) {
        logger.error(`[${this.seedbankName}] Seite ${page}: ${error.message}`);
        hasMore = false;
      }
    }

    return products;
  }
}

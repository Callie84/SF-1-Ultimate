// Feed Importer - Sumo Seeds (sumo-seeds.com)
// Platform: WooCommerce oder Custom — Samenbank mit kleinem Sortiment
// Kategorien: feminized, autoflowering seeds
// Paginierung: /page/N/
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class SumoSeedsFeed extends BaseFeed {
  protected seedbankName = 'Sumo Seeds';
  protected seedbankSlug = 'sumo-seeds';
  protected baseUrl = 'https://www.sumo-seeds.com';
  protected source: FeedSource = 'html';
  protected rateLimitMs = 2000;

  protected affiliateId = process.env.SUMOSEEDS_AFFILIATE_ID || '';

  private readonly categories = [
    { path: '/product-category/feminized', type: 'feminized' as const },
    { path: '/product-category/autoflower', type: 'autoflower' as const },
    { path: '/product-category/feminized-seeds', type: 'feminized' as const },
    { path: '/product-category/autoflowering-seeds', type: 'autoflower' as const },
    { path: '/seeds', type: 'feminized' as const },
    { path: '/cannabis-seeds', type: 'feminized' as const },
  ];

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    const separator = productUrl.includes('?') ? '&' : '?';
    return `${productUrl}${separator}ref=${this.affiliateId}`;
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
        if (products.length > 0) {
          logger.info(`[${this.seedbankName}] ${path}: ${products.length} Produkte`);
        }
      } catch (error: any) {
        logger.debug(`[${this.seedbankName}] ${path}: ${error.message}`);
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
          ? `${this.baseUrl}${categoryPath}/`
          : `${this.baseUrl}${categoryPath}/page/${page}/`;

        const $ = await this.fetchHtml(url);

        // WooCommerce product items
        const items = $('ul.products li.product, .woocommerce ul.products li.product, .products .product-item');

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        items.each((_i, el) => {
          try {
            const $el = $(el);

            const name = $el.find('.woocommerce-loop-product__title, h2.product-title, .product__title').first().text().trim();
            const priceText = $el.find('.price ins .amount, .price .woocommerce-Price-amount bdi').last().text().trim()
              || $el.find('.price').first().text().trim();
            const price = this.parsePrice(priceText);
            if (!name || !price) return;

            const link = $el.find('a.woocommerce-loop-product__link, a').first().attr('href') || '';
            const imageUrl = $el.find('img').first().attr('data-src') || $el.find('img').first().attr('src') || '';
            const fullUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
            const type = this.detectSeedType(name + ' ' + categoryPath) || defaultType;
            const seedCount = this.parseSeedCount(name) || 3;

            const cleanName = name
              .replace(/\s*\d+\s*(seeds?|samen)\s*/gi, '')
              .replace(/\s*(feminized|autoflower|automatic|auto|regular)\s*/gi, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            products.push({
              name: cleanName,
              breeder: 'Sumo Seeds',
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
          } catch {}
        });

        const nextLink = $('a.next.page-numbers, a[rel="next"]').first().attr('href');
        hasMore = !!nextLink && items.length > 0;
        page++;

      } catch (error: any) {
        logger.error(`[${this.seedbankName}] Seite ${page} Fehler: ${error.message}`);
        hasMore = false;
      }
    }

    return products;
  }
}

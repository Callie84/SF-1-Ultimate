// Feed Importer - Female Seeds (femaleseeds.nl)
// Platform: WooCommerce oder Custom PHP (NL Samenbank, einer der ältesten)
// Kategorien: feminized, autoflowering seeds
// Paginierung: /page/N/ oder ?paged=N
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class FemaleSeedsFeed extends BaseFeed {
  protected seedbankName = 'Female Seeds';
  protected seedbankSlug = 'female-seeds';
  protected baseUrl = 'https://www.femaleseeds.nl';
  protected source: FeedSource = 'html';
  protected rateLimitMs = 2000;

  protected affiliateId = process.env.FEMALESEEDS_AFFILIATE_ID || '';

  private readonly categories = [
    { path: '/en/feminized-cannabis-seeds', type: 'feminized' as const },
    { path: '/en/autoflowering-cannabis-seeds', type: 'autoflower' as const },
    { path: '/en/regular-cannabis-seeds', type: 'regular' as const },
    // WooCommerce Fallback
    { path: '/product-category/feminized', type: 'feminized' as const },
    { path: '/product-category/autoflowering', type: 'autoflower' as const },
    { path: '/seeds', type: 'feminized' as const },
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
          ? `${this.baseUrl}${categoryPath}`
          : categoryPath.startsWith('/en/')
            ? `${this.baseUrl}${categoryPath}?page=${page}`
            : `${this.baseUrl}${categoryPath}/page/${page}/`;

        const $ = await this.fetchHtml(url);

        // Versuche mehrere Selektoren für verschiedene Shop-Systeme
        const items = $(
          'article.product-miniature, .product-miniature, ' +
          'ul.products li.product, .woocommerce ul.products li.product, ' +
          '.product-item, .seed-item, .strain-item'
        );

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        items.each((_i, el) => {
          try {
            const $el = $(el);

            const name = $el.find(
              '.product-title a, h3.product-title a, .product_name, ' +
              '.woocommerce-loop-product__title, h2.product-title, .seed-name, .strain-name'
            ).first().text().trim();

            const priceText = $el.find(
              '.price, .product-price .price, .current-price .price, ' +
              '.price .amount, .price .woocommerce-Price-amount bdi'
            ).first().text().trim();
            const price = this.parsePrice(priceText);
            if (!name || !price) return;

            const link = $el.find('a.product-thumbnail, a.thumbnail, .product-title a, a.woocommerce-loop-product__link, a').first().attr('href') || '';
            const imageUrl = $el.find('img').first().attr('data-src') || $el.find('img').first().attr('src') || '';
            const fullUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
            const type = this.detectSeedType(name + ' ' + categoryPath) || defaultType;
            const seedCount = this.parseSeedCount(name) || 3;

            const cleanName = name
              .replace(/\s*\d+\s*(seeds?|samen|zaden)\s*/gi, '')
              .replace(/\s*(feminized|autoflower|automatic|auto|regular)\s*/gi, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            products.push({
              name: cleanName,
              breeder: 'Female Seeds',
              type,
              price,
              currency: 'EUR',
              inStock: !$el.find('.out-of-stock, .label-out-of-stock, .outofstock').length,
              packSize: `${seedCount} Seeds`,
              seedCount,
              url: fullUrl,
              affiliateUrl: this.generateAffiliateUrl(fullUrl),
              imageUrl: imageUrl || undefined,
            });
          } catch {}
        });

        const nextLink = $('a[rel="next"], .pagination .next a, li.pagination_next a, a.next.page-numbers').first().attr('href');
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

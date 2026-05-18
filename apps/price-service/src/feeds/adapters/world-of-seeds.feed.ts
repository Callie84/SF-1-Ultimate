// Feed Importer - World of Seeds (worldofseeds.eu)
// Platform: PrestaShop — typische Listing-Struktur mit .product-miniature
// Kategorien: feminized, autoflowering, regular cannabis seeds
// Paginierung: ?p=N oder /page-N
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class WorldOfSeedsFeed extends BaseFeed {
  protected seedbankName = 'World of Seeds';
  protected seedbankSlug = 'world-of-seeds';
  protected baseUrl = 'https://worldofseeds.eu';
  protected source: FeedSource = 'html';
  protected rateLimitMs = 2000;

  protected affiliateId = process.env.WORLDOFSEEDS_AFFILIATE_ID || '';

  private readonly categories = [
    { path: '/en/feminized-cannabis-seeds', type: 'feminized' as const },
    { path: '/en/autoflowering-cannabis-seeds', type: 'autoflower' as const },
    { path: '/en/regular-cannabis-seeds', type: 'regular' as const },
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
        logger.info(`[${this.seedbankName}] ${path}: ${products.length} Produkte`);
      } catch (error: any) {
        logger.error(`[${this.seedbankName}] Fehler bei ${path}: ${error.message}`);
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
          : `${this.baseUrl}${categoryPath}?p=${page}`;

        const $ = await this.fetchHtml(url);

        // PrestaShop-Muster: .product-miniature, .ajax_block_product, .product-container
        const items = $('.product-miniature, .ajax_block_product, .product-container, article.product-miniature');

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        items.each((_i, el) => {
          try {
            const $el = $(el);

            const name = $el.find('.product-title a, .product_name, h2.product-title a').first().text().trim();

            // Preis
            const priceText = $el.find('.price, .product-price, span.price').first().text().trim();
            const price = this.parsePrice(priceText);
            if (!name || !price) return;

            const link = $el.find('a.product-thumbnail, h2.product-title a, a.thumbnail').first().attr('href')
              || $el.find('a').first().attr('href') || '';

            const imageUrl = $el.find('img').first().attr('data-src')
              || $el.find('img').first().attr('src') || '';

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
              breeder: 'World of Seeds',
              type,
              price,
              currency: 'EUR',
              inStock: !$el.find('.out-of-stock, .label-out-of-stock').length,
              packSize: `${seedCount} Seeds`,
              seedCount,
              url: fullUrl,
              affiliateUrl: this.generateAffiliateUrl(fullUrl),
              imageUrl: imageUrl || undefined,
            });
          } catch {}
        });

        const nextLink = $('a[rel="next"], .pagination .next a, li.pagination_next a').first().attr('href');
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

// Feed Importer - Pyramid Seeds (pyramidseeds.com)
// Platform: WooCommerce / Custom — product listings
// Kategorien: /product-category/feminized/, /product-category/autoflowering/
// Paginierung: /page/N/ (WooCommerce-Standard)
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class PyramidSeedsFeed extends BaseFeed {
  protected seedbankName = 'Pyramid Seeds';
  protected seedbankSlug = 'pyramid-seeds';
  protected baseUrl = 'https://www.pyramidseeds.com';
  protected source: FeedSource = 'html';
  protected rateLimitMs = 2000;

  protected affiliateId = process.env.PYRAMIDSEEDS_AFFILIATE_ID || '';

  // PrestaShop DE — Kategorie-IDs aus URL-Struktur
  private readonly categories = [
    { path: '/de/307-feminisierte-marihuana-samen', type: 'feminized' as const },
    { path: '/de/60-autoflowering-samen', type: 'autoflower' as const },
    { path: '/de/333-regulaere-cannabissamen', type: 'regular' as const },
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

        // PrestaShop: article.product-miniature
        const items = $('article.product-miniature, .product-miniature');

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        items.each((_i, el) => {
          try {
            const $el = $(el);

            // PrestaShop: h3.h3.product-title > a
            const titleEl = $el.find('h3.h3.product-title a, h3.product-title a').first();
            const name = titleEl.text().trim();
            const link = titleEl.attr('href') || $el.find('a.thumbnail.product-thumbnail').first().attr('href') || '';

            // Preis: .product-price-and-shipping .price
            const priceText = $el.find('.product-price-and-shipping .price, span.price').first().text().trim();
            const price = this.parsePrice(priceText);
            if (!name || !price) return;

            const imageUrl = $el.find('img').first().attr('src') || '';
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
              breeder: 'Pyramid Seeds',
              type,
              price,
              currency: 'EUR',
              inStock: !$el.find('.product-unavailable, .out-of-stock').length,
              packSize: `${seedCount} Seeds`,
              seedCount,
              url: fullUrl,
              affiliateUrl: this.generateAffiliateUrl(fullUrl),
              imageUrl: imageUrl || undefined,
            });
          } catch {}
        });

        // PrestaShop Paginierung
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

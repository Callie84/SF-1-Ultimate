// Feed Importer - MH Seeds (mhseeds.de) — Deutscher Shop
// Platform: WooCommerce DE — typische .products .product Struktur
// Kategorien: /produkt-kategorie/feminisiert/, /produkt-kategorie/autoflowering/
// Paginierung: /seite/N/ oder /page/N/
// Preise: EUR
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class MHSeedsFeed extends BaseFeed {
  protected seedbankName = 'MH Seeds';
  protected seedbankSlug = 'mhseeds';
  protected baseUrl = 'https://mhseeds.de';
  protected source: FeedSource = 'html';
  protected rateLimitMs = 2000;

  protected affiliateId = process.env.MHSEEDS_AFFILIATE_ID || '';

  // Deutsch-WooCommerce: Kategorien können auf Deutsch sein
  private readonly categories = [
    { path: '/produkt-kategorie/feminisiert', type: 'feminized' as const },
    { path: '/produkt-kategorie/autoflowering', type: 'autoflower' as const },
    { path: '/produkt-kategorie/regular', type: 'regular' as const },
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
        // Stille Fehler bei nicht existenten Kategoriepfaden
        logger.debug(`[${this.seedbankName}] ${path}: nicht erreichbar — ${error.message}`);
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
        // WooCommerce DE nutzt /seite/N/ für Deutsche Installationen
        const url = page === 1
          ? `${this.baseUrl}${categoryPath}/`
          : `${this.baseUrl}${categoryPath}/page/${page}/`;

        const $ = await this.fetchHtml(url);

        const items = $('ul.products li.product, .woocommerce ul.products li');

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        items.each((_i, el) => {
          try {
            const $el = $(el);

            const name = $el.find('.woocommerce-loop-product__title, h2.woocommerce-loop-product__title, .product-title').first().text().trim();
            const priceText = $el.find('.price ins .woocommerce-Price-amount bdi, .price .woocommerce-Price-amount bdi').last().text().trim()
              || $el.find('.price').first().text().trim();
            const price = this.parsePrice(priceText);
            if (!name || !price) return;

            const link = $el.find('a.woocommerce-loop-product__link, a').first().attr('href') || '';
            const imageUrl = $el.find('img').first().attr('data-src') || $el.find('img').first().attr('src') || '';
            const fullUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
            const type = this.detectSeedType(name + ' ' + categoryPath) || defaultType;
            const seedCount = this.parseSeedCount(name) || 3;

            const cleanName = name
              .replace(/\s*\d+\s*(seeds?|samen|stück)\s*/gi, '')
              .replace(/\s*(feminized|feminisiert|autoflower|autoflowering|auto|regular)\s*/gi, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            products.push({
              name: cleanName,
              breeder: 'MH Seeds',
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

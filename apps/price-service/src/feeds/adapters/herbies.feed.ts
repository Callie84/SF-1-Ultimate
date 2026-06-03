// Feed Importer - Herbies Head Shop
// Custom-Plattform, CSS-Klassen: .category-item__item-name, .product-list-price__sale-price
// Pagination: /page/N
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class HerbiesFeed extends BaseFeed {
  protected seedbankName = 'Herbies Seeds';
  protected seedbankSlug = 'herbies-seeds';
  protected baseUrl = 'https://herbiesheadshop.com';
  protected source: FeedSource = 'html';

  protected affiliateId = process.env.HERBIES_AFFILIATE_ID || '';

  private readonly categories = [
    { path: '/us/feminized-cannabis-seeds', type: 'feminized' as const },
    { path: '/us/autoflower-cannabis-seeds', type: 'autoflower' as const },
    { path: '/us/regular-cannabis-seeds', type: 'regular' as const },
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

    while (hasMore && page <= 30) {
      try {
        const url = page === 1
          ? `${this.baseUrl}${categoryPath}`
          : `${this.baseUrl}${categoryPath}/page/${page}`;

        const $ = await this.fetchHtml(url);

        // Herbies nutzt data-name und category-item__container
        const items = $('div.category-item__container[data-name]');

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        items.each((_i, el) => {
          try {
            const $el = $(el);

            // Name und Breeder aus data-Attributen (zuverlässiger als CSS-Klassen)
            const rawName = $el.attr('data-name') || '';
            const breeder = $el.attr('data-brand') || 'Herbies Seeds';

            // Preis: shown-price Klasse
            const priceText = $el.find('[class*="shown-price"]').first().text().trim();
            const price = this.parsePrice(priceText);
            if (!rawName || !price) return;

            // Link: erster <a> der auf /cannabis-seeds/ zeigt
            let link = '';
            $el.find('a').each((_j, aEl) => {
              const href = $(aEl).attr('href') || '';
              if (href.includes('/cannabis-seeds/') || href.includes('/seeds/')) {
                link = href;
                return false;
              }
              return;
            });
            if (!link) link = $el.find('a').first().attr('href') || '';

            const imageUrl = $el.find('img').first().attr('data-src')
              || $el.find('img').first().attr('src') || '';

            const fullUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
            const type = this.detectSeedType(rawName + ' ' + categoryPath) || defaultType;
            const seedCount = this.parseSeedCount(rawName) || 1;

            // Name bereinigen: Breeder-Suffix und Samenanzahl entfernen
            const cleanName = rawName
              .replace(/\s*\([^)]+\)\s*$/, '')  // "(Breeder)" am Ende entfernen
              .replace(/\s*\d+\s*(seeds?|samen)\s*/gi, '')
              .replace(/\s+/g, ' ')
              .trim();

            products.push({
              name: cleanName,
              breeder,
              type,
              price,
              currency: 'USD',
              inStock: !$el.find('[class*="out-of-stock"], [class*="unavailable"]').length,
              packSize: `${seedCount} Seeds`,
              seedCount,
              url: fullUrl,
              affiliateUrl: this.generateAffiliateUrl(fullUrl),
              imageUrl: imageUrl || undefined,
            });
          } catch {}
        });

        // Herbies: Paginierung über "Next" Link
        const nextPageLink = $('a.pagination__next, a[rel="next"], [class*="pagination"] a[class*="next"]').first().attr('href');
        hasMore = !!nextPageLink;
        page++;

      } catch (error: any) {
        logger.error(`[${this.seedbankName}] Seite ${page} Fehler: ${error.message}`);
        hasMore = false;
      }
    }

    return products;
  }

}

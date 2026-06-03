// Feed Importer - Samenwahl (samenwahl.de) — Deutscher Growshop
// Platform: Shopware — TLS-Fingerprinting blockiert direktes Scraping → Firecrawl
// Kategorien: Cannabis-Samen Kategorien auf samenwahl.de
// Preise: EUR
import * as cheerio from 'cheerio';
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class SamenwahlFeed extends BaseFeed {
  protected seedbankName = 'Samenwahl';
  protected seedbankSlug = 'samenwahl';
  protected baseUrl = 'https://www.samenwahl.de';
  protected source: FeedSource = 'html';
  protected rateLimitMs = 2500;

  protected affiliateId = process.env.SAMENWAHL_AFFILIATE_ID || '';
  private readonly firecrawlApiKey = process.env.FIRECRAWL_API_KEY || '';

  private readonly categories = [
    { path: '/cannabis-samen/feminisierte-samen', type: 'feminized' as const },
    { path: '/cannabis-samen/autoflowering-samen', type: 'autoflower' as const },
    { path: '/cannabis-samen/regulaere-samen', type: 'regular' as const },
    { path: '/cannabis-samen', type: 'feminized' as const },
  ];

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    const separator = productUrl.includes('?') ? '&' : '?';
    return `${productUrl}${separator}ref=${this.affiliateId}`;
  }

  private async fetchViaFirecrawl(url: string): Promise<cheerio.CheerioAPI> {
    await this.respectRateLimit();
    const response = await this.client.post(
      'https://api.firecrawl.dev/v1/scrape',
      { url, formats: ['html'], waitFor: 2000 },
      {
        headers: {
          Authorization: `Bearer ${this.firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      }
    );
    const html = response.data?.data?.html || '';
    if (!html) throw new Error('Firecrawl: leere Antwort');
    return cheerio.load(html);
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
        // Shopware: ?p=N, WooCommerce: /page/N/
        const url = page === 1
          ? `${this.baseUrl}${categoryPath}`
          : `${this.baseUrl}${categoryPath}?p=${page}`;

        const $ = await this.fetchViaFirecrawl(url);

        // Shopware: .product--box, .box--product, article.product-box
        // WooCommerce: ul.products li.product
        const items = $('.product--box, .box--product, article.product-box, .product-listing .product-box, ul.products li.product, .products-list .product-item');

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        items.each((_i: number, el: any) => {
          try {
            const $el = $(el);

            // Shopware oder WooCommerce Namens-Selektor
            const name = $el.find('.product--title, .product-name, h2.product-name, .woocommerce-loop-product__title, .product-title a').first().text().trim();

            // Preis
            const priceText = $el.find('.product--price .price--normal, .price--default, .price, .woocommerce-Price-amount bdi').first().text().trim();
            const price = this.parsePrice(priceText);
            if (!name || !price) return;

            const link = $el.find('a.product--image, a.product-name, a.woocommerce-loop-product__link, a').first().attr('href') || '';
            const imageUrl = $el.find('img').first().attr('data-src') || $el.find('img').first().attr('src') || '';
            const fullUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
            const type = this.detectSeedType(name + ' ' + categoryPath) || defaultType;
            const seedCount = this.parseSeedCount(name) || 3;

            // Züchter aus Name extrahieren wenn vorhanden (oft "Züchter - Sorte" Format)
            let breeder = 'Samenwahl';
            let cleanName = name;
            const dashMatch = name.match(/^([A-Z][A-Za-z\s&]+?)\s*[-–]\s*(.+)$/);
            if (dashMatch) {
              breeder = dashMatch[1].trim();
              cleanName = dashMatch[2].trim();
            }

            cleanName = cleanName
              .replace(/\s*\d+\s*(seeds?|samen|stück)\s*/gi, '')
              .replace(/\s*(feminized|feminisiert|autoflower|auto|regular|regulär)\s*/gi, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            products.push({
              name: cleanName,
              breeder,
              type,
              price,
              currency: 'EUR',
              inStock: !$el.find('.is--notavailable, .is--buyable-false, .out-of-stock').length,
              packSize: `${seedCount} Seeds`,
              seedCount,
              url: fullUrl,
              affiliateUrl: this.generateAffiliateUrl(fullUrl),
              imageUrl: imageUrl || undefined,
            });
          } catch {}
        });

        // Shopware Paginierung: .paging--next, WooCommerce: a.next
        const nextLink = $('a.paging--next, .pagination--next a, a.next.page-numbers, a[rel="next"]').first().attr('href');
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

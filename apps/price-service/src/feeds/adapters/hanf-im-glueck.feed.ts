// Feed Importer - Hanf im Glück (hanf-im-glueck.shop) — Deutscher Growshop
// Platform: WooCommerce (Custom Theme "Storefront-Child")
// Domain: hanf-im-glueck.de → Redirect auf hanf-im-glueck.shop
// CF-Schutz: Hard-Block für direktes Scraping → Firecrawl API nötig
// Selektoren: div.card.card-product, h5.card-title, p.card-price
// Paginierung: /cannabis-samen/.../page/N/
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import * as cheerio from 'cheerio';
import { logger } from '../../utils/logger';

export class HanfImGlueckFeed extends BaseFeed {
  protected seedbankName = 'Hanf im Glück';
  protected seedbankSlug = 'hanf-im-glueck';
  protected baseUrl = 'https://hanf-im-glueck.shop';
  protected source: FeedSource = 'html';
  protected rateLimitMs = 4000;

  private readonly firecrawlApiKey = process.env.FIRECRAWL_API_KEY || 'fc-aa5eeb49c56347098e177509984c51ed';
  protected affiliateId = process.env.HANFIMGLUECK_AFFILIATE_ID || '';

  private readonly categories = [
    { path: '/cannabis-samen/feminisierte-cannabis-samen', type: 'feminized' as const },
    { path: '/cannabis-samen/autoflowering-cannabis-samen', type: 'autoflower' as const },
    { path: '/cannabis-samen/regulaere-cannabis-samen', type: 'regular' as const },
  ];

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    const separator = productUrl.includes('?') ? '&' : '?';
    return `${productUrl}${separator}ref=${this.affiliateId}`;
  }

  // Firecrawl statt direktem axios-Request (CF-Schutz umgehen)
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

    while (hasMore && page <= 10) {
      try {
        const url = page === 1
          ? `${this.baseUrl}${categoryPath}/`
          : `${this.baseUrl}${categoryPath}/page/${page}/`;

        const $ = await this.fetchViaFirecrawl(url);

        // WooCommerce Custom Theme: div.card.card-product
        const items = $('div.card.card-product');

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        items.each((_i, el) => {
          try {
            const $el = $(el);

            const name = $el.find('h5.card-title').first().text().trim();
            const link = $el.find('a.link-block').first().attr('href') || '';

            // Preis: "ab 5,00 €" oder "5,00 €" — nehme .price-from, Fallback auf gesamten Text
            const priceFromText = $el.find('.price-from').first().text().trim();
            const priceFullText = $el.find('p.card-price').first().text().trim();
            const priceText = priceFromText || priceFullText;
            const price = this.parsePrice(priceText);

            if (!name || !price || !link) return;

            const imageUrl = $el.find('img.card-img-top').first().attr('src')
              || $el.find('img').first().attr('data-src') || '';

            const fullUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
            const type = this.detectSeedType(name + ' ' + categoryPath) || defaultType;
            const seedCount = this.parseSeedCount(name) || 3;

            const cleanName = name
              .replace(/\s*\d+\s*(seeds?|samen|stück)\s*/gi, '')
              .replace(/\s*(feminized|feminisiert|autoflower|auto|regular|regulär)\s*/gi, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            const inStock = !$el.closest('li').hasClass('outofstock')
              && !$el.find('.out-of-stock').length;

            products.push({
              name: cleanName,
              breeder: 'Hanf im Glück',
              type,
              price,
              currency: 'EUR',
              inStock,
              packSize: `${seedCount} Seeds`,
              seedCount,
              url: fullUrl,
              affiliateUrl: this.generateAffiliateUrl(fullUrl),
              imageUrl: imageUrl || undefined,
            });
          } catch {}
        });

        // WooCommerce Paginierung: a.next.page-numbers oder a[rel="next"]
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

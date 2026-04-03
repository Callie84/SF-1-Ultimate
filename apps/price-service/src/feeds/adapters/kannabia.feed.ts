// Feed Importer - Kannabia (Sitemap + JSON-LD)
// Sitemap: https://www.kannabia.com/product-sitemap.xml
// JSON-LD: @type Product auf jeder Produktseite
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class KannabiaFeed extends BaseFeed {
  protected seedbankName = 'Kannabia';
  protected seedbankSlug = 'kannabia';
  protected baseUrl = 'https://www.kannabia.com';
  protected source: FeedSource = 'html';
  protected rateLimitMs = 2000;

  protected affiliateId = process.env.KANNABIA_AFFILIATE_ID || '';

  private readonly SEED_PATH_PREFIX = '/marijuana-seeds/';
  private readonly EXCLUDE_CATEGORIES = ['high-cbd-seeds-cannabinoids', 'fast-growing-seeds-go-fast', 'bioboost'];

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    const separator = productUrl.includes('?') ? '&' : '?';
    return `${productUrl}${separator}ref=${this.affiliateId}`;
  }

  async importAll(): Promise<FeedProduct[]> {
    const productUrls = await this.fetchProductUrlsFromSitemap();
    logger.info(`[${this.seedbankName}] ${productUrls.length} Produkt-URLs aus Sitemap`);

    if (productUrls.length === 0) return [];

    const allProducts: FeedProduct[] = [];

    for (const url of productUrls) {
      try {
        const product = await this.scrapeProductPage(url);
        if (product) allProducts.push(product);
      } catch (error: any) {
        logger.warn(`[${this.seedbankName}] Überspringe ${url}: ${error.message}`);
      }
    }

    logger.info(`[${this.seedbankName}] Gesamt: ${allProducts.length} Produkte`);
    return allProducts;
  }

  private async fetchProductUrlsFromSitemap(): Promise<string[]> {
    try {
      await this.respectRateLimit();
      const response = await this.client.get(`${this.baseUrl}/product-sitemap.xml`, {
        headers: { Accept: 'application/xml,text/xml,*/*' },
      });
      const xml = response.data as string;

      const matches = [...xml.matchAll(/<loc>(https:\/\/www\.kannabia\.com\/marijuana-seeds\/[^<]+)<\/loc>/gi)];
      return matches
        .map(m => m[1])
        .filter(url => !this.EXCLUDE_CATEGORIES.some(cat => url.includes(cat)));
    } catch (error: any) {
      logger.error(`[${this.seedbankName}] Sitemap-Fehler: ${error.message}`);
      return [];
    }
  }

  private async scrapeProductPage(url: string): Promise<FeedProduct | null> {
    const $ = await this.fetchHtml(url);

    // JSON-LD extrahieren
    let jsonLd: any = null;
    $('script[type="application/ld+json"]').each((_i, el) => {
      try {
        const data = JSON.parse($(el).html() || '');
        if (data['@type'] === 'Product') jsonLd = data;
      } catch {}
    });

    if (!jsonLd) return null;

    const name = (jsonLd.name as string)?.trim();
    const offers = jsonLd.offers;
    if (!name || !offers) return null;

    const price = parseFloat(offers.price || '0');
    if (price <= 0) return null;

    const currency = offers.priceCurrency || 'EUR';
    const inStock = offers.availability ? offers.availability.includes('InStock') : true;

    // Typ aus URL-Pfad ermitteln
    const type = url.includes('/autoflowering') ? 'autoflower' : 'feminized';
    const seedCount = this.parseSeedCount(name) || 1;

    return {
      name: name.replace(/\s*\d+\s*(seeds?|samen)\s*/gi, '').replace(/\s+/g, ' ').trim(),
      breeder: 'Kannabia',
      type,
      price,
      currency,
      inStock,
      packSize: `${seedCount} Seeds`,
      seedCount,
      url,
      affiliateUrl: this.generateAffiliateUrl(url),
      imageUrl: typeof jsonLd.image === 'string' ? jsonLd.image : undefined,
    };
  }
}

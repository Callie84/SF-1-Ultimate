// Feed Importer - Barney's Farm
// JSON-LD structured data auf Produktseiten, URLs via Sitemap
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class BarneysFarmFeed extends BaseFeed {
  protected seedbankName = "Barney's Farm";
  protected seedbankSlug = 'barneys-farm';
  protected baseUrl = 'https://www.barneysfarm.com';
  protected source: FeedSource = 'html';
  protected rateLimitMs = 2000; // etwas konservativer bei Produktseiten-Scraping

  protected affiliateId = process.env.BARNEYSFARM_AFFILIATE_ID || '';

  // Nur Seed-Produkte (keine Merch)
  private readonly EXCLUDE_KEYWORDS = [
    't-shirt', 'hoodie', 'grinder', 'lighter', 'glass', 'bag', 'cap', 'hat',
    'mug', 'poster', 'sticker', 'lanyard', 'beanie', 'zip', 'sweatshirt',
  ];

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
      const response = await this.client.get(`${this.baseUrl}/sitemap-com.xml`, {
        headers: { Accept: 'application/xml,text/xml,*/*' },
      });
      const xml = response.data as string;

      // Produkt-URLs haben Muster: /slug-1234 (name + numerische ID)
      const matches = [...xml.matchAll(/<loc>(https:\/\/www\.barneysfarm\.com\/[a-z0-9][a-z0-9-]*-\d+)<\/loc>/gi)];
      return matches.map(m => m[1]);
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

    // Merch-Produkte ausschließen
    const nameLower = name.toLowerCase();
    if (this.EXCLUDE_KEYWORDS.some(k => nameLower.includes(k))) return null;

    const price = parseFloat(offers.price || offers.lowPrice || '0');
    if (price <= 0) return null;

    const currency = offers.priceCurrency || 'EUR';
    const inStock = offers.availability ? offers.availability.includes('InStock') : true;
    const type = this.detectSeedType(name + ' ' + url);

    // Pack-Größen aus Select-Optionen lesen (data-stock + data-price)
    let seedCount = 1;
    let packSize = '1 Seed';
    $('select option[data-price]').each((_i, el) => {
      const $el = $(el);
      const optPrice = parseFloat($el.attr('data-price') || '0');
      if (optPrice > 0 && optPrice <= price + 0.01) {
        const text = $el.text();
        const m = text.match(/(\d+)\s*seed/i);
        if (m) {
          seedCount = parseInt(m[1], 10);
          packSize = `${seedCount} Seeds`;
        }
      }
    });

    const imageUrl = Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image;

    return {
      name: name
        .replace(/\s*(feminized|autoflower|auto|regular|seeds?)\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
      breeder: "Barney's Farm",
      type,
      price,
      currency,
      inStock,
      packSize,
      seedCount,
      url,
      affiliateUrl: this.generateAffiliateUrl(url),
      imageUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
    };
  }
}

// Feed Importer - Sensi Seeds (Affiliate: 20-30%, Cannaclicks/PAP)
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class SensiSeedsFeed extends BaseFeed {
  protected seedbankName = 'Sensi Seeds';
  protected seedbankSlug = 'sensi-seeds';
  protected baseUrl = 'https://sensiseeds.com';
  protected source: FeedSource = 'html';

  protected affiliateId = process.env.SENSI_AFFILIATE_ID || '';

  private categoryUrls = [
    '/de/feminisierte-samen',
    '/de/autoflowering-samen',
    '/de/regulaere-samen',
  ];

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    return `https://affiliate.sensiseeds.com/click.php?aff=${this.affiliateId}&url=${encodeURIComponent(productUrl)}`;
  }

  async importAll(): Promise<FeedProduct[]> {
    const allProducts: FeedProduct[] = [];

    for (const categoryUrl of this.categoryUrls) {
      try {
        const products = await this.scrapeCategory(categoryUrl);
        allProducts.push(...products);
        logger.info(`[${this.seedbankName}] ${categoryUrl}: ${products.length} Produkte`);
      } catch (error: any) {
        logger.error(`[${this.seedbankName}] Fehler bei ${categoryUrl}: ${error.message}`);
      }
    }

    logger.info(`[${this.seedbankName}] Gesamt: ${allProducts.length} Produkte`);
    return allProducts;
  }

  private async scrapeCategory(categoryPath: string): Promise<FeedProduct[]> {
    const products: FeedProduct[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
      try {
        const url = page === 1
          ? `${this.baseUrl}${categoryPath}`
          : `${this.baseUrl}${categoryPath}?pagenumber=${page}`;

        const $ = await this.fetchHtml(url);

        // Sensi Seeds uses nopCommerce-style item-box layout
        const items = $('div.item-box');

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        items.each((_i, el) => {
          try {
            const $el = $(el);

            const titleEl = $el.find('.product-title a, h3.product-title a, h2.product-title a').first();
            const name = titleEl.text().trim() || $el.find('.product-title').first().text().trim();
            const priceText = $el.find('.price.actual-price, .actual-price').first().text().trim();
            const link = titleEl.attr('href') || $el.find('a[href*="samen"]').first().attr('href') || '';
            const imageUrl = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';

            // Clean price: "Von €36,00" -> "36,00"
            const cleanPrice = priceText.replace(/^von\s*/i, '').trim();
            const price = this.parsePrice(cleanPrice);
            if (!name || !price) return;

            const fullUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
            const type = this.detectSeedType(categoryPath + ' ' + name);

            const packMatch = name.match(/(\d+)\s*(seeds?|samen)/i);
            const seedCount = packMatch ? parseInt(packMatch[1]) : 3;

            products.push({
              name: name.replace(/\s*-?\s*\d+\s*(seeds?|samen)\s*/i, '').trim(),
              breeder: 'Sensi Seeds',
              type,
              price,
              currency: 'EUR',
              inStock: !$el.find('.out-of-stock, .unavailable').length,
              packSize: `${seedCount} Seeds`,
              seedCount,
              url: fullUrl,
              affiliateUrl: this.generateAffiliateUrl(fullUrl),
              imageUrl: imageUrl || undefined,
            });
          } catch (err) {
            // Skip
          }
        });

        hasMore = $('li.next-page a, a.next-page, a[rel="next"]').length > 0;
        page++;

      } catch (error: any) {
        logger.error(`[${this.seedbankName}] Seite ${page}: ${error.message}`);
        hasMore = false;
      }
    }

    return products;
  }
}

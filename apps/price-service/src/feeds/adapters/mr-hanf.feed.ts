// Feed Importer - Mr. Hanf (DE)
// Mr. Hanf ist ein deutscher Reseller mit custom xtCommerce Shop
// Products in div.listingrow.card, prices in span.standard_price or option-item divs
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class MrHanfFeed extends BaseFeed {
  protected seedbankName = 'Mr. Hanf';
  protected seedbankSlug = 'mr-hanf';
  protected baseUrl = 'https://mr-hanf.de';
  protected source: FeedSource = 'html';

  protected affiliateId = process.env.MRHANF_AFFILIATE_ID || '';

  private categoryUrls = [
    '/samen-shop/feminisierte-samen/',
    '/samen-shop/autoflowering-samen/',
  ];

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    const separator = productUrl.includes('?') ? '&' : '?';
    return `${productUrl}${separator}affiliate=${this.affiliateId}`;
  }

  async importAll(): Promise<FeedProduct[]> {
    const allProducts: FeedProduct[] = [];
    const seenUrls = new Set<string>();

    for (const categoryUrl of this.categoryUrls) {
      try {
        const products = await this.scrapeCategory(categoryUrl);
        for (const p of products) {
          if (!seenUrls.has(p.url)) {
            seenUrls.add(p.url);
            allProducts.push(p);
          }
        }
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
    // Mr. Hanf has 3535 products, 6 per page - limit to first 50 pages (300 products per category)
    const maxPages = 50;

    while (page <= maxPages) {
      try {
        const url = page === 1
          ? `${this.baseUrl}${categoryPath}`
          : `${this.baseUrl}${categoryPath}?page=${page}`;

        const $ = await this.fetchHtml(url);

        const items = $('div.listingrow.card');

        if (items.length === 0) break;

        items.each((_i, el) => {
          try {
            const $el = $(el);

            // Product name and URL from h2.lr_title a
            const nameLink = $el.find('h2.lr_title a').first();
            const name = nameLink.text().trim();
            const productUrl = nameLink.attr('href') || '';

            if (!name || !productUrl) return;

            // Breeder from cite element
            const breeder = $el.find('footer.blockquote-footer cite').first().text().trim() || 'Mr. Hanf';

            // Price from span.standard_price (contains "ab 14,99 EUR")
            const priceContainer = $el.find('span.standard_price').first();
            // Remove the "ab" prefix span and get text
            const priceText = priceContainer.clone().children('span.small_price').remove().end().text().trim();
            const price = this.parsePrice(priceText);

            if (!price) return;

            // Image from lazy-loaded img
            const imageUrl = $el.find('img.lazyload').first().attr('data-src') || '';

            // Detect type from category path and name
            const type = this.detectSeedType(categoryPath + ' ' + name);

            // Try to get seed count from first available option
            let seedCount = 1;
            const firstOption = $el.find('div.option-item.option-available span.option-text').first().text().trim();
            if (firstOption) {
              seedCount = this.parseSeedCount(firstOption) || 1;
            }

            // Extract THC from specs table
            let thc: string | undefined;
            $el.find('table.tebals tr').each((_j, tr) => {
              const label = $(tr).find('td').first().text().trim().toLowerCase();
              if (label.includes('thc')) {
                thc = $(tr).find('td').last().text().trim();
              }
            });

            const fullUrl = productUrl.startsWith('http') ? productUrl : `${this.baseUrl}${productUrl}`;

            products.push({
              name,
              breeder,
              type,
              price,
              currency: 'EUR',
              inStock: $el.find('div.option-item.option-available').length > 0,
              packSize: `${seedCount} Seeds`,
              seedCount,
              url: fullUrl,
              affiliateUrl: this.generateAffiliateUrl(fullUrl),
              imageUrl: imageUrl || undefined,
              thc,
            });
          } catch (err) {
            // Skip
          }
        });

        // Pagination: check for "nächste Seite" link
        const hasNext = $('ul.pagination a.page-link[title="nächste Seite"]').length > 0;
        if (!hasNext) break;
        page++;

      } catch (error: any) {
        logger.error(`[${this.seedbankName}] Seite ${page}: ${error.message}`);
        break;
      }
    }

    return products;
  }
}

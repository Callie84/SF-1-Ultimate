// Feed Importer - Zamnesia (Affiliate: bis 33%)
// HTML scraping via cheerio - Zamnesia uses PrestaShop SSR
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class ZamnesiaFeed extends BaseFeed {
  protected seedbankName = 'Zamnesia';
  protected seedbankSlug = 'zamnesia';
  protected baseUrl = 'https://www.zamnesia.com';
  protected source: FeedSource = 'html';

  protected affiliateId = process.env.ZAMNESIA_AFFILIATE_ID || '';

  // Zamnesia uses numeric category IDs in URLs
  private categoryUrls = [
    '/35-cannabis-seeds/295-feminized-cannabis-seeds',
    '/35-cannabis-seeds/294-autoflowering-cannabis-seeds',
    '/35-cannabis-seeds/296-regular-cannabis-seeds',
  ];

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    const separator = productUrl.includes('?') ? '&' : '?';
    return `${productUrl}${separator}ref=${this.affiliateId}`;
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
          : `${this.baseUrl}${categoryPath}?p=${page}`;

        const $ = await this.fetchHtml(url);

        // Zamnesia uses PrestaShop ajax_block_product
        const items = $('div.ajax_block_product, .row.ajax_block_product');

        if (items.length === 0) {
          hasMore = false;
          break;
        }

        items.each((_i, el) => {
          try {
            const $el = $(el);

            const name = $el.find('a.product_link').first().text().trim()
              || $el.find('.product_desc a').first().text().trim();

            // Zamnesia splits price into integer + fractional parts
            const intPart = $el.find('.integer_part_of_price').first().text().trim();
            const fracPart = $el.find('.fractial_part_of_price').first().text().trim();
            let priceText = '';
            if (intPart) {
              priceText = `${intPart}.${fracPart || '00'}`;
            } else {
              priceText = $el.find('.price').first().text().trim();
            }

            const link = $el.find('a.product_img_link, a.product_link').first().attr('href') || '';
            const imageUrl = $el.find('img').first().attr('data-src')
              || $el.find('img').first().attr('src') || '';

            const price = this.parsePrice(priceText);
            if (!name || !price) return;

            const fullUrl = link.startsWith('http') ? link : `${this.baseUrl}${link}`;
            const type = this.detectSeedType(categoryPath + ' ' + name);

            const packMatch = name.match(/(\d+)\s*(seeds?|samen|stück)/i);
            const seedCount = packMatch ? parseInt(packMatch[1], 10) : 3;

            // Extract breeder from name pattern "Strain (Breeder) type"
            const breederMatch = name.match(/\(([^)]+)\)/);
            const breeder = breederMatch ? breederMatch[1] : 'Zamnesia Seeds';
            const cleanName = name.replace(/\s*\([^)]+\)\s*/g, ' ').replace(/\s*(feminized|automatic|regular)\s*/gi, '').trim();

            products.push({
              name: cleanName.replace(/\s*\d+\s*(seeds?|samen|stück)\s*/i, '').trim(),
              breeder,
              type,
              price,
              currency: 'EUR',
              inStock: !$el.find('.out-of-stock, .sold-out').length,
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

        const nextPage = $('a.next, a[rel="next"], li.pagination_next a');
        hasMore = nextPage.length > 0;
        page++;

      } catch (error: any) {
        logger.error(`[${this.seedbankName}] Seite ${page} fehler: ${error.message}`);
        hasMore = false;
      }
    }

    return products;
  }
}

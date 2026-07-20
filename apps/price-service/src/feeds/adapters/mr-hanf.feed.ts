// Feed Importer - Mr. Hanf (DE)
// Mr. Hanf ist ein deutscher Reseller mit custom xtCommerce Shop
// Shop-Redesign 2026-07: Produkte in div.listingbox (24/Seite), Name in .lb_title a,
// Preis in span.mrh-price ("14,99 EUR"), Bild in .lb_image img, Pagination via a[rel="next"].
// (Alt: div.listingrow.card / span.standard_price — seit dem Redesign tot, lieferte 0 Produkte.)
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

        const items = $('div.listingbox');

        if (items.length === 0) break;

        items.each((_i, el) => {
          try {
            const $el = $(el);

            // Name + URL: .lb_title a (Titel liegt in <strong class="h3"><a>…</a></strong>)
            const nameLink = $el.find('.lb_title a').first();
            const name = nameLink.text().trim();
            const productUrl = nameLink.attr('href') || '';

            if (!name || !productUrl) return;

            // Breeder aus Klammer im Namen (z. B. "Bubble Gum (00 Seeds)"), sonst Reseller
            const breederMatch = name.match(/\(([^)]+)\)\s*$/);
            const breeder = breederMatch ? breederMatch[1].trim() : 'Mr. Hanf';

            // Preis: span.mrh-price ("14,99 EUR"), Fallback div.lb_price ("ab 14,99 EUR")
            const priceText = $el.find('.mrh-price').first().text().trim()
              || $el.find('.lb_price').first().text().trim();
            const price = this.parsePrice(priceText);

            if (!price) return;

            // Bild: .lb_image img
            const imageUrl = $el.find('.lb_image img').first().attr('src')
              || $el.find('.lb_image img').first().attr('data-src') || '';

            // Verfügbarkeit aus Stock-Text (leer → als lieferbar werten)
            const stockText = $el.find('.mrh-listing-stock').text().trim().toLowerCase();
            const inStock = stockText.length === 0
              ? true
              : !/ausverkauft|nicht lieferbar|vergriffen|nicht verf/.test(stockText);

            // THC aus Attribut-Tabelle (.tebals), falls vorhanden
            let thc: number | undefined;
            $el.find('.tebals tr').each((_j, tr) => {
              const label = $(tr).find('td, th').first().text().trim().toLowerCase();
              if (label.includes('thc')) {
                const n = parseFloat(
                  $(tr).find('td, th').last().text().trim().replace(',', '.').replace(/[^\d.]/g, ''),
                );
                if (!Number.isNaN(n)) thc = n;
              }
            });

            // Seed-Menge wird im neuen Listing nicht mehr ausgewiesen ("ab"-Preis) → Default 1
            const seedCount = 1;
            const type = this.detectSeedType(categoryPath + ' ' + name);
            const fullUrl = productUrl.startsWith('http') ? productUrl : `${this.baseUrl}${productUrl}`;

            products.push({
              name,
              breeder,
              type,
              price,
              currency: 'EUR',
              inStock,
              packSize: `${seedCount} Seeds`,
              seedCount,
              url: fullUrl,
              affiliateUrl: this.generateAffiliateUrl(fullUrl),
              imageUrl: imageUrl || undefined,
              thc,
            });
          } catch (err) {
            // Fehlerhafte Items überspringen
          }
        });

        // Pagination: Shop nutzt jetzt <a rel="next">
        const hasNext = $('a[rel="next"]').length > 0;
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

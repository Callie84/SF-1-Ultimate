// Feed Importer - Seedsman (Affiliate: 15-20%)
// Uses Seedsman's public GraphQL API (Magento ScandiPWA)
import { BaseFeed, FeedProduct, FeedSource } from '../base.feed';
import { logger } from '../../utils/logger';

export class SeedsmanFeed extends BaseFeed {
  protected seedbankName = 'Seedsman';
  protected seedbankSlug = 'seedsman';
  protected baseUrl = 'https://www.seedsman.com';
  protected source: FeedSource = 'api';

  protected affiliateId = process.env.SEEDSMAN_AFFILIATE_ID || '';
  private feedUrl = process.env.SEEDSMAN_FEED_URL || '';

  generateAffiliateUrl(productUrl: string): string | undefined {
    if (!this.affiliateId) return undefined;
    const separator = productUrl.includes('?') ? '&' : '?';
    return `${productUrl}${separator}a_aid=${this.affiliateId}`;
  }

  async importAll(): Promise<FeedProduct[]> {
    // Priority 1: CSV Feed if configured
    if (this.feedUrl) {
      try {
        return await this.importFromCsv();
      } catch (error: any) {
        logger.warn(`[${this.seedbankName}] CSV-Feed fehlgeschlagen, Fallback auf GraphQL: ${error.message}`);
      }
    }

    // Fallback: GraphQL API
    return await this.importFromGraphQL();
  }

  private async importFromCsv(): Promise<FeedProduct[]> {
    logger.info(`[${this.seedbankName}] Importiere CSV-Feed`);

    const rows = await this.fetchCsv(this.feedUrl);
    if (rows.length < 2) throw new Error('CSV-Feed leer');

    const headers = rows[0].map(h => h.toLowerCase().trim());
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('product'));
    const priceIdx = headers.findIndex(h => h.includes('price'));
    const urlIdx = headers.findIndex(h => h.includes('url') || h.includes('link'));
    const stockIdx = headers.findIndex(h => h.includes('stock'));
    const breederIdx = headers.findIndex(h => h.includes('breeder') || h.includes('brand'));
    const imageIdx = headers.findIndex(h => h.includes('image'));
    const packIdx = headers.findIndex(h => h.includes('pack') || h.includes('quantity'));

    const products: FeedProduct[] = [];

    for (let i = 1; i < rows.length; i++) {
      try {
        const row = rows[i];
        if (row.length < 3) continue;

        const name = nameIdx >= 0 ? row[nameIdx]?.trim() : '';
        const priceStr = priceIdx >= 0 ? row[priceIdx]?.trim() : '';

        if (!name || !priceStr) continue;
        const price = this.parsePrice(priceStr);
        if (!price) continue;

        const url = urlIdx >= 0 ? row[urlIdx]?.trim() : '';
        const breeder = breederIdx >= 0 ? row[breederIdx]?.trim() : 'Unknown';
        const stockStr = stockIdx >= 0 ? row[stockIdx]?.trim() : 'in stock';
        const imageUrl = imageIdx >= 0 ? row[imageIdx]?.trim() : '';
        const packStr = packIdx >= 0 ? row[packIdx]?.trim() : '';
        const seedCount = packStr ? this.parseSeedCount(packStr) : this.parseSeedCount(name);

        products.push({
          name: name.replace(/\s*-?\s*\d+\s*(seeds?|pack)\s*/i, '').trim(),
          breeder: breeder || 'Unknown',
          type: this.detectSeedType(name),
          price,
          currency: 'EUR',
          inStock: !stockStr.toLowerCase().includes('out'),
          packSize: packStr || `${seedCount} Seeds`,
          seedCount: seedCount || 1,
          url: url || `${this.baseUrl}/search?q=${encodeURIComponent(name)}`,
          affiliateUrl: url ? this.generateAffiliateUrl(url) : undefined,
          imageUrl: imageUrl || undefined,
        });
      } catch (err) {
        // Skip
      }
    }

    logger.info(`[${this.seedbankName}] CSV-Import: ${products.length} Produkte`);
    return products;
  }

  private async importFromGraphQL(): Promise<FeedProduct[]> {
    logger.info(`[${this.seedbankName}] Importiere via GraphQL API`);

    const allProducts: FeedProduct[] = [];
    const categories = [
      { search: 'feminized seeds', type: 'feminized' as const },
      { search: 'autoflower seeds', type: 'autoflower' as const },
      { search: 'regular seeds', type: 'regular' as const },
    ];

    for (const cat of categories) {
      try {
        const products = await this.fetchGraphQLProducts(cat.search, cat.type);
        allProducts.push(...products);
        logger.info(`[${this.seedbankName}] ${cat.search}: ${products.length} Produkte`);
      } catch (error: any) {
        logger.error(`[${this.seedbankName}] GraphQL Fehler (${cat.search}): ${error.message}`);
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = allProducts.filter(p => {
      if (seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    });

    logger.info(`[${this.seedbankName}] Gesamt: ${unique.length} Produkte (${allProducts.length} vor Deduplizierung)`);
    return unique;
  }

  private async fetchGraphQLProducts(search: string, defaultType: 'feminized' | 'autoflower' | 'regular'): Promise<FeedProduct[]> {
    const products: FeedProduct[] = [];
    let page = 1;
    const pageSize = 50;
    let hasMore = true;

    while (hasMore && page <= 10) {
      await this.respectRateLimit();

      const query = `{
        products(search: "${search}", pageSize: ${pageSize}, currentPage: ${page}) {
          items {
            name
            sku
            url_key
            price_range {
              minimum_price {
                regular_price { value currency }
                final_price { value currency }
                discount { amount_off percent_off }
              }
            }
            image { url }
            stock_status
          }
          total_count
        }
      }`;

      try {
        const response = await this.client.post(`${this.baseUrl}/graphql`, { query }, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Store': 'default',
          },
        });

        const data = response.data?.data?.products;
        if (!data?.items?.length) {
          hasMore = false;
          break;
        }

        for (const item of data.items) {
          const finalPrice = item.price_range?.minimum_price?.final_price?.value;
          const regularPrice = item.price_range?.minimum_price?.regular_price?.value;
          const currency = item.price_range?.minimum_price?.final_price?.currency || 'USD';

          if (!item.name || !finalPrice || finalPrice <= 0) continue;

          const productUrl = `${this.baseUrl}/${item.url_key}`;
          const type = this.detectSeedType(item.name) || defaultType;
          const seedCount = this.parseSeedCount(item.name) || 1;

          // Extract breeder from SKU (format: BREEDER-STRAIN-TYPE)
          const skuParts = (item.sku || '').split('-');
          const breederCode = skuParts[0] || '';

          products.push({
            name: item.name.replace(/\s*(Feminized|Autoflower|Regular)\s*Seeds?\s*/gi, '').trim(),
            breeder: breederCode || 'Seedsman',
            type,
            price: finalPrice,
            currency,
            originalPrice: regularPrice && regularPrice > finalPrice ? regularPrice : undefined,
            discount: item.price_range?.minimum_price?.discount?.percent_off || undefined,
            inStock: item.stock_status === 'IN_STOCK',
            packSize: `${seedCount} Seeds`,
            seedCount,
            url: productUrl,
            affiliateUrl: this.generateAffiliateUrl(productUrl),
            imageUrl: item.image?.url || undefined,
          });
        }

        hasMore = page * pageSize < data.total_count;
        page++;

      } catch (error: any) {
        logger.error(`[${this.seedbankName}] GraphQL Seite ${page}: ${error.message}`);
        hasMore = false;
      }
    }

    return products;
  }
}

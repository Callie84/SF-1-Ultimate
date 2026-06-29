// Price Service - Price Service
import { Seed, ISeed } from '../models/Seed.model';
import { Price, IPrice } from '../models/Price.model';
import { redis } from '../config/redis';
import { generateSlug } from '../utils/helpers';
import { logger } from '../utils/logger';
import { ScrapedProduct } from '../scrapers/base.scraper';
// Nicht-Seed-Produkte (Merch) erkennen und beim Import ueberspringen
const MERCH_RE = /\b(t[- ]?shirts?|stickers?|keychains?|lanyards?|hoodies?|sweatshirts?|beanies?|grinders?|organiplugs|mousepads?|posters?|filter papers?|rolling papers?|plant tags?)\b/i;

/**
 * Parst THC/CBD-Werte aus Strings wie "20%", "16-24%", "Sehr hoch (über 20%)"
 * Gibt den Durchschnitt bei Bereichen zurück, sonst den ersten gefundenen Zahlenwert.
 */
function parsePercentage(value: unknown): number | undefined {
  if (typeof value === 'number') return isNaN(value) ? undefined : value;
  if (typeof value !== 'string') return undefined;
  const nums = value.match(/\d+(?:[.,]\d+)?/g);
  if (!nums || nums.length === 0) return undefined;
  const values = nums.map(n => parseFloat(n.replace(',', '.')));
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return isNaN(avg) ? undefined : Math.round(avg * 10) / 10;
}

export class PriceService {
  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Get list of inactive seedbank slugs from Redis
   */
  private async getInactiveSeedbanks(): Promise<string[]> {
    try {
      return await redis.sMembers('set:inactive:seedbanks');
    } catch {
      return [];
    }
  }
  
  /**
   * Save scraped products to database
   */
  async saveScrapedProducts(
    products: ScrapedProduct[],
    seedbankSlug: string,
    scraperId: string
  ): Promise<{ seeds: number; prices: number; pricesUpdated: number }> {
    let seedsCreated = 0;
    let pricesCreated = 0;
    let pricesUpdated = 0;
    let merchSkipped = 0;
    
    for (const product of products) {
      if (MERCH_RE.test(product.name || '')) { merchSkipped++; continue; }
      try {
        // Find or create seed
        const seedSlug = generateSlug(`${product.name}-${product.breeder || 'unknown'}`);
        
        let seed = await Seed.findOne({ slug: seedSlug });
        
        if (!seed) {
          seed = new Seed({
            name: product.name,
            slug: seedSlug,
            breeder: product.breeder || 'Unknown',
            type: product.type,
            genetics: product.genetics,
            thc: parsePercentage(product.thc),
            cbd: parsePercentage(product.cbd),
            floweringTime: product.floweringTime,
            imageUrl: product.imageUrl,
            viewCount: 0,
            priceCount: 0,
            source: ['crawl'],
            lastScraped: new Date()
          });

          await seed.save();
          seedsCreated++;
        } else {
          // Update seed data if missing
          if (!seed.thc && product.thc) seed.thc = parsePercentage(product.thc);
          if (!seed.cbd && product.cbd) seed.cbd = parsePercentage(product.cbd);
          if (!seed.floweringTime && product.floweringTime) seed.floweringTime = product.floweringTime;
          if (!seed.genetics && product.genetics) seed.genetics = product.genetics;
          if (!seed.imageUrl && product.imageUrl) seed.imageUrl = product.imageUrl;

          if (!seed.source?.includes('crawl')) {
            seed.source = [...(seed.source || []), 'crawl'];
          }
          seed.lastScraped = new Date();

          await seed.save();
        }
        
        // Create or update price
        const existingPrice = await Price.findOne({
          seedId: seed._id,
          seedbank: seedbankSlug,
          packSize: product.packSize
        });
        
        const validUntil = new Date();
        validUntil.setHours(validUntil.getHours() + 24);
        
        if (existingPrice) {
          // Update existing
          existingPrice.price = product.price;
          existingPrice.originalPrice = product.originalPrice;
          existingPrice.discount = product.discount;
          existingPrice.inStock = product.inStock;
          existingPrice.url = product.url;
          existingPrice.scrapedAt = new Date();
          existingPrice.validUntil = validUntil;
          
          await existingPrice.save();
          pricesUpdated++;
        } else {
          // Create new
          const newPrice = new Price({
            seedId: seed._id,
            seedSlug: seed.slug,
            seedbank: seedbankSlug,
            seedbankSlug,
            price: product.price,
            currency: product.currency,
            originalPrice: product.originalPrice,
            discount: product.discount,
            inStock: product.inStock,
            packSize: product.packSize,
            seedCount: product.seedCount,
            url: product.url,
            scrapedAt: new Date(),
            validUntil,
            scraperId,
            reliability: 1.0
          });
          
          await newPrice.save();
          pricesCreated++;
          
          // Update seed price count
          await Seed.updateOne(
            { _id: seed._id },
            { $inc: { priceCount: 1 } }
          );
        }
        
        // Update seed price stats
        await this.updateSeedPriceStats(seed._id.toString());
        
      } catch (error) {
        logger.error('[PriceService] Error saving product:', error);
      }
    }
    
    logger.info(`[PriceService] Saved ${seedsCreated} new seeds, ${pricesCreated} new prices, ${pricesUpdated} prices updated, ${merchSkipped} merch skipped`);

    return { seeds: seedsCreated, prices: pricesCreated, pricesUpdated };
  }
  
  /**
   * Update seed price statistics
   */
  private async updateSeedPriceStats(seedId: string): Promise<void> {
    const prices = await Price.find({
      seedId,
      inStock: true,
      validUntil: { $gt: new Date() }
    });
    
    if (prices.length === 0) return;
    
    const priceValues = prices.map(p => p.price);
    const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const lowestPrice = Math.min(...priceValues);
    
    await Seed.updateOne(
      { _id: seedId },
      {
        avgPrice: parseFloat(avgPrice.toFixed(2)),
        lowestPrice: parseFloat(lowestPrice.toFixed(2))
      }
    );
  }
  
  /**
   * Get today's prices (cached)
   */
  async getTodaysPrices(options: {
    limit?: number;
    skip?: number;
  } = {}): Promise<{ prices: IPrice[]; total: number }> {
    const limit = Math.min(options.limit || 100, 500);
    const skip = options.skip || 0;
    
    const cacheKey = `prices:today:${limit}:${skip}`;
    
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Query
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [prices, total] = await Promise.all([
      Price.find({
        scrapedAt: { $gte: today },
        inStock: true
      })
        .sort({ price: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Price.countDocuments({
        scrapedAt: { $gte: today },
        inStock: true
      })
    ]);
    
    const result = { prices: prices as unknown as IPrice[], total };

    // Cache
    await redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    return result;
  }
  
  /**
   * Get prices for specific seed
   */
  async getPricesForSeed(seedSlug: string): Promise<IPrice[]> {
    const inactiveSeedbanks = await this.getInactiveSeedbanks();
    const cacheKey = `prices:seed:${seedSlug}:${inactiveSeedbanks.sort().join(',')}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const priceQuery: any = {
      seedSlug,
      inStock: true,
      validUntil: { $gt: new Date() }
    };
    if (inactiveSeedbanks.length > 0) {
      priceQuery.seedbankSlug = { $nin: inactiveSeedbanks };
    }

    const prices = await Price.find(priceQuery)
      .sort({ price: 1 })
      .lean();

    await redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(prices));

    return prices as unknown as IPrice[];
  }
  
  /**
   * Compare prices across multiple seeds
   */
  async comparePrices(seedSlugs: string[]): Promise<any[]> {
    const comparisons = [];
    
    for (const slug of seedSlugs) {
      const seed = await Seed.findOne({ slug }).lean();
      if (!seed) continue;
      
      const prices = await this.getPricesForSeed(slug);
      
      comparisons.push({
        seed: {
          name: seed.name,
          slug: seed.slug,
          breeder: seed.breeder,
          type: seed.type
        },
        lowestPrice: seed.lowestPrice,
        avgPrice: seed.avgPrice,
        priceCount: prices.length,
        prices: prices.slice(0, 5) // Top 5 cheapest
      });
    }
    
    return comparisons;
  }
  
  /**
   * Get trending seeds (most viewed)
   */
  async getTrendingSeeds(limit: number = 20): Promise<ISeed[]> {
    const cacheKey = `seeds:trending:${limit}`;
    
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const seeds = await Seed.find({
      priceCount: { $gt: 0 }
    })
      .sort({ viewCount: -1 })
      .limit(limit)
      .lean();

    await redis.setEx(cacheKey, 600, JSON.stringify(seeds)); // 10 min cache

    return seeds as unknown as ISeed[];
  }
  
  /**
   * Search seeds with prices
   */
  async searchSeeds(query: string, options: {
    type?: string;
    breeder?: string;
    limit?: number;
    skip?: number;
  } = {}): Promise<{ seeds: any[]; total: number }> {
    const limit = Math.min(options.limit || 50, 200);
    const skip = options.skip || 0;

    // Deutsche Typ-Synonyme → englische DB-Werte
    const TYPE_SYNONYMS: Record<string, string> = {
      'feminisiert': 'feminized', 'feminized': 'feminized',
      'autoflower': 'autoflower', 'automatisch': 'autoflower', 'auto': 'autoflower',
      'regulär': 'regular', 'regular': 'regular',
      'indica': 'indica', 'sativa': 'sativa', 'hybrid': 'hybrid',
      'cbd': 'cbd',
    };
    const resolvedType = options.type ? (TYPE_SYNONYMS[options.type.toLowerCase()] ?? options.type) : undefined;

    const cacheKey = `search:${query}:${resolvedType || ''}:${options.breeder || ''}:${limit}:${skip}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Split query into words for better search
    // "PinkGorilla" → ["Pink", "Gorilla"] (heuristic split on capitals)
    // "pink gorilla" → ["pink", "gorilla"] (split on whitespace)
    let words: string[] = [];

    if (query.includes(' ')) {
      // Whitespace separated
      words = query.trim().split(/\s+/).filter(w => w.length > 0);
    } else {
      // Try to split camelCase/PascalCase
      words = query
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 0);
    }

    // Build search query: match if any word is found in name/breeder
    const wordRegexes = words.map(w => ({ $regex: w, $options: 'i' }));

    // Create OR array with word-based searches
    const searchOrConditions: any[] = [
      // Match any word in name OR breeder
      ...wordRegexes.map(w => ({ name: w })),
      ...wordRegexes.map(w => ({ breeder: w })),
      // Also try the original query as-is
      { name: { $regex: query, $options: 'i' } },
      { breeder: { $regex: query, $options: 'i' } }
    ];

    const searchQuery: any = {
      $or: searchOrConditions
    };

    if (resolvedType) searchQuery.type = resolvedType;
    if (options.breeder) searchQuery.breeder = options.breeder;

    const [seeds, total] = await Promise.all([
      Seed.find(searchQuery)
        .sort({ viewCount: -1, lowestPrice: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Seed.countDocuments(searchQuery)
    ]);

    // Alle Preise für diese Seeds in EINER Query laden (statt N+1)
    const inactiveSeedbanks = await this.getInactiveSeedbanks();
    const priceFilter: any = { seedId: { $in: seeds.map(s => s._id) } };
    if (inactiveSeedbanks.length > 0) {
      priceFilter.seedbankSlug = { $nin: inactiveSeedbanks };
    }
    const allPrices = await Price.find(priceFilter).sort({ price: 1 }).lean();

    // Preise per seedId gruppieren (in JS — keine weiteren DB-Queries)
    const pricesBySeedId: Record<string, typeof allPrices> = {};
    for (const p of allPrices) {
      const id = p.seedId.toString();
      if (!pricesBySeedId[id]) pricesBySeedId[id] = [];
      pricesBySeedId[id].push(p);
    }

    const enriched = seeds.map((seed) => ({
      ...seed,
      prices: (pricesBySeedId[seed._id.toString()] || []).map(p => ({
        seedbank: p.seedbank,
        seedbankSlug: p.seedbankSlug,
        price: p.price,
        currency: p.currency || 'EUR',
        seedCount: p.seedCount || 1,
        packSize: p.packSize,
        url: p.url,
        inStock: p.inStock ?? true,
      }))
    }));

    const result = { seeds: enriched, total };
    await redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(result));
    return result;
  }

  /**
   * Browse all seeds with prices (paginated)
   */
  async browseSeeds(options: {
    type?: string;
    breeder?: string;
    sort?: string;
    limit?: number;
    skip?: number;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  } = {}): Promise<{ seeds: any[]; total: number; breeders: string[] }> {
    const limit = Math.min(options.limit || 24, 100);
    const skip = options.skip || 0;

    const cacheKey = `browse:${options.type || ''}:${options.breeder || ''}:${options.sort || 'price'}:${limit}:${skip}:${options.minPrice || ''}:${options.maxPrice || ''}:${options.inStock ?? ''}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const query: any = { priceCount: { $gt: 0 }, lowestPrice: { $gt: 0 } };
    if (options.type) query.type = options.type;
    if (options.breeder) query.breeder = options.breeder;
    if (options.minPrice != null) query.lowestPrice = { ...query.lowestPrice, $gte: options.minPrice };
    if (options.maxPrice != null) query.lowestPrice = { ...query.lowestPrice, $lte: options.maxPrice };

    let sortObj: any = { lowestPrice: 1 };
    if (options.sort === 'price_desc') sortObj = { lowestPrice: -1 };
    else if (options.sort === 'name') sortObj = { name: 1 };
    else if (options.sort === 'popular') sortObj = { viewCount: -1 };

    // Breeders-Liste separat mit langem Cache (ändert sich selten)
    const breedersCacheKey = 'browse:breeders';
    let breeders: string[];
    const cachedBreeders = await redis.get(breedersCacheKey);
    if (cachedBreeders) {
      breeders = JSON.parse(cachedBreeders);
    } else {
      const breedersAgg = await Seed.aggregate([
        { $match: { priceCount: { $gt: 0 } } },
        { $group: { _id: '$breeder', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      breeders = breedersAgg.map((b: any) => b._id);
      await redis.setEx(breedersCacheKey, 3600, JSON.stringify(breeders)); // 1h
    }

    const [seeds, total] = await Promise.all([
      Seed.find(query).sort(sortObj).skip(skip).limit(limit).lean(),
      Seed.countDocuments(query),
    ]);

    // Alle Preise für diese Seeds in EINER Query laden (statt N+1)
    const inactiveSeedbanks = await this.getInactiveSeedbanks();
    const priceFilter: any = { seedId: { $in: seeds.map(s => s._id) } };
    if (options.inStock) priceFilter.inStock = true;
    if (inactiveSeedbanks.length > 0) {
      priceFilter.seedbankSlug = { $nin: inactiveSeedbanks };
    }
    const allPrices = await Price.find(priceFilter).sort({ price: 1 }).lean();

    // Preise per seedId gruppieren (in JS — keine weiteren DB-Queries)
    const pricesBySeedId: Record<string, typeof allPrices> = {};
    for (const p of allPrices) {
      const id = p.seedId.toString();
      if (!pricesBySeedId[id]) pricesBySeedId[id] = [];
      pricesBySeedId[id].push(p);
    }

    const enriched = seeds.map((seed) => ({
      ...seed,
      prices: (pricesBySeedId[seed._id.toString()] || []).slice(0, 5).map(p => ({
        seedbank: p.seedbank,
        seedbankSlug: p.seedbankSlug,
        price: p.price,
        currency: p.currency || 'EUR',
        seedCount: p.seedCount || 1,
        packSize: p.packSize,
        url: p.url,
        inStock: p.inStock ?? true,
      }))
    }));

    const result = { seeds: enriched, total, breeders };
    await redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(result));
    return result;
  }
  
  /**
   * Increment view count
   */
  async incrementViewCount(seedSlug: string): Promise<void> {
    await Seed.updateOne(
      { slug: seedSlug },
      { $inc: { viewCount: 1 } }
    );
  }
  
  /**
   * Clean expired prices
   */
  async cleanExpiredPrices(): Promise<number> {
    const result = await Price.deleteMany({
      validUntil: { $lt: new Date() }
    });
    
    logger.info(`[PriceService] Cleaned ${result.deletedCount} expired prices`);
    
    return result.deletedCount;
  }
}

export const priceService = new PriceService();

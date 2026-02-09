// Price Service - Price Service
import { Seed, ISeed } from '../models/Seed.model';
import { Price, IPrice } from '../models/Price.model';
import { redis } from '../config/redis';
import { generateSlug } from '../utils/helpers';
import { logger } from '../utils/logger';
import { ScrapedProduct } from '../scrapers/base.scraper';

export class PriceService {
  private readonly CACHE_TTL = 300; // 5 minutes
  
  /**
   * Save scraped products to database
   */
  async saveScrapedProducts(
    products: ScrapedProduct[],
    seedbankSlug: string,
    scraperId: string
  ): Promise<{ seeds: number; prices: number }> {
    let seedsCreated = 0;
    let pricesCreated = 0;
    
    for (const product of products) {
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
            thc: product.thc,
            cbd: product.cbd,
            floweringTime: product.floweringTime,
            imageUrl: product.imageUrl,
            viewCount: 0,
            priceCount: 0
          });
          
          await seed.save();
          seedsCreated++;
        } else {
          // Update seed data if missing
          if (!seed.thc && product.thc) seed.thc = product.thc;
          if (!seed.cbd && product.cbd) seed.cbd = product.cbd;
          if (!seed.floweringTime && product.floweringTime) seed.floweringTime = product.floweringTime;
          if (!seed.genetics && product.genetics) seed.genetics = product.genetics;
          if (!seed.imageUrl && product.imageUrl) seed.imageUrl = product.imageUrl;
          
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
    
    logger.info(`[PriceService] Saved ${seedsCreated} seeds, ${pricesCreated} new prices`);
    
    return { seeds: seedsCreated, prices: pricesCreated };
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
    
    const result = { prices, total };
    
    // Cache
    await redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(result));
    
    return result;
  }
  
  /**
   * Get prices for specific seed
   */
  async getPricesForSeed(seedSlug: string): Promise<IPrice[]> {
    const cacheKey = `prices:seed:${seedSlug}`;
    
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const prices = await Price.find({
      seedSlug,
      inStock: true,
      validUntil: { $gt: new Date() }
    })
      .sort({ price: 1 })
      .lean();
    
    await redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(prices));
    
    return prices;
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
    
    return seeds;
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

    const searchQuery: any = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { breeder: { $regex: query, $options: 'i' } }
      ]
    };

    if (options.type) {
      searchQuery.type = options.type;
    }
    if (options.breeder) {
      searchQuery.breeder = options.breeder;
    }

    const [seeds, total] = await Promise.all([
      Seed.find(searchQuery)
        .sort({ viewCount: -1, lowestPrice: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Seed.countDocuments(searchQuery)
    ]);

    // Enrich seeds with their prices
    const enriched = await Promise.all(seeds.map(async (seed) => {
      const prices = await Price.find({ seedId: seed._id })
        .sort({ price: 1 })
        .lean();

      return {
        ...seed,
        prices: prices.map(p => ({
          seedbank: p.seedbank,
          seedbankSlug: p.seedbankSlug,
          price: p.price,
          currency: p.currency || 'EUR',
          seedCount: p.seedCount || 1,
          packSize: p.packSize,
          url: p.url,
          inStock: p.inStock ?? true,
        }))
      };
    }));

    return { seeds: enriched, total };
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
  } = {}): Promise<{ seeds: any[]; total: number; breeders: string[] }> {
    const limit = Math.min(options.limit || 24, 100);
    const skip = options.skip || 0;

    const query: any = { priceCount: { $gt: 0 } };
    if (options.type) query.type = options.type;
    if (options.breeder) query.breeder = options.breeder;

    let sortObj: any = { lowestPrice: 1 };
    if (options.sort === 'price_desc') sortObj = { lowestPrice: -1 };
    else if (options.sort === 'name') sortObj = { name: 1 };
    else if (options.sort === 'popular') sortObj = { viewCount: -1 };

    const [seeds, total, breedersAgg] = await Promise.all([
      Seed.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      Seed.countDocuments(query),
      Seed.aggregate([
        { $match: { priceCount: { $gt: 0 } } },
        { $group: { _id: '$breeder', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    // Enrich with best price
    const enriched = await Promise.all(seeds.map(async (seed) => {
      const prices = await Price.find({ seedId: seed._id })
        .sort({ price: 1 })
        .limit(5)
        .lean();

      return {
        ...seed,
        prices: prices.map(p => ({
          seedbank: p.seedbank,
          seedbankSlug: p.seedbankSlug,
          price: p.price,
          currency: p.currency || 'EUR',
          seedCount: p.seedCount || 1,
          packSize: p.packSize,
          url: p.url,
          inStock: p.inStock ?? true,
        }))
      };
    }));

    const breeders = breedersAgg.map((b: any) => b._id);

    return { seeds: enriched, total, breeders };
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

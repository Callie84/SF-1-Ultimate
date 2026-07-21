// Price Service - Price Service
import { Seed, ISeed } from '../models/Seed.model';
import { Price, IPrice } from '../models/Price.model';
import { redis } from '../config/redis';
import { generateSlug } from '../utils/helpers';
import { logger } from '../utils/logger';
import { ScrapedProduct } from '../scrapers/base.scraper';
// Nicht-Seed-Produkte (Merch) erkennen und beim Import ueberspringen
const MERCH_RE = /\b(t[- ]?shirts?|stickers?|keychains?|lanyards?|hoodies?|sweatshirts?|beanies?|grinders?|organiplugs|mousepads?|posters?|filter papers?|rolling papers?|plant tags?)\b/i;

// Tokens, die keine Strain-Identität tragen (Seed-Typ, Verpackung, Füllwörter) —
// beim Namens-Matching ignorieren, sonst matchen "… Auto" / "… Feminized" quer.
const MATCH_NOISE = new Set([
  'auto', 'autos', 'autoflower', 'autoflowering', 'automatic', 'automatik',
  'feminized', 'feminised', 'feminisiert', 'fem', 'fems',
  'regular', 'reg', 'regulär',
  'seeds', 'seed', 'samen', 'fast', 'fastflowering', 'fastversion',
  'the', 'of', 'and', 'und',
]);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Zerlegt einen Strain-/Seed-Namen in bedeutungstragende Match-Tokens:
 * camelCase auftrennen, klein, an Nicht-Alphanumerik splitten, Rausch-Tokens
 * (Seed-Typ/Verpackung) und zu kurze Tokens (<2) entfernen.
 * "PinkGorilla Auto" → ["pink", "gorilla"]; "Gorilla Glue #4" → ["gorilla", "glue"].
 */
function matchTokens(name: string): string[] {
  return (name || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !MATCH_NOISE.has(t));
}

// Alias-Layer: bekannte Strain-Abkürzungen ↔ Vollnamen. Jede Gruppe listet
// äquivalente Schreibweisen. Bidirektional — "GSC" findet "Girl Scout Cookies"-
// Seeds und umgekehrt. Bewusst kuratiert (nur eindeutige Abkürzungen), damit der
// Recall steigt, ohne die Precision des AND-Token-Matchings zu opfern.
const ALIAS_GROUPS: string[][] = [
  ['gsc', 'girl scout cookies'],
  // 'gg' bewusst NICHT als Alias-Mitglied: der 2-Zeichen-Token matcht querbeet
  // (z. B. "GG-48") → Präzisions-Leak. 'gg4'/'gorilla glue'/'original glue' reichen.
  ['gg4', 'gorilla glue', 'gorilla glue #4', 'original glue'],
  ['gdp', 'granddaddy purple', 'grand daddy purple', 'grandaddy purple'],
  ['ssh', 'super silver haze'],
  ['c99', 'cinderella 99'],
  ['gmo', 'garlic cookies'],
  ['chemdawg', 'chemdog'],
  ['zkittlez', 'skittlez', 'skittles'],
  ['dosidos', 'do si dos'],
];

// Vorberechnet: normalisierte Token je Gruppenmitglied (Key = join, Tokens = Array).
const ALIAS_NORM: { key: string; tokens: string[] }[][] = ALIAS_GROUPS.map((group) =>
  group
    .map((form) => ({ key: matchTokens(form).join(' '), tokens: matchTokens(form) }))
    .filter((m) => m.key.length > 0),
);

/**
 * Liefert zum Suchbegriff alternative Token-Sets aus dem Alias-Layer.
 * Trigger NUR bei EXAKTER Normalisierungs-Gleichheit zu einem Alias-Mitglied
 * (kein Teil-Overlap) → keine Precision-Regression. "GSC" → [["girl","scout",
 * "cookies"]]; "Girl Scout Cookies" → [["gsc"]]; ohne Alias-Treffer → [].
 */
function aliasTokenSets(query: string): string[][] {
  const qKey = matchTokens(query).join(' ');
  if (!qKey) return [];
  const out: string[][] = [];
  for (const group of ALIAS_NORM) {
    if (group.some((m) => m.key === qKey)) {
      for (const m of group) {
        if (m.key !== qKey) out.push(m.tokens);
      }
    }
  }
  return out;
}

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

    // Präzises Matching: ALLE bedeutungstragenden Tokens eines Token-Sets müssen
    // als ganzes Wort im Seed vorkommen (name ODER breeder). Das frühere Wort-OR
    // matchte schon bei EINEM gemeinsamen Wort → "Blue Dream" traf jeden Seed mit
    // "Blue" (Blueberry …) oder "Dream". AND + Wortgrenzen liefert den richtigen Seed.
    //
    // Token-Sets = der Begriff selbst + evtl. Alias-Alternativen (GSC ↔ Girl Scout
    // Cookies). Ein Seed passt, wenn er MINDESTENS EIN Set vollständig erfüllt ($or).
    const tokens = matchTokens(query);
    const tokenSets = [tokens, ...aliasTokenSets(query)].filter((ts) => ts.length > 0);

    const buildTokenAnd = (ts: string[]) => ({
      $and: ts.map((t) => {
        const rx = { $regex: `\\b${escapeRegex(t)}\\b`, $options: 'i' };
        return { $or: [{ name: rx }, { breeder: rx }] };
      }),
    });

    const searchQuery: any =
      tokenSets.length === 0
        ? // Fallback: nichts Bedeutungstragendes übrig (z. B. nur Rausch-Tokens) →
          // wenigstens den Rohbegriff als Teilstring versuchen.
          { name: { $regex: escapeRegex(query.trim()), $options: 'i' } }
        : tokenSets.length === 1
        ? buildTokenAnd(tokenSets[0])
        : { $or: tokenSets.map(buildTokenAnd) };

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

// Price Service - Zamnesia Scraper
import { BaseScraper, ScrapedProduct } from '../base.scraper';
import { normalizePrice, parsePackSize } from '../../utils/helpers';
import { logger } from '../../utils/logger';

export class ZamnesiaScraper extends BaseScraper {
  protected baseUrl = 'https://www.zamnesia.com';
  protected seedbankName = 'Zamnesia';
  protected seedbankSlug = 'zamnesia';
  
  /**
   * Get all product URLs from category pages
   */
  async getProductUrls(): Promise<string[]> {
    const urls: string[] = [];
    const categoryUrls = [
      '/de/cannabis-samen/feminisiert',
      '/de/cannabis-samen/autoflowering',
      '/de/cannabis-samen/regular'
    ];
    
    for (const categoryUrl of categoryUrls) {
      const allowed = await this.checkRobots(categoryUrl);
      if (!allowed) {
        logger.warn(`[${this.seedbankName}] Skipping ${categoryUrl} (robots.txt)`);
        continue;
      }
      
      try {
        await this.respectRateLimit();
        
        const page = await this.createPage();
        await this.navigateWithRetry(page, `${this.baseUrl}${categoryUrl}`);
        
        // Check for CAPTCHA
        if (await this.detectCaptcha(page)) {
          await page.close();
          throw new Error('CAPTCHA detected');
        }
        
        // Extract product links
        const links = await page.$$eval(
          '.product-card a[href*="/cannabis-samen/"]',
          (elements) => elements.map(el => (el as any).href)
        );
        
        urls.push(...links);
        
        await page.close();
        
        logger.info(`[${this.seedbankName}] Found ${links.length} products in ${categoryUrl}`);
        
      } catch (error) {
        logger.error(`[${this.seedbankName}] Error scraping category ${categoryUrl}:`, error);
      }
    }
    
    return [...new Set(urls)]; // Remove duplicates
  }
  
  /**
   * Scrape single product page
   */
  async scrapeProduct(url: string): Promise<ScrapedProduct | null> {
    try {
      await this.respectRateLimit();
      
      const page = await this.createPage();
      await this.navigateWithRetry(page, url);
      
      if (await this.detectCaptcha(page)) {
        await page.close();
        return null;
      }
      
      // Extract product name
      const name = await this.extractText(page, 'h1.product-title');
      if (!name) {
        logger.warn(`[${this.seedbankName}] No product name found at ${url}`);
        await page.close();
        return null;
      }
      
      // Extract breeder
      const breeder = await this.extractText(page, '.product-breeder', 'Unknown');
      
      // Determine type from URL or breadcrumbs
      let type: 'feminized' | 'autoflower' | 'regular' = 'feminized';
      if (url.includes('autoflowering') || name.toLowerCase().includes('auto')) {
        type = 'autoflower';
      } else if (url.includes('regular')) {
        type = 'regular';
      }
      
      // Extract price
      const priceText = await this.extractText(page, '.product-price .price-current');
      const price = normalizePrice(priceText);
      
      if (!price) {
        logger.warn(`[${this.seedbankName}] No valid price found at ${url}`);
        await page.close();
        return null;
      }
      
      // Check stock
      const addToCartBtn = await page.$('button.add-to-cart:not([disabled])');
      const inStock = addToCartBtn !== null;
      
      // Extract pack size
      const packSizeText = await this.extractText(page, '.product-pack-size', '3 Seeds');
      const { packSize, seedCount } = parsePackSize(packSizeText);
      
      // Extract optional data
      const thcText = await this.extractText(page, '.spec-thc');
      const thc = thcText ? parseFloat(thcText.replace('%', '')) : undefined;
      
      const cbdText = await this.extractText(page, '.spec-cbd');
      const cbd = cbdText ? parseFloat(cbdText.replace('%', '')) : undefined;
      
      const floweringText = await this.extractText(page, '.spec-flowering');
      const floweringTime = floweringText ? parseInt(floweringText.replace(/\D/g, '')) : undefined;
      
      const genetics = await this.extractText(page, '.product-genetics');
      
      const imageUrl = await this.extractAttribute(page, '.product-image img', 'src');
      
      await page.close();
      
      const product: ScrapedProduct = {
        name,
        breeder,
        type,
        price,
        currency: 'EUR',
        inStock,
        packSize,
        seedCount,
        url,
        thc,
        cbd,
        floweringTime,
        genetics: genetics || undefined,
        imageUrl: imageUrl || undefined
      };
      
      logger.info(`[${this.seedbankName}] Scraped: ${name} - €${price}`);
      
      return product;
      
    } catch (error) {
      logger.error(`[${this.seedbankName}] Error scraping product ${url}:`, error);
      return null;
    }
  }
  
  /**
   * Scrape all products
   */
  async scrapeAll(): Promise<ScrapedProduct[]> {
    const products: ScrapedProduct[] = [];
    
    try {
      await this.initialize();
      
      const urls = await this.getProductUrls();
      logger.info(`[${this.seedbankName}] Starting to scrape ${urls.length} products`);
      
      for (const url of urls) {
        const product = await this.scrapeProduct(url);
        if (product) {
          products.push(product);
        }
        
        // Progress logging every 10 products
        if (products.length % 10 === 0) {
          logger.info(`[${this.seedbankName}] Progress: ${products.length}/${urls.length}`);
        }
      }
      
      logger.info(`[${this.seedbankName}] Scraping complete: ${products.length} products`);
      
    } catch (error) {
      logger.error(`[${this.seedbankName}] Fatal error during scraping:`, error);
    } finally {
      await this.cleanup();
    }
    
    return products;
  }
}

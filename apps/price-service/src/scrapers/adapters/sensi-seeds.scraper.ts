// Price Service - Sensi Seeds Scraper
import { BaseScraper, ScrapedProduct } from '../base.scraper';
import { normalizePrice, parsePackSize } from '../../utils/helpers';
import { logger } from '../../utils/logger';

export class SensiSeedsScraper extends BaseScraper {
  protected baseUrl = 'https://sensiseeds.com';
  protected seedbankName = 'Sensi Seeds';
  protected seedbankSlug = 'sensi-seeds';
  
  async getProductUrls(): Promise<string[]> {
    const urls: string[] = [];
    const categoryUrls = [
      '/de/hanfsamen/feminisiert',
      '/de/hanfsamen/autoflowering',
      '/de/hanfsamen/regular'
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
        
        if (await this.detectCaptcha(page)) {
          await page.close();
          throw new Error('CAPTCHA detected');
        }
        
        // Sensi Seeds grid layout
        const links = await page.$$eval(
          '.product-item-link',
          (elements) => elements.map(el => (el as any).href)
        );
        
        urls.push(...links);
        await page.close();
        
        logger.info(`[${this.seedbankName}] Found ${links.length} products in ${categoryUrl}`);
        
      } catch (error) {
        logger.error(`[${this.seedbankName}] Error scraping category ${categoryUrl}:`, error);
      }
    }
    
    return [...new Set(urls)];
  }
  
  async scrapeProduct(url: string): Promise<ScrapedProduct | null> {
    try {
      await this.respectRateLimit();
      
      const page = await this.createPage();
      await this.navigateWithRetry(page, url);
      
      if (await this.detectCaptcha(page)) {
        await page.close();
        return null;
      }
      
      // Product name
      const name = await this.extractText(page, '.page-title');
      if (!name) {
        await page.close();
        return null;
      }
      
      // Type
      let type: 'feminized' | 'autoflower' | 'regular' = 'feminized';
      if (url.includes('autoflowering') || name.toLowerCase().includes('auto')) {
        type = 'autoflower';
      } else if (url.includes('regular')) {
        type = 'regular';
      }
      
      // Price
      const priceText = await this.extractText(page, '.price-wrapper .price');
      const price = normalizePrice(priceText);
      
      if (!price) {
        await page.close();
        return null;
      }
      
      // Stock
      const stockText = await this.extractText(page, '.stock');
      const inStock = !stockText.toLowerCase().includes('ausverkauft') && 
                      !stockText.toLowerCase().includes('out of stock');
      
      // Pack size
      const packSizeText = await this.extractText(page, '.product-option-label', '5 Seeds');
      const { packSize, seedCount } = parsePackSize(packSizeText);
      
      // Details
      const thcText = await this.extractText(page, '[data-label="THC"]');
      const thc = thcText ? parseFloat(thcText.replace(/[^\d.]/g, '')) : undefined;
      
      const cbdText = await this.extractText(page, '[data-label="CBD"]');
      const cbd = cbdText ? parseFloat(cbdText.replace(/[^\d.]/g, '')) : undefined;
      
      const floweringText = await this.extractText(page, '[data-label="Flowering"]');
      const floweringTime = floweringText ? parseInt(floweringText.replace(/\D/g, '')) : undefined;
      
      const genetics = await this.extractText(page, '.product-genetics');
      
      const imageUrl = await this.extractAttribute(page, '.gallery-placeholder img', 'src');
      
      await page.close();
      
      const product: ScrapedProduct = {
        name,
        breeder: 'Sensi Seeds',
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

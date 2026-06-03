// Price Service - Royal Queen Seeds Scraper
import { BaseScraper, ScrapedProduct } from '../base.scraper';
import { normalizePrice, parsePackSize } from '../../utils/helpers';
import { logger } from '../../utils/logger';

export class RQSScraper extends BaseScraper {
  protected baseUrl = 'https://www.royalqueenseeds.de';
  protected seedbankName = 'Royal Queen Seeds';
  protected seedbankSlug = 'rqs';
  
  async getProductUrls(): Promise<string[]> {
    const urls: string[] = [];
    const categoryUrls = [
      '/feminisierte-hanfsamen',
      '/autoflowering-hanfsamen'
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
        
        // RQS uses different selector structure
        const links = await page.$$eval(
          '.product-item a.product-link',
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
      const name = await this.extractText(page, 'h1.product-name');
      if (!name) {
        await page.close();
        return null;
      }
      
      // Type determination
      let type: 'feminized' | 'autoflower' | 'regular' = 'feminized';
      if (url.includes('autoflowering') || name.toLowerCase().includes('automatic')) {
        type = 'autoflower';
      }
      
      // Price
      const priceText = await this.extractText(page, '.price-box .price');
      const price = normalizePrice(priceText);
      
      if (!price) {
        await page.close();
        return null;
      }
      
      // Stock
      const stockElement = await page.$('.stock.available');
      const inStock = stockElement !== null;
      
      // Pack options (RQS has dropdown)
      const packSizeText = await this.extractText(page, '.product-options select option[selected]', '3 Samen');
      const { packSize, seedCount } = parsePackSize(packSizeText);
      
      // THC/CBD
      const thcText = await this.extractText(page, '.thc-content');
      const thc = thcText ? parseFloat(thcText.replace(/[^\d.]/g, '')) : undefined;
      
      const cbdText = await this.extractText(page, '.cbd-content');
      const cbd = cbdText ? parseFloat(cbdText.replace(/[^\d.]/g, '')) : undefined;
      
      // Flowering time
      const floweringText = await this.extractText(page, '.flowering-time');
      const floweringTime = floweringText ? parseInt(floweringText.replace(/\D/g, '')) : undefined;
      
      // Genetics
      const genetics = await this.extractText(page, '.genetics-info');
      
      // Image
      const imageUrl = await this.extractAttribute(page, '.product-image-main img', 'src');
      
      await page.close();
      
      const product: ScrapedProduct = {
        name,
        breeder: 'Royal Queen Seeds',
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

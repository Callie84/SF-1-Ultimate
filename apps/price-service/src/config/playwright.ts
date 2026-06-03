// Price Service - Playwright Configuration
import { chromium, Browser, BrowserContext } from 'playwright';
import { logger } from '../utils/logger';

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    logger.info('[Playwright] Browser launched');
  }
  
  return browser;
}

export async function createStealthContext(): Promise<BrowserContext> {
  const browserInstance = await getBrowser();
  
  const context = await browserInstance.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    extraHTTPHeaders: {
      'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  });
  
  // Anti-detection measures
  await context.addInitScript(() => {
    const g = globalThis as any;
    Object.defineProperty(g.navigator, 'webdriver', {
      get: () => false,
    });
    g.chrome = { runtime: {} };
    const originalQuery = g.navigator.permissions.query;
    g.navigator.permissions.query = (parameters: any) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: 'denied' } as any) :
        originalQuery(parameters)
    );
  });
  
  return context;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    logger.info('[Playwright] Browser closed');
  }
}

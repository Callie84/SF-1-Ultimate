// Price Service - Robots.txt Parser
import robotsParser from 'robots-parser';
import axios from 'axios';
import { logger } from './logger';

const robotsCache = new Map<string, ReturnType<typeof robotsParser>>();

export async function canScrape(baseUrl: string, path: string): Promise<boolean> {
  try {
    const domain = new URL(baseUrl).hostname;
    
    // Check cache
    if (robotsCache.has(domain)) {
      const robots = robotsCache.get(domain)!;
      return robots.isAllowed(path, 'SF1-PriceBot') !== false;
    }
    
    // Fetch robots.txt
    const robotsUrl = `${baseUrl}/robots.txt`;
    const response = await axios.get(robotsUrl, {
      timeout: 5000,
      validateStatus: (status) => status === 200 || status === 404
    });
    
    let robotsTxt = '';
    if (response.status === 200) {
      robotsTxt = response.data;
    }
    
    // Parse
    const robots = robotsParser(robotsUrl, robotsTxt);
    robotsCache.set(domain, robots);
    
    const allowed = robots.isAllowed(path, 'SF1-PriceBot');
    
    if (!allowed) {
      logger.warn(`[Robots] Scraping not allowed: ${baseUrl}${path}`);
    }
    
    return allowed !== false;
    
  } catch (error) {
    logger.error('[Robots] Error checking robots.txt:', error);
    // Bei Fehler: Conservative approach - erlauben
    return true;
  }
}

export function clearRobotsCache(): void {
  robotsCache.clear();
  logger.info('[Robots] Cache cleared');
}

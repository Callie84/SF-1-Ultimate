// Firecrawl Service — JavaScript Rendering Fallback
// Für Websites, die JavaScript-basiert sind und Cheerio nicht rendern kann

import { logger } from '../utils/logger';

interface FirecrawlResponse {
  success: boolean;
  html?: string;
  content?: string;
  error?: string;
}

export class FirecrawlService {
  private apiKey: string;
  private baseUrl: string = 'https://api.firecrawl.dev/v0';
  private enabled: boolean;

  constructor() {
    this.apiKey = process.env.FIRECRAWL_API_KEY || '';
    this.enabled = !!this.apiKey;

    if (this.enabled) {
      logger.info('[Firecrawl] Service aktiviert');
    } else {
      logger.warn('[Firecrawl] Service DEAKTIVIERT (FIRECRAWL_API_KEY nicht gesetzt)');
    }
  }

  /**
   * Scrape URL mit JavaScript-Rendering
   * Fallback für Cheerio-Fehler
   */
  async scrapeWithJsRendering(url: string): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      logger.debug(`[Firecrawl] Scraping mit JS-Rendering: ${url}`);

      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          formats: ['html'],
          waitFor: 1000, // MS zum Warten auf JS-Rendering
          timeout: 30000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error(`[Firecrawl] API Error (${response.status}): ${errorData}`);
        return null;
      }

      const data = await response.json() as FirecrawlResponse;

      if (!data.success) {
        logger.error(`[Firecrawl] Scraping fehlgeschlagen: ${data.error || 'Unbekannter Fehler'}`);
        logger.debug(`[Firecrawl] Response: ${JSON.stringify(data)}`);
        return null;
      }

      const html = data.html || data.content;
      if (!html) {
        logger.warn(`[Firecrawl] Keine HTML erhalten (success=${data.success})`);
        logger.debug(`[Firecrawl] Response keys: ${Object.keys(data).join(', ')}`);
        return null;
      }

      logger.debug(`[Firecrawl] ✅ Erfolgreich: ${html.length} bytes`);
      return html;

    } catch (error: any) {
      logger.error(`[Firecrawl] Fehler: ${error.message}`);
      return null;
    }
  }

  /**
   * Prüfe, ob Firecrawl verfügbar ist
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Gesundheits-Check (Optional)
   */
  async healthCheck(): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const firecrawlService = new FirecrawlService();

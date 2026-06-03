// Price Service - Base Feed Importer
// Lightweight alternative to Playwright-based scrapers
// Uses axios + cheerio for HTML parsing (no browser needed)
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger';

export interface FeedProduct {
  name: string;
  breeder?: string;
  type: 'feminized' | 'autoflower' | 'regular';

  price: number;
  currency: string;
  originalPrice?: number;
  discount?: number;

  inStock: boolean;

  packSize: string;
  seedCount: number;

  url: string;
  affiliateUrl?: string;

  // Optional
  thc?: number;
  cbd?: number;
  floweringTime?: number;
  genetics?: string;
  imageUrl?: string;
}

export type FeedSource = 'csv' | 'xml' | 'json' | 'api' | 'html';

export abstract class BaseFeed {
  protected abstract seedbankName: string;
  protected abstract seedbankSlug: string;
  protected abstract baseUrl: string;
  protected abstract source: FeedSource;

  // Affiliate config
  protected affiliateId?: string;
  protected affiliateBaseUrl?: string;

  protected client: AxiosInstance;
  protected rateLimitMs: number = 1500;
  private lastRequestTime: number = 0;

  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      maxRedirects: 5,
    });
  }

  /**
   * Import all products from this feed source
   */
  abstract importAll(): Promise<FeedProduct[]>;

  /**
   * Generate affiliate link for a product URL
   */
  generateAffiliateUrl(_productUrl: string): string | undefined {
    if (!this.affiliateId || !this.affiliateBaseUrl) return undefined;
    return undefined;
  }

  /**
   * Respect rate limits between requests
   */
  protected async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.rateLimitMs) {
      const delay = this.rateLimitMs - elapsed;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Fetch HTML and parse with cheerio
   */
  protected async fetchHtml(url: string, config?: AxiosRequestConfig): Promise<cheerio.CheerioAPI> {
    await this.respectRateLimit();

    try {
      const response = await this.client.get(url, config);
      return cheerio.load(response.data);
    } catch (error: any) {
      logger.error(`[${this.seedbankName}] Failed to fetch ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch JSON data
   */
  protected async fetchJson<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    await this.respectRateLimit();

    try {
      const response = await this.client.get<T>(url, config);
      return response.data;
    } catch (error: any) {
      logger.error(`[${this.seedbankName}] Failed to fetch JSON ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch and parse CSV data
   */
  protected async fetchCsv(url: string): Promise<string[][]> {
    await this.respectRateLimit();

    try {
      const response = await this.client.get(url, { responseType: 'text' });
      const lines = response.data.split('\n');
      return lines.map((line: string) => {
        const fields: string[] = [];
        let current = '';
        let inQuotes = false;

        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if ((char === ',' || char === ';') && !inQuotes) {
            fields.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        fields.push(current.trim());
        return fields;
      });
    } catch (error: any) {
      logger.error(`[${this.seedbankName}] Failed to fetch CSV ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect seed type from name/URL
   */
  protected detectSeedType(text: string): 'feminized' | 'autoflower' | 'regular' {
    const lower = text.toLowerCase();
    if (lower.includes('auto') || lower.includes('automatic')) return 'autoflower';
    if (lower.includes('regular') || lower.includes('regulär')) return 'regular';
    return 'feminized';
  }

  /**
   * Parse price string to number
   */
  protected parsePrice(priceStr: string): number | null {
    const cleaned = priceStr
      .replace(/[€$£]/g, '')
      .replace(/,/g, '.')
      .replace(/\s/g, '')
      .trim();

    const price = parseFloat(cleaned);
    return isNaN(price) ? null : price;
  }

  /**
   * Parse seed count from pack size text
   */
  protected parseSeedCount(text: string): number {
    const match = text.match(/(\d+)\s*(seeds?|samen|stück|pcs?|x)/i);
    return match ? parseInt(match[1], 10) : 1;
  }

  /**
   * Get importer info
   */
  getInfo(): { name: string; slug: string; source: FeedSource } {
    return {
      name: this.seedbankName,
      slug: this.seedbankSlug,
      source: this.source
    };
  }
}

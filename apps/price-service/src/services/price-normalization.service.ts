// Price Normalization Service
// Decimal standardization & Currency conversion

export interface NormalizedPrice {
  price: number;
  currency: string;
  normalized: number; // In EUR equivalent (fallback)
  decimals: number;
}

export class PriceNormalizationService {
  // Exchange rates (cached, update daily via API)
  private static rates = {
    EUR: 1.0,
    USD: 0.92,
    CAD: 0.68,
    GBP: 1.16,
  };

  /**
   * Normalize price to max 2 decimals
   */
  static normalize(price: number, currency: string = 'EUR'): NormalizedPrice {
    const normalized = parseFloat(price.toFixed(2));
    const inEur = normalized * (this.rates[currency as keyof typeof this.rates] || 1.0);

    return {
      price: normalized,
      currency,
      normalized: parseFloat(inEur.toFixed(2)),
      decimals: 2,
    };
  }

  /**
   * Format for display
   */
  static format(price: number, currency: string = 'EUR'): string {
    const normalized = parseFloat(price.toFixed(2));
    return `${currency} ${normalized.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Compare prices across currencies
   */
  static compare(price1: number, currency1: string, price2: number, currency2: string): number {
    const norm1 = this.normalize(price1, currency1);
    const norm2 = this.normalize(price2, currency2);
    return norm1.normalized - norm2.normalized;
  }
}

// Price Service - Angebots-Sortierung (reine Logik, ohne DB/Redis)
// Ausgelagert aus price.service.ts, damit die Ranking-Regeln isoliert unit-testbar sind.
import { generateSlug } from '../utils/helpers';

/** Minimales Angebots-Shape, das für die Sortierung gebraucht wird. */
export interface SortableOffer {
  price: number;
  seedCount?: number | null;
  seedbank?: string;
  seedbankSlug?: string;
}

/**
 * Preis pro Samen — die faire Vergleichsbasis. Shops verkaufen unterschiedliche
 * Packungsgrößen; der absolute Packungspreis benachteiligt größere Packs und lässt
 * Kleinpackungs-Reseller (z. B. Linda Seeds) fälschlich als "günstigster Anbieter"
 * oben stehen. Fällt seedCount weg, wird 1 angenommen.
 */
export function pricePerSeed(p: SortableOffer): number {
  const count = p.seedCount && p.seedCount > 0 ? p.seedCount : 1;
  return p.price / count;
}

/**
 * Sortiert die Angebote EINES Seeds für die Anzeige:
 *   1. primär nach €/Samen aufsteigend (fairer Vergleich statt Packungspreis)
 *   2. bei knappem Gleichstand (≤5 % €/Samen-Differenz) den Hersteller-eigenen Shop
 *      bevorzugen — bei einem Royal-Queen-Seeds-Strain also RQS statt Reseller
 *   3. als letzter Tiebreaker der absolute Preis
 * Der Hersteller-Shop wird erkannt, indem der Breeder-Slug (generateSlug) mit dem
 * seedbankSlug des Angebots verglichen wird ("Royal Queen Seeds" → royal-queen-seeds).
 * Gibt eine neue, sortierte Kopie zurück (mutiert die Eingabe nicht).
 */
export function sortOffersForSeed<T extends SortableOffer>(prices: T[], breeder?: string): T[] {
  const ownSlug = breeder ? generateSlug(breeder) : '';
  const isOwnShop = (p: T) =>
    !!ownSlug &&
    (p.seedbankSlug === ownSlug || (p.seedbank ? generateSlug(p.seedbank) === ownSlug : false));

  return [...prices].sort((a, b) => {
    const ppsA = pricePerSeed(a);
    const ppsB = pricePerSeed(b);
    const tolerance = 0.05 * Math.min(ppsA, ppsB);

    if (Math.abs(ppsA - ppsB) <= tolerance) {
      const ownA = isOwnShop(a) ? 1 : 0;
      const ownB = isOwnShop(b) ? 1 : 0;
      if (ownA !== ownB) return ownB - ownA; // Hersteller-Shop zuerst
      return a.price - b.price;
    }
    return ppsA - ppsB;
  });
}

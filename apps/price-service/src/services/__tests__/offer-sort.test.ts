// Unit Tests für die Angebots-Sortierung (offer-sort)
// Deckt den gemeldeten Bug ab: Bei einem Royal-Queen-Seeds-Strain stand der
// Reseller "Linda Seeds" als bestes Angebot oben, weil nur der absolute
// Packungspreis verglichen wurde statt des Preises pro Samen.
import { pricePerSeed, sortOffersForSeed, SortableOffer } from '../offer-sort';

describe('pricePerSeed', () => {
  it('teilt den Preis durch die Samenanzahl', () => {
    expect(pricePerSeed({ price: 30, seedCount: 3 })).toBe(10);
  });

  it('nimmt 1 an, wenn seedCount fehlt / 0 / negativ ist', () => {
    expect(pricePerSeed({ price: 12 })).toBe(12);
    expect(pricePerSeed({ price: 12, seedCount: 0 })).toBe(12);
    expect(pricePerSeed({ price: 12, seedCount: -5 })).toBe(12);
    expect(pricePerSeed({ price: 12, seedCount: null })).toBe(12);
  });
});

describe('sortOffersForSeed', () => {
  const rqs: SortableOffer = { price: 30, seedCount: 3, seedbankSlug: 'royal-queen-seeds' }; // 10 €/Samen
  const linda: SortableOffer = { price: 12, seedCount: 1, seedbankSlug: 'linda-seeds' };      // 12 €/Samen

  it('Bug-Szenario: RQS (günstiger pro Samen) steht vor Linda (günstigere Kleinpackung)', () => {
    const sorted = sortOffersForSeed([linda, rqs], 'Royal Queen Seeds');
    expect(sorted[0].seedbankSlug).toBe('royal-queen-seeds');
    expect(sorted[1].seedbankSlug).toBe('linda-seeds');
  });

  it('sortiert primär nach €/Samen aufsteigend', () => {
    const offers: SortableOffer[] = [
      { price: 24, seedCount: 2, seedbankSlug: 'a' }, // 12
      { price: 40, seedCount: 5, seedbankSlug: 'b' }, // 8
      { price: 30, seedCount: 3, seedbankSlug: 'c' }, // 10
    ];
    const sorted = sortOffersForSeed(offers, 'Some Breeder');
    expect(sorted.map((o) => o.seedbankSlug)).toEqual(['b', 'c', 'a']);
  });

  it('bevorzugt bei ≤5 % €/Samen-Gleichstand den Hersteller-eigenen Shop', () => {
    const rqsTie: SortableOffer = { price: 30, seedCount: 3, seedbankSlug: 'royal-queen-seeds' }; // 10
    const lindaTie: SortableOffer = { price: 10, seedCount: 1, seedbankSlug: 'linda-seeds' };     // 10
    const sorted = sortOffersForSeed([lindaTie, rqsTie], 'Royal Queen Seeds');
    expect(sorted[0].seedbankSlug).toBe('royal-queen-seeds');
  });

  it('bevorzugt den Hersteller NICHT, wenn ein Reseller pro Samen klar günstiger ist', () => {
    const rqsExpensive: SortableOffer = { price: 30, seedCount: 3, seedbankSlug: 'royal-queen-seeds' }; // 10
    const lindaCheap: SortableOffer = { price: 6, seedCount: 1, seedbankSlug: 'linda-seeds' };          // 6
    const sorted = sortOffersForSeed([rqsExpensive, lindaCheap], 'Royal Queen Seeds');
    expect(sorted[0].seedbankSlug).toBe('linda-seeds');
  });

  it('erkennt den Hersteller-Shop auch über den seedbank-Namen (ohne slug)', () => {
    const rqsByName: SortableOffer = { price: 30, seedCount: 3, seedbank: 'Royal Queen Seeds' }; // 10
    const lindaByName: SortableOffer = { price: 10, seedCount: 1, seedbank: 'Linda Seeds' };     // 10
    const sorted = sortOffersForSeed([lindaByName, rqsByName], 'Royal Queen Seeds');
    expect(sorted[0].seedbank).toBe('Royal Queen Seeds');
  });

  it('nutzt den absoluten Preis als letzten Tiebreaker (gleiches €/Samen, kein Hersteller)', () => {
    const a: SortableOffer = { price: 20, seedCount: 2, seedbankSlug: 'a' }; // 10
    const b: SortableOffer = { price: 10, seedCount: 1, seedbankSlug: 'b' }; // 10
    const sorted = sortOffersForSeed([a, b], 'Unrelated Breeder');
    expect(sorted[0].seedbankSlug).toBe('b'); // günstigerer absoluter Preis zuerst
  });

  it('mutiert das Eingabe-Array nicht', () => {
    const input = [linda, rqs];
    const copy = [...input];
    sortOffersForSeed(input, 'Royal Queen Seeds');
    expect(input).toEqual(copy);
  });

  it('kommt mit leerer Liste und fehlendem Breeder klar', () => {
    expect(sortOffersForSeed([], undefined)).toEqual([]);
    const one: SortableOffer[] = [{ price: 10, seedCount: 1, seedbankSlug: 'x' }];
    expect(sortOffersForSeed(one)).toHaveLength(1);
  });
});

// Unit-Tests für die Europa-Whitelist der Breeder.
import { normalizeBreeder, isEuropeanBreeder } from '../european-breeders';

describe('normalizeBreeder', () => {
  it('ignoriert Groß-/Kleinschreibung, Leer- und Sonderzeichen', () => {
    expect(normalizeBreeder('Royal Queen Seeds')).toBe('royalqueenseeds');
    expect(normalizeBreeder('  royal-queen  seeds ')).toBe('royalqueenseeds');
    expect(normalizeBreeder("Barney's Farm")).toBe('barneysfarm');
  });

  it('kommt mit leer/undefined klar', () => {
    expect(normalizeBreeder('')).toBe('');
    expect(normalizeBreeder(undefined as any)).toBe('');
  });
});

describe('isEuropeanBreeder', () => {
  it('erkennt europäische Breeder (verschiedene Schreibweisen)', () => {
    expect(isEuropeanBreeder('Royal Queen Seeds')).toBe(true);
    expect(isEuropeanBreeder('royalqueenseeds')).toBe(true);
    expect(isEuropeanBreeder('Sensi Seeds')).toBe(true);
    expect(isEuropeanBreeder("Barney's Farm")).toBe(true);
    expect(isEuropeanBreeder('Barneys Farm')).toBe(true);
    expect(isEuropeanBreeder('Fast Buds')).toBe(true);
    expect(isEuropeanBreeder('FastBuds')).toBe(true);
  });

  it('blockt nicht-europäische Breeder', () => {
    expect(isEuropeanBreeder('Crop King Seeds')).toBe(false); // Kanada
    expect(isEuropeanBreeder('Humboldt Seed Company')).toBe(false); // USA
    expect(isEuropeanBreeder('Ethos Genetics')).toBe(false); // USA
  });

  it('unterscheidet ähnliche Namen (ES vs US)', () => {
    expect(isEuropeanBreeder('Humboldt Seed Organization')).toBe(true); // ES
    expect(isEuropeanBreeder('Humboldt Seed Company')).toBe(false); // US
  });

  it('behandelt leere/ungültige Werte als nicht-europäisch', () => {
    expect(isEuropeanBreeder('')).toBe(false);
    expect(isEuropeanBreeder(undefined as any)).toBe(false);
    expect(isEuropeanBreeder('Irgendein Unbekannter Züchter')).toBe(false);
  });
});

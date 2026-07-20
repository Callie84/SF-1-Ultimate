import type { Metadata } from 'next';
import { PricesListClient, type PricesBrowseResponse } from './prices-list-client';

const BASE_URL = 'https://seedfinderpro.de';
const PRICE_URL =
  process.env.PRICE_SERVICE_URL || 'http://sf1-price-service:3002';

export const metadata: Metadata = {
  // Root-Layout hängt via Template " | SeedFinderPro" an — hier NICHT wiederholen.
  title: 'Cannabis Samen Preisvergleich — Seeds aus vielen Seedbanks',
  description:
    'Vergleiche Cannabis-Samen-Preise aus vielen Seedbanks auf SeedFinderPro: bester Preis, Verfügbarkeit und Preisverlauf pro Strain — feminisiert, autoflower & regular.',
  alternates: { canonical: `${BASE_URL}/prices` },
  openGraph: {
    title: 'Cannabis Samen Preisvergleich | SeedFinderPro',
    description:
      'Bester Preis, Verfügbarkeit und Preisverlauf pro Strain — aus vielen Seedbanks.',
    url: `${BASE_URL}/prices`,
    type: 'website',
  },
};

async function fetchPricesPage(): Promise<PricesBrowseResponse | undefined> {
  try {
    // Erste Browse-Seite server-seitig holen — muss dem Default-Query der
    // Client-Component entsprechen (skip=0, limit=24, sort=price, ohne Filter).
    const res = await fetch(
      `${PRICE_URL}/api/prices/browse?limit=24&skip=0&sort=price`,
      { next: { revalidate: 3600 } }
    );
    return res.ok ? res.json() : undefined;
  } catch {
    return undefined;
  }
}

export default async function PricesPage() {
  const initialData = await fetchPricesPage();
  return <PricesListClient initialData={initialData} />;
}

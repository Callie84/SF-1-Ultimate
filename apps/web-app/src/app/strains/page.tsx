// /apps/web-app/src/app/strains/page.tsx
import type { Metadata } from 'next';
import { StrainsListClient } from './strains-list-client';
import type { StrainsResponse } from '@/hooks/use-strains';

const BASE_URL = 'https://seedfinderpro.de';
const COMMUNITY_URL =
  process.env.COMMUNITY_SERVICE_URL || 'http://sf1-community-service:3005';

export const metadata: Metadata = {
  // Root-Layout hängt via Template " | SeedFinderPro" an — hier NICHT wiederholen.
  title: 'Cannabis Strain-Datenbank — Sorten vergleichen',
  description:
    'Durchsuche die Cannabis-Strain-Datenbank auf SeedFinderPro: Indica, Sativa, Hybrid & Autoflower mit THC/CBD-Werten, Genetik, Effekten und Preisvergleich.',
  alternates: { canonical: `${BASE_URL}/strains` },
  openGraph: {
    title: 'Cannabis Strain-Datenbank | SeedFinderPro',
    description:
      'Indica, Sativa, Hybrid & Autoflower — THC/CBD, Genetik, Effekte und Preisvergleich.',
    url: `${BASE_URL}/strains`,
    type: 'website',
  },
};

async function fetchStrainsPage(): Promise<StrainsResponse | undefined> {
  try {
    // Erste Seite server-seitig holen — muss der Initial-Query der Client-
    // Component entsprechen (page=1, limit=20, ohne Suche/Typ).
    const res = await fetch(
      `${COMMUNITY_URL}/api/community/strains?page=1&limit=20`,
      { next: { revalidate: 3600 } }
    );
    return res.ok ? res.json() : undefined;
  } catch {
    return undefined;
  }
}

export default async function StrainsPage() {
  const initialStrains = await fetchStrainsPage();
  return <StrainsListClient initialStrains={initialStrains} />;
}

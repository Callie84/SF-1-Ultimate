import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cannabis Strain-Datenbank',
  description:
    'Durchsuche 180+ Cannabis Sorten — Indica, Sativa, Hybrid & Autoflower. THC/CBD-Werte, Genetik, Effekte und Preisvergleich auf SeedFinderPro.',
  keywords: [
    'cannabis strains',
    'strain datenbank',
    'indica sativa hybrid',
    'thc cbd werte',
    'cannabis sorten vergleich',
    'sorten kaufen',
  ],
  openGraph: {
    title: 'Cannabis Strain-Datenbank — SeedFinderPro',
    description:
      '180+ Cannabis Sorten mit THC/CBD-Werten, Genetik & Preisvergleich. Finde die perfekte Sorte für deinen Grow.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://seedfinderpro.de/strains',
  },
};

export default function StrainsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

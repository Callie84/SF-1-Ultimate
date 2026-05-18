import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export const metadata: Metadata = {
  title: 'Cannabis Samen Preisvergleich',
  description:
    'Vergleiche Cannabis Samen Preise aus 12+ Seedbanks. Feminisierte, Autoflower und reguläre Samen — immer den besten Preis finden.',
  keywords: [
    'cannabis samen kaufen',
    'samenbank preisvergleich',
    'feminisierte samen',
    'autoflower samen',
    'seeds günstig',
  ],
  openGraph: {
    title: 'Cannabis Samen Preisvergleich — SeedFinderPro',
    description: 'Bis zu 70% sparen: Preise aus 12+ Seedbanks vergleichen. Feminisiert, Autoflower, Regular.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://seedfinderpro.de/prices',
  },
};

export default function PricesLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}

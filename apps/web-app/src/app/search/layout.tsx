import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export const metadata: Metadata = {
  title: 'Suche',
  description:
    'Durchsuche Strains, Preise, Community-Beiträge und mehr auf SeedFinderPro.',
  alternates: {
    canonical: 'https://seedfinderpro.de/search',
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}

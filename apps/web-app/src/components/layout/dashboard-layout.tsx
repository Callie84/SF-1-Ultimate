'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { AdCarousel } from '@/components/ads/ad-carousel';
import { useAdZones } from '@/hooks/use-ad-zones';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: zonesData } = useAdZones();
  const zones = zonesData?.zones ?? [];

  const getZone = (id: string) => zones.find((z) => z.id === id && z.isActive);
  const contentTop = getZone('content-top');
  const contentBottom = getZone('content-bottom');

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header */}
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Rechteck-Banner oben (aus Zone-Config) */}
        {contentTop && (
          <div className="hidden sm:block px-4 sm:px-6 pt-3 pb-0 flex-shrink-0">
            <div
              style={{
                width: contentTop.width ? `${contentTop.width}px` : '100%',
                height: `${contentTop.height}px`,
              }}
            >
              <AdCarousel type={contentTop.adType} autoPlayInterval={7000} />
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6">
          {children}

          {/* Banner unten (aus Zone-Config) */}
          {contentBottom && (
            <div
              className="mt-6 hidden sm:block"
              style={{
                width: contentBottom.width ? `${contentBottom.width}px` : '100%',
                height: `${contentBottom.height}px`,
              }}
            >
              <AdCarousel type={contentBottom.adType} autoPlayInterval={7000} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

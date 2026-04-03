'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { AdCarousel } from '@/components/ads/ad-carousel';
import { useAdZones } from '@/hooks/use-ad-zones';
import { useAuth } from '@/components/providers/auth-provider';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import { AnnouncementModal } from '@/components/announcement-modal';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: zonesData } = useAdZones();
  const { user } = useAuth();

  // WebSocket Echtzeit-Notifications
  useRealtimeNotifications(user?.id);
  const zones = zonesData?.zones ?? [];
  const sidebarWidth = zonesData?.sidebarWidth ?? 256;

  const getZone = (id: string) => zones.find((z) => z.id === id && z.isActive);
  const contentTop = getZone('content-top');
  const contentBottom = getZone('content-bottom');

  return (
    <div className="flex h-screen overflow-hidden">
      <AnnouncementModal />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — dynamische Breite (0 = fit-content) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 lg:z-auto flex-shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={sidebarWidth > 0 ? { width: sidebarWidth } : { width: 'fit-content' }}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} sidebarWidth={sidebarWidth} />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header */}
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Rechteck-Banner oben (aus Zone-Config) */}
        {contentTop && (
          <div className="hidden sm:block px-4 sm:px-6 pt-3 pb-0 flex-shrink-0">
            {contentTop.slotCount === 3 ? (
              /* 3 gleichgroße Slots mit Trennern */
              <div
                className="flex gap-0 overflow-hidden rounded-lg"
                style={{ height: `${contentTop.height}px` }}
              >
                <div className="flex-1 min-w-0">
                  <AdCarousel type={contentTop.adType} autoPlayInterval={7000} />
                </div>
                <div className="w-px bg-border flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <AdCarousel type={contentTop.adType} autoPlayInterval={9000} />
                </div>
                <div className="w-px bg-border flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <AdCarousel type={contentTop.adType} autoPlayInterval={11000} />
                </div>
              </div>
            ) : (
              <div
                style={{
                  width: contentTop.width ? `${contentTop.width}px` : '100%',
                  height: `${contentTop.height}px`,
                }}
              >
                <AdCarousel type={contentTop.adType} autoPlayInterval={7000} />
              </div>
            )}
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

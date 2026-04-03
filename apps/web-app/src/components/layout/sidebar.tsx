'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/auth-provider';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Search,
  Brain,
  TrendingDown,
  Calculator,
  Settings,
  Award,
  Bell,
  Shield,
  MessageSquare,
  Leaf,
  CalendarDays,
  Trophy,
  Sprout,
} from 'lucide-react';
import { AdCarousel } from '@/components/ads/ad-carousel';
import { useAdZones } from '@/hooks/use-ad-zones';

const STORAGE_KEY = 'sf1_sidebar_bottom_height';
const DEFAULT_HEIGHT = 180;
const MIN_HEIGHT = 60;
const MAX_HEIGHT = 400;

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Mein Journal', href: '/journal', icon: BookOpen },
  { name: 'Öffentliche Grows', href: '/grows', icon: Sprout },
  { name: 'Community', href: '/community', icon: Users },
  { name: 'Nachrichten', href: '/messages', icon: MessageSquare },
  { name: 'Strains', href: '/strains', icon: Leaf },
  { name: 'Kalender', href: '/calendar', icon: CalendarDays },
  { name: 'Preisvergleich', href: '/prices', icon: TrendingDown },
  { name: 'Seedbanks', href: '/seedbanks', icon: Leaf },
  { name: 'Preisalarme', href: '/alerts', icon: Bell },
  { name: 'Suche', href: '/search', icon: Search },
  { name: 'AI Assistent', href: '/ai', icon: Brain },
  { name: 'Rechner', href: '/tools', icon: Calculator },
  { name: 'Bestenliste', href: '/leaderboard', icon: Trophy },
  { name: 'Profil', href: '/profile', icon: Award },
  { name: 'Einstellungen', href: '/settings', icon: Settings },
];

interface SidebarProps {
  onNavigate?: () => void;
  sidebarWidth?: number;
}

export function Sidebar({ onNavigate, sidebarWidth = 256 }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: zonesData } = useAdZones();
  const zones = zonesData?.zones ?? [];
  const getZone = (id: string) => zones.find((z) => z.id === id && z.isActive);
  const sidebarTop = getZone('sidebar-top');
  const sidebarBottom = getZone('sidebar-bottom');

  const [bottomHeight, setBottomHeight] = useState(DEFAULT_HEIGHT);
  const bottomHeightRef = useRef(DEFAULT_HEIGHT);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const h = parseInt(saved);
      if (!isNaN(h)) { setBottomHeight(h); bottomHeightRef.current = h; }
    }
  }, []);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = bottomHeightRef.current;

    const onMove = (ev: MouseEvent) => {
      // Maus nach oben → Bottom-Panel größer; nach unten → kleiner
      const newH = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startH + (startY - ev.clientY)));
      bottomHeightRef.current = newH;
      setBottomHeight(newH);
    };

    const onUp = () => {
      localStorage.setItem(STORAGE_KEY, String(bottomHeightRef.current));
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleClick = () => {
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col border-r bg-card overflow-hidden" style={sidebarWidth > 0 ? { width: sidebarWidth } : { width: 'fit-content', minWidth: 'max-content' }}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <div className="text-lg font-bold">SF-1</div>
          <div className="text-xs text-muted-foreground">Ultimate</div>
        </div>
      </div>

      {/* Sidebar-Top Werbezone */}
      {sidebarTop && (
        <div
          className="px-3 pt-2"
          style={{
            width: sidebarTop.width ? `${sidebarTop.width}px` : '100%',
            height: `${sidebarTop.height}px`,
          }}
        >
          <AdCarousel type={sidebarTop.adType} showControls={false} autoPlayInterval={6000} />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleClick}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}

          {/* Admin-Link — nur für Admins/Moderatoren sichtbar */}
          {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
            <Link
              href="/admin"
              onClick={handleClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname?.startsWith('/admin')
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Shield className="h-5 w-5" />
              Admin
            </Link>
          )}
        </div>
      </nav>

      {/* Drag Handle — nur anzeigen wenn Werbezone aktiv */}
      {sidebarBottom && (
        <>
          <div
            onMouseDown={handleDragStart}
            className="group relative flex h-2 cursor-ns-resize items-center justify-center border-t hover:border-primary/50"
            title="Ziehen zum Anpassen"
          >
            <div className="h-1 w-8 rounded-full bg-border group-hover:bg-primary/40 transition-colors" />
          </div>

          {/* Unterer Block: nur Werbefläche — Höhe per Drag steuerbar */}
          <div className="flex-shrink-0 overflow-hidden" style={{ height: bottomHeight }}>
            <div className="h-full px-3 py-2 overflow-hidden">
              <AdCarousel type={sidebarBottom.adType} showControls={false} autoPlayInterval={6000} />
            </div>
          </div>
        </>
      )}

      {/* Footer-Links — immer sichtbar */}
      <div className="border-t px-4 py-3 flex-shrink-0">
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
          <Link href="/impressum" className="text-xs text-muted-foreground hover:text-primary">Impressum</Link>
          <Link href="/privacy" className="text-xs text-muted-foreground hover:text-primary">Datenschutz</Link>
          <Link href="/terms" className="text-xs text-muted-foreground hover:text-primary">AGB</Link>
        </div>
      </div>
    </div>
  );
}

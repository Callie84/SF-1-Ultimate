'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: zonesData } = useAdZones();
  const zones = zonesData?.zones ?? [];
  const getZone = (id: string) => zones.find((z) => z.id === id && z.isActive);
  const sidebarTop = getZone('sidebar-top');
  const sidebarBottom = getZone('sidebar-bottom');

  const handleClick = () => {
    onNavigate?.();
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
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
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
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
      </nav>

      {/* Admin Section */}
      {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
        <div className="border-t p-4">
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
        </div>
      )}

      {/* Sidebar-Bottom Werbezone */}
      {sidebarBottom && (
        <div
          className="px-3 pb-2"
          style={{
            width: sidebarBottom.width ? `${sidebarBottom.width}px` : '100%',
            height: `${sidebarBottom.height}px`,
          }}
        >
          <AdCarousel type={sidebarBottom.adType} showControls={false} autoPlayInterval={6000} />
        </div>
      )}


      {/* Footer */}
      <div className="border-t p-4">
        <Link
          href="/settings"
          onClick={handleClick}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname === '/settings'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Settings className="h-5 w-5" />
          Einstellungen
        </Link>
      </div>
    </div>
  );
}

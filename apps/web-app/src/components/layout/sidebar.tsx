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
  Shield
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Mein Journal', href: '/journal', icon: BookOpen },
  { name: 'Community', href: '/community', icon: Users },
  { name: 'Preisvergleich', href: '/prices', icon: TrendingDown },
  { name: 'Suche', href: '/search', icon: Search },
  { name: 'AI Assistent', href: '/ai', icon: Brain },
  { name: 'Rechner', href: '/tools', icon: Calculator },
  { name: 'Profil', href: '/profile', icon: Award },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

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

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
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

      {/* Footer */}
      <div className="border-t p-4">
        <Link
          href="/settings"
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

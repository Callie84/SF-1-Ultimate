'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User, LogOut, Settings, Menu, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { SearchBar } from '@/components/search/search-bar';
import { NotificationDropdown } from '@/components/notifications/notification-dropdown';
import { MessageDropdown } from '@/components/messages/message-dropdown';
import { getInitials } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const THEME_OPTIONS = [
  { id: 'light',          label: 'Standard',        icon: '☀️' },
  { id: 'dark',           label: 'Dark Mode',        icon: '🌙' },
  { id: 'theme-nature',   label: 'Nature',           icon: '🌿' },
  { id: 'theme-midnight', label: 'Midnight Grower',  icon: '🔮' },
  { id: 'theme-earth',    label: 'Earth',            icon: '🌱' },
  { id: 'theme-neon',     label: 'Neon Grower',      icon: '⚡' },
];

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="flex h-14 sm:h-16 items-center justify-between border-b bg-card px-3 sm:px-6 gap-2 sm:gap-4">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden flex-shrink-0"
        onClick={onMenuToggle}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Menu</span>
      </Button>

      {/* Search Bar */}
      <div className="flex-1 max-w-2xl min-w-0">
        <SearchBar />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Theme Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex" title="Design wählen">
              <Palette className="h-5 w-5" />
              <span className="sr-only">Design wählen</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Design wählen</div>
            <DropdownMenuSeparator />
            {THEME_OPTIONS.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={theme === t.id ? 'bg-primary/10 font-semibold' : ''}
              >
                <span className="mr-2">{t.icon}</span>
                {t.label}
                {theme === t.id && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Messages */}
        {user && <MessageDropdown />}

        {/* Notifications */}
        {user && <NotificationDropdown />}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2 sm:px-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {user?.avatar ? (
                  <Image src={user.avatar} alt={user?.username ?? ''} width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="text-sm font-medium">
                    {getInitials(user?.displayName || user?.username || 'U')}
                  </span>
                )}
              </div>
              <div className="hidden text-left md:block">
                <div className="text-sm font-medium">{user?.displayName || user?.username}</div>
                <div className="text-xs text-muted-foreground">{user?.email}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            {/* Theme toggle in mobile dropdown */}
            {THEME_OPTIONS.map((t) => (
              <DropdownMenuItem
                key={t.id}
                className="sm:hidden"
                onClick={() => setTheme(t.id)}
              >
                <span className="mr-2">{t.icon}</span>
                {t.label}
                {theme === t.id && <span className="ml-auto text-primary">✓</span>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="sm:hidden" />
            <DropdownMenuItem onClick={() => router.push(user?.username ? `/profile/${user.username}` : '/profile')}>
              <User className="mr-2 h-4 w-4" />
              Mein Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Einstellungen
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Abmelden
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

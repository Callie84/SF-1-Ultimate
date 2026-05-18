// /apps/web-app/src/components/notifications/notification-dropdown.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Bell,
  MessageSquare,
  Heart,
  UserPlus,
  AtSign,
  Tag,
  Trophy,
  Award,
  Info,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  Notification,
} from '@/hooks/use-notifications';
import { useAuth } from '@/components/providers/auth-provider';

const typeIcons: Record<string, React.ReactNode> = {
  comment: <MessageSquare className="h-4 w-4" />,
  reply: <MessageSquare className="h-4 w-4" />,
  reaction: <Heart className="h-4 w-4" />,
  follow: <UserPlus className="h-4 w-4" />,
  mention: <AtSign className="h-4 w-4" />,
  price_alert: <Tag className="h-4 w-4" />,
  milestone: <Trophy className="h-4 w-4" />,
  badge: <Award className="h-4 w-4" />,
  system: <Info className="h-4 w-4" />,
};

const typeColors: Record<string, string> = {
  comment: 'text-blue-500',
  reply: 'text-blue-500',
  reaction: 'text-red-500',
  follow: 'text-green-500',
  mention: 'text-purple-500',
  price_alert: 'text-yellow-500',
  milestone: 'text-orange-500',
  badge: 'text-amber-500',
  system: 'text-gray-500',
};

export function NotificationDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const { data: unreadData } = useUnreadCount();
  const { data: notificationsData, isLoading } = useNotifications({ limit: 10 });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = unreadData?.count || 0;
  const notifications = notificationsData?.notifications || [];

  if (!user) return null;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification._id);
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-semibold">Benachrichtigungen</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={handleMarkAllRead}
              disabled={markAllAsRead.isPending}
            >
              {markAllAsRead.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCheck className="h-3 w-3 mr-1" />
              )}
              Alle gelesen
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Keine Benachrichtigungen
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification._id}
                className={cn(
                  'flex items-start gap-3 p-3 cursor-pointer',
                  !notification.isRead && 'bg-muted/50'
                )}
                asChild
              >
                <Link
                  href={notification.relatedUrl || '#'}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className={cn('mt-0.5', typeColors[notification.type])}>
                    {typeIcons[notification.type]}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-tight">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                  )}
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/notifications"
            className="w-full text-center text-sm font-medium"
            onClick={() => setIsOpen(false)}
          >
            Alle Benachrichtigungen anzeigen
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

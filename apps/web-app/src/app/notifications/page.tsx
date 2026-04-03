'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  CheckCheck,
  Trash2,
  Loader2,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
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
  comment: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  reply: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  reaction: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  follow: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  mention: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  price_alert: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  milestone: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  badge: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  system: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const typeLabels: Record<string, string> = {
  comment: 'Kommentar',
  reply: 'Antwort',
  reaction: 'Reaktion',
  follow: 'Neuer Follower',
  mention: 'Erwähnung',
  price_alert: 'Preisalarm',
  milestone: 'Meilenstein',
  badge: 'Abzeichen',
  system: 'System',
};

type FilterTab = 'all' | 'forum' | 'social' | 'prices' | 'system';

const filterTabs: { id: FilterTab; label: string; types: string[] }[] = [
  { id: 'all', label: 'Alle', types: [] },
  { id: 'forum', label: 'Forum', types: ['comment', 'reply', 'mention'] },
  { id: 'social', label: 'Reaktionen & Follows', types: ['reaction', 'follow'] },
  { id: 'prices', label: 'Preisalarme', types: ['price_alert', 'milestone', 'badge'] },
  { id: 'system', label: 'System', types: ['system'] },
];

function getTimeGroup(date: Date): string {
  if (isToday(date)) return 'Heute';
  if (isYesterday(date)) return 'Gestern';
  if (isThisWeek(date)) return 'Diese Woche';
  return 'Älter';
}

const timeGroupOrder = ['Heute', 'Gestern', 'Diese Woche', 'Älter'];

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (n: Notification) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

function NotificationItem({ notification, onMarkRead, onDelete }: NotificationItemProps) {
  return (
    <Link
      href={notification.relatedUrl || '#'}
      onClick={() => onMarkRead(notification)}
      className={cn(
        'group flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors',
        !notification.isRead && 'bg-primary/5'
      )}
    >
      <div className={cn('rounded-full p-2 flex-shrink-0', typeColors[notification.type] || typeColors.system)}>
        {typeIcons[notification.type] || typeIcons.system}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn('text-sm font-medium truncate', !notification.isRead && 'text-foreground')}>
              {notification.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          </div>
          {!notification.isRead && (
            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
              locale: de,
            })}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {typeLabels[notification.type] || notification.type}
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => onDelete(notification._id, e)}
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </Link>
  );
}

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);

  const { data, isLoading, isError, refetch, isFetching } = useNotifications({ limit: 100 });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const allNotifications = data?.notifications || [];

  // Client-side filter
  const activeTabDef = filterTabs.find((t) => t.id === activeFilter)!;
  let filtered = activeTabDef.types.length > 0
    ? allNotifications.filter((n) => activeTabDef.types.includes(n.type))
    : allNotifications;
  if (showUnreadOnly) {
    filtered = filtered.filter((n) => !n.isRead);
  }

  const unreadCount = allNotifications.filter((n) => !n.isRead).length;
  const displayedNotifications = filtered.slice(0, displayLimit);
  const hasMore = filtered.length > displayLimit;

  // Zeitliche Gruppierung
  const groups: Record<string, Notification[]> = {};
  for (const n of displayedNotifications) {
    const group = getTimeGroup(new Date(n.createdAt));
    if (!groups[group]) groups[group] = [];
    groups[group].push(n);
  }

  const handleMarkAsRead = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification._id);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNotification.mutate(id);
  };

  // Tab-Badge-Counts
  const countForTab = (tab: (typeof filterTabs)[number]) => {
    const inTab = tab.types.length > 0
      ? allNotifications.filter((n) => tab.types.includes(n.type))
      : allNotifications;
    return inTab.filter((n) => !n.isRead).length;
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 sm:h-8 sm:w-8" />
              Benachrichtigungen
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {unreadCount > 0
                ? `${unreadCount} ungelesen`
                : 'Alles gelesen'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn('h-4 w-4 mr-1', isFetching && 'animate-spin')} />
              <span className="hidden sm:inline">Aktualisieren</span>
            </Button>
            <Button
              variant={showUnreadOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setShowUnreadOnly(!showUnreadOnly); setDisplayLimit(PAGE_SIZE); }}
            >
              <Filter className="h-4 w-4 mr-1" />
              Ungelesen
              {unreadCount > 0 && (
                <span className="ml-1 rounded-full bg-primary/20 px-1.5 text-xs">{unreadCount}</span>
              )}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                {markAllAsRead.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCheck className="h-4 w-4 mr-1" />
                )}
                <span className="hidden sm:inline">Alle gelesen</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter-Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {filterTabs.map((tab) => {
            const cnt = countForTab(tab);
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveFilter(tab.id); setDisplayLimit(PAGE_SIZE); }}
                className={cn(
                  'flex-shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
                  activeFilter === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {tab.label}
                {cnt > 0 && (
                  <span className={cn(
                    'ml-1.5 rounded-full px-1.5 text-xs',
                    activeFilter === tab.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-foreground'
                  )}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notifications */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : isError ? (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">Fehler beim Laden der Benachrichtigungen</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                  Erneut versuchen
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">Keine Benachrichtigungen</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {showUnreadOnly ? 'Alle in dieser Kategorie wurden gelesen.' : 'Hier erscheinen deine Benachrichtigungen.'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {timeGroupOrder.map((groupLabel) => {
                  const items = groups[groupLabel];
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={groupLabel}>
                      <div className="px-4 py-2 bg-muted/30 border-b">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {groupLabel}
                        </span>
                      </div>
                      {items.map((notification) => (
                        <NotificationItem
                          key={notification._id}
                          notification={notification}
                          onMarkRead={handleMarkAsRead}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  );
                })}
                {hasMore && (
                  <div className="p-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDisplayLimit((l) => l + PAGE_SIZE)}
                    >
                      {filtered.length - displayLimit} weitere laden
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

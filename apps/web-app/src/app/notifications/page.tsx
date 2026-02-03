// /apps/web-app/src/app/notifications/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  comment: <MessageSquare className="h-5 w-5" />,
  reply: <MessageSquare className="h-5 w-5" />,
  reaction: <Heart className="h-5 w-5" />,
  follow: <UserPlus className="h-5 w-5" />,
  mention: <AtSign className="h-5 w-5" />,
  price_alert: <Tag className="h-5 w-5" />,
  milestone: <Trophy className="h-5 w-5" />,
  badge: <Award className="h-5 w-5" />,
  system: <Info className="h-5 w-5" />,
};

const typeColors: Record<string, string> = {
  comment: 'bg-blue-100 text-blue-600',
  reply: 'bg-blue-100 text-blue-600',
  reaction: 'bg-red-100 text-red-600',
  follow: 'bg-green-100 text-green-600',
  mention: 'bg-purple-100 text-purple-600',
  price_alert: 'bg-yellow-100 text-yellow-600',
  milestone: 'bg-orange-100 text-orange-600',
  badge: 'bg-amber-100 text-amber-600',
  system: 'bg-gray-100 text-gray-600',
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

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data, isLoading, isError } = useNotifications({ limit: 50 });
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

  const notifications = data?.notifications || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bell className="h-8 w-8" />
              Benachrichtigungen
            </h1>
            <p className="text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} ungelesene Benachrichtigung${unreadCount > 1 ? 'en' : ''}`
                : 'Alle Benachrichtigungen gelesen'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              {markAllAsRead.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-2" />
              )}
              Alle als gelesen markieren
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : isError ? (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">
                  Fehler beim Laden der Benachrichtigungen
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-16 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Keine Benachrichtigungen vorhanden
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <Link
                    key={notification._id}
                    href={notification.relatedUrl || '#'}
                    onClick={() => handleMarkAsRead(notification)}
                    className={cn(
                      'flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors',
                      !notification.isRead && 'bg-muted/30'
                    )}
                  >
                    <div
                      className={cn(
                        'rounded-full p-2',
                        typeColors[notification.type]
                      )}
                    >
                      {typeIcons[notification.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                          {typeLabels[notification.type]}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                      onClick={(e) => handleDelete(notification._id, e)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

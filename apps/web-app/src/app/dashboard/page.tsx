'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  TrendingUp,
  Users,
  Award,
  Sprout,
  Calendar,
  MessageSquare,
  Loader2,
  Droplets,
  Zap,
  Scissors,
  Sun,
  Eye,
  Bell,
  CheckCircle2,
  SkipForward,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useGrows } from '@/hooks/use-journal';
import { useGamificationProfile } from '@/hooks/use-gamification';
import { useUpcomingReminders, useOverdueReminders, useCompleteReminder, useSkipReminder, type ReminderType } from '@/hooks/use-reminders';

const REMINDER_TYPE_CONFIG: Record<ReminderType, { label: string; color: string; icon: React.ReactNode }> = {
  watering: { label: 'Gießen', color: 'bg-blue-500', icon: <Droplets className="h-3 w-3" /> },
  feeding: { label: 'Düngen', color: 'bg-green-500', icon: <Zap className="h-3 w-3" /> },
  transplant: { label: 'Umtopfen', color: 'bg-orange-500', icon: <Scissors className="h-3 w-3" /> },
  harvest: { label: 'Ernte', color: 'bg-yellow-500', icon: <Sun className="h-3 w-3" /> },
  inspection: { label: 'Kontrolle', color: 'bg-purple-500', icon: <Eye className="h-3 w-3" /> },
  custom: { label: 'Sonstiges', color: 'bg-muted-foreground', icon: <Bell className="h-3 w-3" /> },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useGrows();
  const { data: gamification } = useGamificationProfile(user?.id);
  const { data: upcomingData, isLoading: remindersLoading } = useUpcomingReminders(3);
  const { data: overdueData } = useOverdueReminders();
  const completeReminder = useCompleteReminder();
  const skipReminder = useSkipReminder();

  const upcomingReminders = upcomingData?.reminders || [];
  const overdueReminders = overdueData?.reminders || [];

  const grows = data?.grows || [];

  // Calculate real stats
  const activeGrows = grows.filter((g: any) =>
    !['HARVESTED', 'ABANDONED', 'completed', 'cancelled'].includes(g.status)
  ).length;
  const totalEntries = grows.reduce((sum: number, g: any) =>
    sum + (g.stats?.totalEntries || g.entryCount || 0), 0
  );
  const totalComments = grows.reduce((sum: number, g: any) =>
    sum + (g.stats?.totalComments || 0), 0
  );

  const stats = [
    {
      name: 'Meine Grows',
      value: isLoading ? '...' : grows.length.toString(),
      icon: Sprout,
      change: `${activeGrows} aktiv`
    },
    {
      name: 'Journal Einträge',
      value: isLoading ? '...' : totalEntries.toString(),
      icon: Calendar,
      change: 'Gesamt'
    },
    {
      name: 'Kommentare',
      value: isLoading ? '...' : totalComments.toString(),
      icon: MessageSquare,
      change: 'Gesamt'
    },
    {
      name: 'Level',
      value: gamification ? gamification.profile.level.toString() : '—',
      icon: Award,
      change: gamification ? `${gamification.profile.xp.toLocaleString('de-DE')} XP` : '...'
    },
  ];

  const quickActions = [
    {
      title: 'Neuer Grow',
      description: 'Starte einen neuen Grow und dokumentiere deine Reise',
      icon: Plus,
      href: '/journal/new',
      color: 'bg-primary',
    },
    {
      title: 'Preise vergleichen',
      description: 'Finde die besten Deals für deine Lieblings-Strains',
      icon: TrendingUp,
      href: '/prices',
      color: 'bg-blue-500',
    },
    {
      title: 'Community',
      description: 'Diskutiere mit anderen Growern und teile dein Wissen',
      icon: Users,
      href: '/community',
      color: 'bg-purple-500',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Willkommen zurück{user?.displayName || user?.username ? `, ${user?.displayName || user?.username}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            Hier ist eine Übersicht deiner Growing-Aktivitäten
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.name}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Schnellaktionen</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href}>
                  <Card className="cursor-pointer transition-colors hover:bg-accent h-full">
                    <CardHeader>
                      <div className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg ${action.color} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle>{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* My Grows */}
          <Card>
            <CardHeader>
              <CardTitle>Meine Grows</CardTitle>
              <CardDescription>Deine aktiven Grow-Projekte</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {grows.slice(0, 3).map((grow: any) => (
                    <div key={grow.id || grow._id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
                          <Sprout className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {grow.strainName || grow.strain?.name || 'Unbenannt'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {grow.environment || grow.growType || 'N/A'} • {grow.status}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/journal/${grow.id || grow._id}`}>
                          Öffnen
                        </Link>
                      </Button>
                    </div>
                  ))}

                  {grows.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      Noch keine Grows vorhanden
                    </p>
                  )}

                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/journal/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Neuen Grow starten
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Reminders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Bevorstehende Erinnerungen</CardTitle>
                <CardDescription>Nächste 3 Tage + Überfällig</CardDescription>
              </div>
              {overdueReminders.length > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {overdueReminders.length} überfällig
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {remindersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Overdue first */}
                  {overdueReminders.slice(0, 2).map((r) => {
                    const cfg = REMINDER_TYPE_CONFIG[r.type] || REMINDER_TYPE_CONFIG.custom;
                    return (
                      <div key={r._id} className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${cfg.color} text-white flex-shrink-0`}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{r.title}</div>
                          <div className="text-xs text-destructive">Überfällig</div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => completeReminder.mutate(r._id)}
                            title="Erledigt"
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => skipReminder.mutate(r._id)}
                            title="Überspringen"
                          >
                            <SkipForward className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Upcoming */}
                  {upcomingReminders.slice(0, 3).map((r) => {
                    const cfg = REMINDER_TYPE_CONFIG[r.type] || REMINDER_TYPE_CONFIG.custom;
                    const dueDate = new Date(r.dueDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    dueDate.setHours(0, 0, 0, 0);
                    const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
                    const dateLabel = diffDays === 0 ? 'Heute' : diffDays === 1 ? 'Morgen' : `In ${diffDays} Tagen`;
                    return (
                      <div key={r._id} className="flex items-center gap-3 rounded-lg border p-2.5">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${cfg.color} text-white flex-shrink-0`}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{r.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {dateLabel}{r.dueTime ? ` · ${r.dueTime}` : ''}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={() => completeReminder.mutate(r._id)}
                          title="Erledigt"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </Button>
                      </div>
                    );
                  })}

                  {upcomingReminders.length === 0 && overdueReminders.length === 0 && (
                    <p className="text-center text-muted-foreground py-6 text-sm">
                      Keine bevorstehenden Erinnerungen
                    </p>
                  )}

                  <Button variant="outline" className="w-full mt-2" asChild>
                    <Link href="/calendar">
                      <Calendar className="mr-2 h-4 w-4" />
                      Kalender öffnen
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tools & Resources */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Tools & Rechner</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/tools/vpd" className="flex gap-3 rounded-lg border p-3 hover:bg-accent transition-colors bg-card">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white text-sm font-medium flex-shrink-0">
                VP
              </div>
              <div className="flex-1">
                <div className="font-medium">VPD Rechner</div>
                <div className="text-sm text-muted-foreground">
                  Vapor Pressure Deficit berechnen
                </div>
              </div>
            </Link>

            <Link href="/tools/dli" className="flex gap-3 rounded-lg border p-3 hover:bg-accent transition-colors bg-card">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-white text-sm font-medium flex-shrink-0">
                DL
              </div>
              <div className="flex-1">
                <div className="font-medium">DLI Rechner</div>
                <div className="text-sm text-muted-foreground">
                  Daily Light Integral berechnen
                </div>
              </div>
            </Link>

            <Link href="/tools/ec" className="flex gap-3 rounded-lg border p-3 hover:bg-accent transition-colors bg-card">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white text-sm font-medium flex-shrink-0">
                EC
              </div>
              <div className="flex-1">
                <div className="font-medium">EC/PPM Umrechner</div>
                <div className="text-sm text-muted-foreground">
                  Nährstoffwerte umrechnen
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

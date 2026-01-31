'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  TrendingUp,
  Users,
  Award,
  Sprout,
  Calendar,
  MessageSquare,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useGrows } from '@/hooks/use-journal';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useGrows();

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
      value: (user as any)?.level?.toString() || '1',
      icon: Award,
      change: `${(user as any)?.xp || 0} XP`
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
          <h1 className="text-3xl font-bold">
            Willkommen zurück{user?.displayName || user?.username ? `, ${user?.displayName || user?.username}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            Hier ist eine Übersicht deiner Growing-Aktivitäten
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <div className="grid gap-4 md:grid-cols-3">
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

          {/* Tools & Resources */}
          <Card>
            <CardHeader>
              <CardTitle>Tools & Rechner</CardTitle>
              <CardDescription>Nützliche Werkzeuge für deinen Grow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Link href="/tools/vpd" className="flex gap-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white text-sm font-medium">
                    VP
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">VPD Rechner</div>
                    <div className="text-sm text-muted-foreground">
                      Vapor Pressure Deficit berechnen
                    </div>
                  </div>
                </Link>

                <Link href="/tools/dli" className="flex gap-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-white text-sm font-medium">
                    DL
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">DLI Rechner</div>
                    <div className="text-sm text-muted-foreground">
                      Daily Light Integral berechnen
                    </div>
                  </div>
                </Link>

                <Link href="/tools/ec" className="flex gap-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white text-sm font-medium">
                    EC
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">EC/PPM Umrechner</div>
                    <div className="text-sm text-muted-foreground">
                      Nährstoffwerte umrechnen
                    </div>
                  </div>
                </Link>

                <Button variant="outline" className="w-full" asChild>
                  <Link href="/tools">
                    Alle Tools ansehen
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

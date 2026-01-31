'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Sprout,
  MessageSquare,
  FileText,
  AlertTriangle,
  Activity,
  Server,
  Database,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  Flag,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useAdminStats, useSystemHealth } from '@/hooks/use-admin';
import { formatNumber } from '@/lib/utils';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: health, isLoading: healthLoading } = useSystemHealth();

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <Card className="flex flex-col items-center justify-center py-16">
          <Shield className="mb-4 h-16 w-16 text-destructive" />
          <h3 className="mb-2 text-xl font-semibold">Zugriff verweigert</h3>
          <p className="text-muted-foreground mb-4">
            Du benötigst Admin-Rechte, um auf diesen Bereich zuzugreifen.
          </p>
          <Button asChild>
            <Link href="/dashboard">Zurück zum Dashboard</Link>
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Überwache und verwalte die SF-1 Plattform
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/settings">
                <Settings className="mr-2 h-4 w-4" />
                Einstellungen
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-4">
          <Link href="/admin/users">
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Benutzer</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : formatNumber(stats?.users?.total || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  +{stats?.users?.newToday || 0} heute
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/grows">
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Grows</CardTitle>
                <Sprout className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : formatNumber(stats?.grows?.total || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.grows?.active || 0} aktiv
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/threads">
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Threads</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : formatNumber(stats?.threads?.total || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  +{stats?.threads?.newToday || 0} heute
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/moderation">
            <Card className="cursor-pointer transition-colors hover:bg-accent border-orange-500/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Meldungen</CardTitle>
                <Flag className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {statsLoading ? '...' : stats?.reports?.pending || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Offen zur Prüfung
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* System Health */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>System-Status</CardTitle>
                <CardDescription>Echtzeit-Überwachung aller Services</CardDescription>
              </div>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Services */}
                {health?.services?.map((service: any) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Server className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {service.latency}ms Latenz
                        </div>
                      </div>
                    </div>
                    {getStatusIcon(service.status)}
                  </div>
                ))}

                {/* Database */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Datenbank</div>
                      <div className="text-xs text-muted-foreground">
                        {health?.database?.connections || 0} Verbindungen
                      </div>
                    </div>
                  </div>
                  {getStatusIcon(health?.database?.status)}
                </div>

                {/* Redis */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Redis Cache</div>
                      <div className="text-xs text-muted-foreground">
                        {health?.redis?.memory || '0MB'} verwendet
                      </div>
                    </div>
                  </div>
                  {getStatusIcon(health?.redis?.status)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* User Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Benutzer-Aktivität</CardTitle>
              <CardDescription>Übersicht der Benutzerstatistiken</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Registrierte Benutzer</span>
                  <span className="font-bold">{formatNumber(stats?.users?.total || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Neu heute</span>
                  <span className="font-bold text-green-500">+{stats?.users?.newToday || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Neu diese Woche</span>
                  <span className="font-bold">+{stats?.users?.newThisWeek || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Aktive Benutzer (24h)</span>
                  <span className="font-bold">{formatNumber(stats?.users?.active || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Content-Statistiken</CardTitle>
              <CardDescription>Übersicht der Inhalte</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Grow-Projekte</span>
                  <span className="font-bold">{formatNumber(stats?.grows?.total || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Journal-Einträge</span>
                  <span className="font-bold">{formatNumber(stats?.entries?.total || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Community-Threads</span>
                  <span className="font-bold">{formatNumber(stats?.threads?.total || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Offene Meldungen</span>
                  <span className="font-bold text-orange-500">{stats?.reports?.pending || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Schnellzugriff</CardTitle>
            <CardDescription>Häufig verwendete Admin-Funktionen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/admin/users">
                  <Users className="mr-2 h-4 w-4" />
                  Benutzer verwalten
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/admin/moderation">
                  <Flag className="mr-2 h-4 w-4" />
                  Meldungen prüfen
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/admin/categories">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Kategorien
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/admin/logs">
                  <FileText className="mr-2 h-4 w-4" />
                  System-Logs
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

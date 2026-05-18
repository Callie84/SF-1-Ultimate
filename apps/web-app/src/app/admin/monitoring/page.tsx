'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Shield,
  Server,
  Clock,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useSystemHealth } from '@/hooks/use-admin';

function StatusBadge({ status }: { status: string }) {
  if (status === 'healthy')
    return (
      <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600">
        <CheckCircle className="h-3 w-3" /> Betriebsbereit
      </span>
    );
  if (status === 'unreachable')
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600">
        <XCircle className="h-3 w-3" /> Nicht erreichbar
      </span>
    );
  return (
    <span className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-600">
      <AlertCircle className="h-3 w-3" /> Gestört
    </span>
  );
}

function LatencyBar({ latency }: { latency: number }) {
  const max = 500;
  const pct = Math.min((latency / max) * 100, 100);
  const color = latency < 100 ? 'bg-green-500' : latency < 300 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{latency}ms</span>
    </div>
  );
}

const UPTIME_MONITORS = [
  { name: 'Website (Hauptseite)', url: 'https://seedfinderpro.de' },
  { name: 'Auth-Service', url: 'https://seedfinderpro.de/api/auth/health' },
  { name: 'Community-Service', url: 'https://seedfinderpro.de/api/community/health' },
  { name: 'Journal-Service', url: 'https://seedfinderpro.de/api/journal/health' },
  { name: 'Search-Service', url: 'https://seedfinderpro.de/api/search/health' },
  { name: 'Status-Seite', url: 'https://seedfinderpro.de/status' },
];

export default function AdminMonitoringPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data, isLoading, refetch, dataUpdatedAt } = useSystemHealth();

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
          <Button asChild><Link href="/dashboard">Zurück</Link></Button>
        </Card>
      </DashboardLayout>
    );
  }

  const health = data as any;
  const services = health?.services || [];
  const healthyCount = services.filter((s: any) => s.status === 'healthy').length;
  const lastCheck = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back + Header */}
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Admin Dashboard
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-7 w-7" />
              System-Monitoring
            </h1>
            <p className="text-muted-foreground">Service-Status und Verfügbarkeit</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/status" target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                Status-Seite
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>
          </div>
        </div>

        {/* KPI-Karten */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{healthyCount}</div>
              <p className="text-xs text-muted-foreground">Services OK</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500">
                {services.filter((s: any) => s.status !== 'healthy').length}
              </div>
              <p className="text-xs text-muted-foreground">Services gestört</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{services.length}</div>
              <p className="text-xs text-muted-foreground">Services gesamt</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className={`text-2xl font-bold ${health?.status === 'healthy' ? 'text-green-500' : 'text-yellow-500'}`}>
                {health?.status === 'healthy' ? '100%' : `${Math.round((healthyCount / services.length) * 100)}%`}
              </div>
              <p className="text-xs text-muted-foreground">Verfügbarkeit</p>
            </CardContent>
          </Card>
        </div>

        {/* Service-Tabelle */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                <CardTitle>Microservices</CardTitle>
              </div>
              {lastCheck && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Zuletzt: {lastCheck.toLocaleTimeString('de-DE')}
                </div>
              )}
            </div>
            <CardDescription>Automatische Aktualisierung alle 15 Sekunden</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !data ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : services.length > 0 ? (
              <div className="divide-y">
                {services.map((service: any) => (
                  <div key={service.name} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          service.status === 'healthy'
                            ? 'bg-green-500 animate-pulse'
                            : service.status === 'unreachable'
                            ? 'bg-red-500'
                            : 'bg-yellow-500'
                        }`}
                      />
                      <span className="font-medium text-sm">{service.label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {service.status === 'healthy' && <LatencyBar latency={service.latency} />}
                      <StatusBadge status={service.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground text-sm">
                Keine Daten verfügbar
              </p>
            )}
          </CardContent>
        </Card>

        {/* UptimeRobot Konfiguration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              UptimeRobot Monitore
            </CardTitle>
            <CardDescription>
              Diese URLs für externe Überwachung bei UptimeRobot konfigurieren
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {UPTIME_MONITORS.map((monitor) => (
                <div
                  key={monitor.name}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <span className="text-sm font-medium">{monitor.name}</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {monitor.url}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => navigator.clipboard.writeText(monitor.url)}
                      title="URL kopieren"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              <strong>Setup:</strong> UptimeRobot → New Monitor → HTTP(s) → URL eintragen →
              Alert Contact hinzufügen → Monitor-Intervall: 5 Minuten
            </div>
          </CardContent>
        </Card>

        {/* Grafana & Prometheus Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Erweiterte Metriken
            </CardTitle>
            <CardDescription>Prometheus + Grafana Monitoring Stack</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="font-medium text-sm">Grafana Dashboards</p>
                <p className="text-xs text-muted-foreground">CPU, RAM, Anfragen, Latenz — nur per SSH-Tunnel erreichbar</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="http://localhost:3200" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Öffnen (lokal)
                </a>
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="font-medium text-sm">Prometheus</p>
                <p className="text-xs text-muted-foreground">Rohe Metriken & Queries — nur per SSH-Tunnel erreichbar</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="http://localhost:9090" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Öffnen (lokal)
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

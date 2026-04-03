'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw, Activity } from 'lucide-react';
import Link from 'next/link';

interface ServiceHealth {
  name: string;
  label: string;
  status: 'healthy' | 'unhealthy' | 'unreachable';
  latency: number;
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  checkedAt: string;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'healthy')
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  if (status === 'unhealthy' || status === 'unreachable')
    return <XCircle className="h-5 w-5 text-destructive" />;
  return <AlertCircle className="h-5 w-5 text-yellow-500" />;
}

function OverallBanner({ status }: { status: string }) {
  if (status === 'healthy') {
    return (
      <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-6 text-center">
        <CheckCircle className="mx-auto h-10 w-10 text-green-500 mb-3" />
        <h2 className="text-xl font-semibold text-green-700 dark:text-green-400">Alle Systeme betriebsbereit</h2>
        <p className="text-sm text-green-600/80 dark:text-green-500/80 mt-1">
          Alle Dienste laufen normal.
        </p>
      </div>
    );
  }
  if (status === 'degraded') {
    return (
      <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-yellow-500 mb-3" />
        <h2 className="text-xl font-semibold text-yellow-700 dark:text-yellow-400">Eingeschränkter Betrieb</h2>
        <p className="text-sm text-yellow-600/80 dark:text-yellow-500/80 mt-1">
          Einzelne Dienste sind beeinträchtigt.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-6 text-center">
      <XCircle className="mx-auto h-10 w-10 text-red-500 mb-3" />
      <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">Systemstörung</h2>
      <p className="text-sm text-red-600/80 dark:text-red-500/80 mt-1">
        Mehrere Dienste sind nicht erreichbar.
      </p>
    </div>
  );
}

export default function StatusPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch {
      // keep old data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Activity className="h-5 w-5 text-primary" />
            SeedFinderPro Status
          </Link>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Overall Status */}
        {loading && !data ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            <OverallBanner status={data.status} />

            {/* Service List */}
            <div className="rounded-xl border overflow-hidden">
              {data.services.map((service, i) => (
                <div
                  key={service.name}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < data.services.length - 1 ? 'border-b' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon status={service.status} />
                    <span className="font-medium text-sm">{service.label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {service.status === 'healthy' && (
                      <span className="text-xs text-muted-foreground">{service.latency}ms</span>
                    )}
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        service.status === 'healthy'
                          ? 'bg-green-500/10 text-green-600'
                          : service.status === 'unreachable'
                          ? 'bg-red-500/10 text-red-600'
                          : 'bg-yellow-500/10 text-yellow-600'
                      }`}
                    >
                      {service.status === 'healthy' ? 'Betriebsbereit' : service.status === 'unreachable' ? 'Nicht erreichbar' : 'Gestört'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Last Updated */}
            {lastUpdated && (
              <p className="text-center text-xs text-muted-foreground">
                Zuletzt aktualisiert: {lastUpdated.toLocaleTimeString('de-DE')} · Automatische Aktualisierung alle 30s
              </p>
            )}
          </>
        ) : (
          <p className="text-center text-muted-foreground py-12">Status konnte nicht geladen werden.</p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  DollarSign,
  Zap,
  MessageSquare,
  Eye,
  Lightbulb,
  Loader2,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useAiMonitoring } from '@/hooks/use-ai-monitoring';

function formatCost(usd: number): string {
  if (usd < 0.01) return `< $0.01`;
  return `$${usd.toFixed(4)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function AdminAiPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { data, isLoading, refetch, isFetching } = useAiMonitoring();

  useEffect(() => {
    if (!authLoading && user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading || (!data && isLoading)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const today = data?.today;
  const last7 = data?.last7Days || [];
  const month = data?.currentMonth;
  const lastMonth = data?.lastMonth;
  const summary30 = data?.last30Summary;

  // Maximale Kosten eines Tages für die Chart-Balken
  const maxDayCost = Math.max(...last7.map(d => d.costUsd), 0.0001);
  const maxDayReqs = Math.max(...last7.map(d => d.requests), 1);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI-Monitoring</h1>
            <p className="text-muted-foreground">OpenAI Token-Verbrauch und Kosten</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>

        {/* Heute - Übersicht */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Heute: Kosten</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {formatCost(today?.costUsd || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatTokens(today?.totalTokens || 0)} Tokens
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Heute: Anfragen</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{today?.requests || 0}</div>
              <p className="text-xs text-muted-foreground">API-Calls gesamt</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dieser Monat</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCost(month?.costUsd || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {month?.requests || 0} Anfragen
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Letzter Monat</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCost(lastMonth?.costUsd || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {lastMonth?.requests || 0} Anfragen
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Endpoint-Breakdown + Modell-Split */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Endpoint-Nutzung heute */}
          <Card>
            <CardHeader>
              <CardTitle>Endpoints (heute)</CardTitle>
              <CardDescription>Anfragen pro Feature</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-blue-500 shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Chat</span>
                    <span className="font-medium">{today?.byEndpoint?.chat || 0}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${Math.min(100, ((today?.byEndpoint?.chat || 0) / Math.max(today?.requests || 1, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-orange-500 shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Diagnose</span>
                    <span className="font-medium">{today?.byEndpoint?.diagnose || 0}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{
                        width: `${Math.min(100, ((today?.byEndpoint?.diagnose || 0) / Math.max(today?.requests || 1, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Lightbulb className="h-5 w-5 text-green-500 shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Advisor</span>
                    <span className="font-medium">{today?.byEndpoint?.advice || 0}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{
                        width: `${Math.min(100, ((today?.byEndpoint?.advice || 0) / Math.max(today?.requests || 1, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modell-Split */}
          <Card>
            <CardHeader>
              <CardTitle>Modell-Nutzung (heute)</CardTitle>
              <CardDescription>Tokens pro Modell</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(['gpt-4o', 'gpt-4o-mini'] as const).map(model => {
                const m = today?.byModel?.[model];
                const totalInput = m?.inputTokens || 0;
                const totalOutput = m?.outputTokens || 0;
                const total = totalInput + totalOutput;
                const grandTotal = today?.totalTokens || 1;
                const pct = Math.min(100, (total / grandTotal) * 100);

                return (
                  <div key={model} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={model === 'gpt-4o' ? 'default' : 'secondary'}>
                          {model}
                        </Badge>
                      </div>
                      <span className="text-sm font-medium">{formatTokens(total)} Tokens</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${model === 'gpt-4o' ? 'bg-purple-500' : 'bg-sky-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Input: {formatTokens(totalInput)}</span>
                      <span>Output: {formatTokens(totalOutput)}</span>
                    </div>
                  </div>
                );
              })}

              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gesamt Input</span>
                  <span>{formatTokens(today?.inputTokens || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gesamt Output</span>
                  <span>{formatTokens(today?.outputTokens || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 7-Tage Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Letzte 7 Tage</CardTitle>
            <CardDescription>Anfragen und Kosten im Verlauf</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {last7.map(day => (
                <div key={day.date} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground w-24 shrink-0">
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('de-DE', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                    <div className="flex-1 mx-3 space-y-1">
                      {/* Anfragen-Balken */}
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-muted rounded-full overflow-hidden flex-1">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(day.requests / maxDayReqs) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs w-8 text-right">{day.requests}</span>
                      </div>
                      {/* Kosten-Balken */}
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-muted rounded-full overflow-hidden flex-1">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${(day.costUsd / maxDayCost) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs w-16 text-right text-green-600 dark:text-green-400">
                          {formatCost(day.costUsd)}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-20 text-right">
                      {formatTokens(day.totalTokens)} T
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Legende */}
            <div className="flex gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="h-2 w-4 bg-blue-500 rounded" />
                <span>Anfragen</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-4 bg-green-500 rounded" />
                <span>Kosten</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 30-Tage Zusammenfassung */}
        <Card>
          <CardHeader>
            <CardTitle>30-Tage Zusammenfassung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{summary30?.requests || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Anfragen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatTokens(summary30?.inputTokens || 0)}</div>
                <div className="text-xs text-muted-foreground mt-1">Input-Tokens</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatTokens(summary30?.outputTokens || 0)}</div>
                <div className="text-xs text-muted-foreground mt-1">Output-Tokens</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {formatCost(summary30?.costUsd || 0)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Gesamtkosten</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preisinfo */}
        <Card>
          <CardHeader>
            <CardTitle>OpenAI Preisübersicht</CardTitle>
            <CardDescription>Aktuelle Kosten pro 1.000 Tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge>gpt-4o</Badge>
                  <span className="text-sm text-muted-foreground">Vision-fähig (Diagnose)</span>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Input</span>
                    <span>$0.0025 / 1K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Output</span>
                    <span>$0.0100 / 1K</span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">gpt-4o-mini</Badge>
                  <span className="text-sm text-muted-foreground">Chat & Quick-Diagnose</span>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Input</span>
                    <span>$0.00015 / 1K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Output</span>
                    <span>$0.00060 / 1K</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button variant="outline" asChild>
            <Link href="/admin">← Admin Dashboard</Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

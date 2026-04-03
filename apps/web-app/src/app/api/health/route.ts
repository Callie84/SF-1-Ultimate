// /apps/web-app/src/app/api/health/route.ts
// Aggregiert Health-Status aller Microservices (server-side, kein CORS-Problem)
import { NextResponse } from 'next/server';

const SERVICES = [
  { name: 'auth', label: 'Auth-Service', url: 'http://sf1-auth-service:3001/health' },
  { name: 'community', label: 'Community-Service', url: 'http://sf1-community-service:3005/health' },
  { name: 'journal', label: 'Journal-Service', url: 'http://sf1-journal-service:3003/health' },
  { name: 'notification', label: 'Notification-Service', url: 'http://sf1-notification-service:3006/health' },
  { name: 'price', label: 'Price-Service', url: 'http://sf1-price-service:3002/health' },
  { name: 'search', label: 'Search-Service', url: 'http://sf1-search-service:3007/health' },
  { name: 'ai', label: 'AI-Service', url: 'http://sf1-ai-service:3010/health' },
  { name: 'tools', label: 'Tools-Service', url: 'http://sf1-tools-service:3004/health' },
  { name: 'backup', label: 'Backup-Service', url: 'http://sf1-backup:3011/health' },
];

async function checkService(service: typeof SERVICES[0]) {
  const start = Date.now();
  try {
    const res = await fetch(service.url, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    });
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { name: service.name, label: service.label, status: 'healthy', latency, detail: data };
    }
    return { name: service.name, label: service.label, status: 'unhealthy', latency, detail: null };
  } catch {
    return { name: service.name, label: service.label, status: 'unreachable', latency: Date.now() - start, detail: null };
  }
}

export async function GET() {
  const results = await Promise.allSettled(SERVICES.map(checkService));

  const services = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { name: SERVICES[i].name, label: SERVICES[i].label, status: 'unreachable', latency: 0, detail: null }
  );

  const allHealthy = services.every(s => s.status === 'healthy');
  const someUnhealthy = services.some(s => s.status !== 'healthy');

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : someUnhealthy ? 'degraded' : 'unhealthy',
      services,
      checkedAt: new Date().toISOString(),
    },
    {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  );
}

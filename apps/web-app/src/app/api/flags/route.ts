// apps/web-app/src/app/api/flags/route.ts
// Proxied Feature-Flags von Unleash — gecacht, kein direkter Browser-Zugriff auf Unleash nötig
import { NextResponse } from 'next/server';

const UNLEASH_URL = process.env.UNLEASH_URL || 'http://sf1-unleash:4242';
const UNLEASH_FRONTEND_TOKEN = process.env.UNLEASH_FRONTEND_API_KEY || '';

export const dynamic = 'force-dynamic';
export const revalidate = 30; // 30 Sekunden Cache

export async function GET() {
  try {
    const res = await fetch(`${UNLEASH_URL}/api/frontend`, {
      headers: {
        Authorization: `default:development.${UNLEASH_FRONTEND_TOKEN}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ flags: getDefaultFlags() }, { status: 200 });
    }

    const data = await res.json();

    // Nur enabled-Status zurückgeben (kein internes Unleash-Detail nach außen)
    const flags: Record<string, boolean> = {};
    for (const toggle of data.toggles ?? []) {
      flags[toggle.name] = toggle.enabled === true;
    }

    return NextResponse.json(
      { flags },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch {
    // Unleash nicht erreichbar → sichere Defaults
    return NextResponse.json({ flags: getDefaultFlags() }, { status: 200 });
  }
}

function getDefaultFlags(): Record<string, boolean> {
  return {
    new_onboarding_flow: true,
    push_notifications: false,
    ai_chat_v2: false,
    premium_features: false,
  };
}

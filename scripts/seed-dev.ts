/**
 * SF-1 Ultimate — Dev Seed Script
 *
 * Legt Test-Daten an: 5 User, 5 Grows, 10 Community-Posts
 * Verwendung: npx tsx scripts/seed-dev.ts
 *
 * Voraussetzung: Auth-Service PostgreSQL + Community/Journal MongoDB laufen
 */

import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const COMMUNITY_URL = process.env.COMMUNITY_SERVICE_URL || 'http://localhost:3005';
const JOURNAL_URL = process.env.JOURNAL_SERVICE_URL || 'http://localhost:3003';

interface UserSeed {
  email: string;
  username: string;
  password: string;
  displayName: string;
}

const TEST_USERS: UserSeed[] = [
  { email: 'alice@test.dev', username: 'alice_grows', password: 'Test1234!', displayName: 'Alice' },
  { email: 'bob@test.dev', username: 'bob_420', password: 'Test1234!', displayName: 'Bob' },
  { email: 'charlie@test.dev', username: 'charlie_green', password: 'Test1234!', displayName: 'Charlie' },
  { email: 'diana@test.dev', username: 'diana_harvest', password: 'Test1234!', displayName: 'Diana' },
  { email: 'eve@test.dev', username: 'eve_indoor', password: 'Test1234!', displayName: 'Eve' },
];

const TEST_GROWS = [
  { name: 'Blue Dream Indoor', strain: 'Blue Dream', medium: 'SOIL', status: 'GROWING' },
  { name: 'White Widow Balkon', strain: 'White Widow', medium: 'COCO', status: 'FLOWERING' },
  { name: 'OG Kush Test', strain: 'OG Kush', medium: 'HYDRO', status: 'SEEDLING' },
];

const TEST_POSTS = [
  {
    title: 'Erste Erfahrungen mit Blue Dream',
    content: 'Habe gerade meine erste Blue Dream geerntet und war super happy mit dem Ergebnis. 85g von einer Pflanze im 11L Topf. Die Pflanze war sehr robust und hat kaum Probleme gemacht.',
    category: 'Grow-Berichte',
  },
  {
    title: 'VPD Kontrolle — meine Erfahrungen',
    content: 'Seit ich VPD aktiv kontrolliere hat sich die Wachstumsrate deutlich verbessert. Ich halte jetzt 0.8-1.0 kPa in der Vegetationsphase und 1.0-1.5 in der Blüte.',
    category: 'Technik & Equipment',
  },
  {
    title: 'Empfehlung Seedbank für Autoflower?',
    content: 'Suche eine gute Seedbank für Autoflower-Samen. Hat jemand Erfahrung mit FastBuds oder Barneys Farm? Welche würdet ihr empfehlen?',
    category: 'Samen & Genetics',
  },
];

async function fetchJson(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

async function seed() {
  console.log('🌱 SF-1 Dev Seeder gestartet...\n');

  const tokens: string[] = [];

  // 1. User registrieren
  console.log('👤 User anlegen...');
  for (const user of TEST_USERS) {
    const res = await fetchJson(`${AUTH_URL}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify(user),
    });

    if (res.ok) {
      const token = res.data.accessToken || res.data.tokens?.accessToken;
      if (token) tokens.push(token);
      console.log(`  ✅ ${user.username} angelegt`);
    } else if (res.status === 409) {
      console.log(`  ⚠️  ${user.username} existiert bereits`);
      // Login um Token zu bekommen
      const loginRes = await fetchJson(`${AUTH_URL}/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: user.email, password: user.password }),
      });
      if (loginRes.ok) {
        const token = loginRes.data.accessToken || loginRes.data.tokens?.accessToken;
        if (token) tokens.push(token);
      }
    } else {
      console.log(`  ❌ ${user.username} Fehler:`, res.data);
    }
  }

  if (tokens.length === 0) {
    console.log('\n❌ Keine Tokens — Seeding abgebrochen');
    process.exit(1);
  }

  console.log(`\n📝 ${tokens.length} Token(s) erhalten\n`);

  // 2. Grows anlegen (mit erstem Token)
  console.log('🌿 Grows anlegen...');
  for (const grow of TEST_GROWS) {
    const token = tokens[0];
    const res = await fetchJson(`${JOURNAL_URL}/api/journal/grows`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...grow,
        startDate: new Date().toISOString(),
        isPublic: true,
      }),
    });

    if (res.ok) {
      console.log(`  ✅ Grow "${grow.name}" angelegt`);
    } else {
      console.log(`  ❌ Grow "${grow.name}" Fehler:`, res.data?.error || res.status);
    }
  }

  // 3. Community-Posts anlegen
  console.log('\n💬 Community-Posts anlegen...');
  for (let i = 0; i < TEST_POSTS.length; i++) {
    const token = tokens[i % tokens.length];
    const post = TEST_POSTS[i];

    const res = await fetchJson(`${COMMUNITY_URL}/api/community/threads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(post),
    });

    if (res.ok) {
      console.log(`  ✅ Post "${post.title}" angelegt`);
    } else {
      console.log(`  ❌ Post "${post.title}" Fehler:`, res.data?.error || res.status);
    }
  }

  console.log('\n✅ Seeding abgeschlossen!\n');
  console.log('Test-Zugangsdaten:');
  for (const u of TEST_USERS) {
    console.log(`  ${u.email} / ${u.password}`);
  }
}

seed().catch((err) => {
  console.error('Seed-Script Fehler:', err);
  process.exit(1);
});

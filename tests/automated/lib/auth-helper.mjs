#!/usr/bin/env node
/**
 * Auth Helper — TestSession für Test-Lifecycle-Management
 * Kapselt Register, Token-Management, Cleanup
 */

import { createHmac } from 'crypto';
import { request, requestOrThrow } from './http-client.mjs';
import { BASE } from './service-discovery.mjs';

// JWT-Secret aus Umgebung, mit Fallback
const JWT_SECRET = process.env.SF1_JWT_SECRET
  || 'fallback-only-for-ci-testing-never-production';

/**
 * Genera Admin JWT für privilegierte Ops (z.B. Backup-Tests)
 * @returns {string} - signed JWT
 */
function generateAdminJWT() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    userId: 'admin',
    role: 'ADMIN',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const sig = createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${sig}`;
}

/**
 * Test-Session: Kapselt einen Test-User Lifecycle
 * - setup(): Register + Token holen
 * - teardown(): Account löschen (läuft IMMER, auch nach Fehler)
 * - token: accessToken für API-Calls
 */
export class TestSession {
  #timestamp;
  #user;
  #accessToken;
  #refreshToken;

  constructor(overrides = {}) {
    this.#timestamp = Date.now();
    this.#user = null;
    this.#accessToken = null;
    this.#refreshToken = null;

    // Erlaubt custom email/username per Suite
    this.email = overrides.email || `autotest${this.#timestamp}@test.de`;
    this.username = overrides.username || `autotest${this.#timestamp}`.slice(0, 20);
    this.password = overrides.password || 'AutoTest2026!';
    this.ageVerified = overrides.ageVerified ?? true;
  }

  /**
   * Registriere neuen User + hole Token
   * Wirft bei Fehler (für before()-Hook)
   */
  async setup() {
    if (!BASE.auth) {
      throw new Error('Auth Service nicht erreichbar');
    }

    // Register
    const regRes = await requestOrThrow('POST', `${BASE.auth}/api/auth/register`, {
      body: {
        email: this.email,
        username: this.username,
        password: this.password,
        ageVerified: this.ageVerified,
      },
      label: 'Register in TestSession',
      expectStatus: 201,
    });

    this.#user = regRes.data?.user;
    this.#accessToken = regRes.data?.accessToken;
    this.#refreshToken = regRes.data?.refreshToken;

    // IP-Single-Session Workaround: Token direkt aus Register verwenden
    // wenn Login mit 403 wäre (wird von auth-service's IP-Lock gemacht)
    if (!this.#accessToken && regRes.data?.token) {
      this.#accessToken = regRes.data.token;
    }

    if (!this.#accessToken) {
      throw new Error('Kein accessToken in Register-Response');
    }

    return this.#user;
  }

  /**
   * Lösche den Test-User
   * Läuft IMMER, auch wenn Tests fehlschlagen
   * Wirft nicht (damit after()-Hook nicht failure wird)
   */
  async teardown() {
    if (!this.#user || !this.#accessToken || !BASE.auth) {
      return;
    }

    const res = await request('DELETE', `${BASE.auth}/api/auth/account`, {
      token: this.#accessToken,
      body: { password: this.password },
      label: 'Delete account in TestSession.teardown()',
      expectStatus: [200, 204, 404],  // 404 = bereits gelöscht, OK
    });

    // Log falls Fehler, aber nicht werfen
    if (!res.ok) {
      console.warn(`⚠️  TestSession cleanup: ${res.error}`);
    }
  }

  // ─ Properties ─

  /**
   * Aktueller accessToken
   */
  get token() {
    return this.#accessToken;
  }

  /**
   * User ID (Prisma cuid, z.B. "clxyz...")
   * NICHT _id!
   */
  get userId() {
    return this.#user?.id ?? null;
  }

  /**
   * Gesamtes User-Objekt
   */
  get user() {
    return this.#user;
  }

  /**
   * Refresh-Token (falls vorhanden)
   */
  get refreshToken() {
    return this.#refreshToken;
  }
}

/**
 * Erstelle eine zweite Test-Session (nützlich für Cross-User-Tests wie Permission Guards)
 * z.B. User B versucht Grow von User A zu löschen
 */
export async function createAnotherSession(overrides = {}) {
  const other = new TestSession(overrides);
  await other.setup();
  return other;
}

/**
 * Exportiere auch Admin-JWT Generator für Admin-exclusive Tests
 */
export function getAdminToken() {
  return generateAdminJWT();
}

/**
 * Generiere Token mit custom Role (z.B. für MODERATOR Tests)
 * Warnung: Das ist ein lokal generierter Token ohne DB-Validierung
 */
export function generateTokenWithRole(userId = 'test-user', role = 'USER') {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    userId,
    role,
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const sig = createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${sig}`;
}

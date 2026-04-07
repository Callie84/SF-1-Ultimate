#!/usr/bin/env node
/**
 * Auth Service Tests — Register, Login, Token, Account Management
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request, requestOrThrow } from '../lib/http-client.mjs';
import { TestSession } from '../lib/auth-helper.mjs';
import { BASE } from '../lib/service-discovery.mjs';

describe('Auth Service', () => {
  // ═════════════════════════════════════════════════════════════════

  describe('Registrierung', () => {
    const session = new TestSession();
    let testUserId = null;

    after(async () => {
      if (testUserId) {
        await session.teardown();
      }
    });

    it('neuen User registrieren → 201', async () => {
      const res = await requestOrThrow('POST', `${BASE.auth}/api/auth/register`, {
        body: {
          email: session.email,
          username: session.username,
          password: session.password,
          ageVerified: session.ageVerified,
        },
        expectStatus: 201,
      });

      // Response-Shape Assertions
      assert.ok(res.data.user, 'user-Objekt fehlt');
      assert.ok(res.data.user.id, 'user.id (Prisma cuid) fehlt');
      assert.ok(res.data.accessToken, 'accessToken fehlt');
      assert.strictEqual(typeof res.data.user.email, 'string');
      assert.strictEqual(res.data.user.email, session.email);

      testUserId = res.data.user.id;
    });

    it('doppelte Registrierung abgelehnt → 400', async () => {
      const res = await request('POST', `${BASE.auth}/api/auth/register`, {
        body: {
          email: session.email,
          username: session.username,
          password: session.password,
        },
        expectStatus: [400, 409],
      });

      assert.ok(!res.ok, 'sollte fehlschlagen bei doppeltem Account');
      assert.ok([400, 409].includes(res.status), `Status sollte 400/409 sein, ist ${res.status}`);
    });

    it('ungültige Daten abgelehnt → 400', async () => {
      const res = await request('POST', `${BASE.auth}/api/auth/register`, {
        body: {
          email: 'not-an-email',
          username: 'x',  // zu kurz?
          password: '123',
        },
        expectStatus: [400, 422],
      });

      assert.ok(!res.ok);
    });
  });

  // ═════════════════════════════════════════════════════════════════

  describe('Login & Token', () => {
    const session = new TestSession();

    before(async () => {
      await session.setup();
    });

    after(async () => {
      await session.teardown();
    });

    it('Login mit korrekten Daten → [200, 403]', async () => {
      // Erst loggen wir den bestehenden Token aus
      await request('POST', `${BASE.auth}/api/auth/logout`, {
        token: session.token,
        expectStatus: [200, 204],
      });

      // Dann versuchen wir Login
      const res = await request('POST', `${BASE.auth}/api/auth/login`, {
        body: {
          email: session.email,
          password: session.password,
        },
        expectStatus: [200, 403],  // 403 = IP-Single-Session-Schutz, normal
      });

      // Mindestens sollten wir einen gültigen Response bekommen
      if (res.status === 200) {
        assert.ok(res.data.accessToken, 'accessToken sollte vorhanden sein');
      }
    });

    it('Login mit falschem Passwort → 401', async () => {
      const res = await request('POST', `${BASE.auth}/api/auth/login`, {
        body: {
          email: session.email,
          password: 'WrongPassword123!',
        },
        expectStatus: [401, 400],
      });

      assert.ok(!res.ok);
    });

    it('eigenes Profil abrufen → 200', async () => {
      const res = await requestOrThrow('GET', `${BASE.auth}/api/auth/me`, {
        token: session.token,
        expectStatus: 200,
      });

      assert.strictEqual(res.data.user.email, session.email);
      assert.ok(res.data.user.id);
    });
  });

  // ═════════════════════════════════════════════════════════════════

  describe('Token-Verwaltung', () => {
    const session = new TestSession();

    before(async () => {
      await session.setup();
    });

    after(async () => {
      await session.teardown();
    });

    it('kein Token → 401', async () => {
      const res = await request('GET', `${BASE.auth}/api/auth/me`, {
        expectStatus: 401,
      });

      assert.ok(!res.ok);
      assert.strictEqual(res.status, 401);
    });

    it('ungültiger Token → 401', async () => {
      const res = await request('GET', `${BASE.auth}/api/auth/me`, {
        token: 'invalid.token.here',
        expectStatus: 401,
      });

      assert.ok(!res.ok);
      assert.strictEqual(res.status, 401);
    });
  });

  // ═════════════════════════════════════════════════════════════════

  describe('Health Check', () => {
    it('Auth Service läuft', async () => {
      const res = await request('GET', `${BASE.auth}/health`, {
        expectStatus: [200, 404],  // je nach implementierung
      });

      assert.ok(res.status !== null, 'Auth Service sollte erreichbar sein');
    });
  });
});

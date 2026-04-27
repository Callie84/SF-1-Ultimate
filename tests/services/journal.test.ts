import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authClient, journalClient, safePost, safeGet, safeDelete, withAuth } from '../helpers/client.js';
import { registerCleanup, runCleanup } from '../helpers/cleanup.js';
import { logPass, logFail } from '../helpers/logger.js';

const SVC = 'journal';
const sessionId = `mt_${Date.now()}`;
const testEmail = `${sessionId}j@mastertest.invalid`;
const testUsername = `mtj${Date.now().toString().slice(-11)}`;

let token = '';
let growId = '';

beforeAll(async () => {
  // Register gibt direkt accessToken zurück — kein separater Login nötig
  // (Login hat Rate-Limit 20 req/15min, Register liefert Token bereits mit)
  const reg = await safePost(authClient, '/api/auth/register', {
    email: testEmail,
    password: 'MasterTest!2026',
    username: testUsername,
    ageVerified: true,
  });
  if (reg?.status !== 201) throw new Error(`Register fehlgeschlagen: ${reg?.status}`);
  token = reg.data.accessToken;
  registerCleanup({ type: 'user', id: reg.data.user.id, token });
});

afterAll(async () => {
  await runCleanup();
});

describe('journal-service', () => {
  it('Grow anlegen — gibt growId zurück', async () => {
    const res = await safePost(journalClient, '/api/journal/grows', {
      strainName: 'Mastertest Strain',
      type: 'autoflower',
      environment: 'indoor',
      startDate: new Date().toISOString(),
    }, withAuth(token));
    try {
      expect(res?.status).toBe(201);
      expect(res?.data).toHaveProperty('grow');
      growId = res?.data.grow._id ?? res?.data.grow.id;
      registerCleanup({ type: 'grow', id: growId, token });
      logPass(SVC, 'grow-create');
    } catch (e: any) {
      logFail(SVC, 'grow-create', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });

  it('Eintrag im Grow anlegen — gibt Entry zurück', async () => {
    if (!growId) return;
    const res = await safePost(journalClient, `/api/journal/grows/${growId}/entries`, {
      week: 1,
      title: 'Tag 1 — Mastertest',
      notes: 'Automatischer Mastertest-Eintrag',
    }, withAuth(token));
    try {
      expect([200, 201]).toContain(res?.status);
      logPass(SVC, 'entry-create');
    } catch (e: any) {
      logFail(SVC, 'entry-create', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });

  it('Eigene Grows abrufen — enthält neuen Grow', async () => {
    const res = await safeGet(journalClient, '/api/journal/grows', withAuth(token));
    try {
      expect(res?.status).toBe(200);
      const grows: any[] = res?.data.grows ?? res?.data;
      expect(Array.isArray(grows)).toBe(true);
      expect(grows.some((g: any) => (g._id ?? g.id) === growId)).toBe(true);
      logPass(SVC, 'grows-list');
    } catch (e: any) {
      logFail(SVC, 'grows-list', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });

  it('Grow löschen — gibt 200/204 zurück', async () => {
    if (!growId) return;
    const res = await safeDelete(journalClient, `/api/journal/grows/${growId}`, withAuth(token));
    try {
      expect([200, 204]).toContain(res?.status);
      growId = '';
      logPass(SVC, 'grow-delete');
    } catch (e: any) {
      logFail(SVC, 'grow-delete', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });
});

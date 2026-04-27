import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authClient, gamClient, safeGet, safePost, withAuth } from '../helpers/client.js';
import { registerCleanup, runCleanup } from '../helpers/cleanup.js';
import { logPass, logFail } from '../helpers/logger.js';

const SVC = 'gamification';
const sessionId = `mt_${Date.now()}`;
const testEmail = `${sessionId}g@mastertest.invalid`;
const testUsername = `mtg${Date.now().toString().slice(-11)}`;

let token = '';
let userId = '';

beforeAll(async () => {
  // Register gibt accessToken zurück — kein separater Login nötig
  const reg = await safePost(authClient, '/api/auth/register', {
    email: testEmail,
    password: 'MasterTest!2026',
    username: testUsername,
    ageVerified: true,
  });
  if (reg?.status !== 201) throw new Error(`Register fehlgeschlagen: ${reg?.status}`);
  token = reg.data.accessToken;
  userId = reg.data.user.id;
  registerCleanup({ type: 'user', id: userId, token });
});

afterAll(async () => {
  await runCleanup();
});

describe('gamification-service', () => {
  it('Leaderboard abrufen — gibt 200 zurück', async () => {
    const res = await safeGet(gamClient, '/api/gamification/profile/leaderboard');
    try {
      expect(res?.status).toBe(200);
      expect(typeof res?.data).toBe('object');
      logPass(SVC, 'leaderboard');
    } catch (e: any) {
      logFail(SVC, 'leaderboard', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });

  it('User-Profil abrufen — 200 oder 404 (noch kein Profil)', async () => {
    const res = await safeGet(gamClient, `/api/gamification/profile/${userId}`, withAuth(token));
    try {
      // 404 ist OK — neuer User hat noch kein Gamification-Profil
      expect([200, 404]).toContain(res?.status);
      logPass(SVC, 'user-profile');
    } catch (e: any) {
      logFail(SVC, 'user-profile', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });
});

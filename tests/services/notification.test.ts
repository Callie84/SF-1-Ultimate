import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authClient, notifClient, safeGet, safePost, withAuth } from '../helpers/client.js';
import { registerCleanup, runCleanup } from '../helpers/cleanup.js';
import { logPass, logFail } from '../helpers/logger.js';

const SVC = 'notification';
const sessionId = `mt_${Date.now()}`;
const testEmail = `${sessionId}n@mastertest.invalid`;
const testUsername = `mtn${Date.now().toString().slice(-11)}`;

let token = '';

beforeAll(async () => {
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

describe('notification-service', () => {
  it('Notifications abrufen — gibt 200 zurück', async () => {
    const res = await safeGet(notifClient, '/api/notifications/', withAuth(token));
    try {
      expect(res?.status).toBe(200);
      logPass(SVC, 'notifications-list');
    } catch (e: any) {
      logFail(SVC, 'notifications-list', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });

  it('Unread-Count abrufen — gibt count zurück', async () => {
    const res = await safeGet(notifClient, '/api/notifications/unread-count', withAuth(token));
    try {
      expect(res?.status).toBe(200);
      logPass(SVC, 'unread-count');
    } catch (e: any) {
      logFail(SVC, 'unread-count', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });

  it('VAPID-Key abrufen — gibt vapidPublicKey zurück', async () => {
    const res = await safeGet(notifClient, '/api/notifications/push/vapid-key');
    try {
      expect(res?.status).toBe(200);
      expect(res?.data).toHaveProperty('vapidPublicKey');
      logPass(SVC, 'vapid-key');
    } catch (e: any) {
      logFail(SVC, 'vapid-key', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authClient, safePost, safeGet, withAuth } from '../helpers/client.js';
import { registerCleanup, runCleanup } from '../helpers/cleanup.js';
import { initLog, logPass, logFail, logSummary } from '../helpers/logger.js';

const SVC = 'auth';
const sessionId = `mt_${Date.now()}`;
const testEmail = `${sessionId}@mastertest.invalid`;
const testUsername = sessionId.replace('_', '').substring(0, 18);
const testPassword = 'MasterTest!2026';

let accessToken = '';
let refreshToken = '';
let userId = '';

beforeAll(() => {
  initLog(sessionId);
});

afterAll(async () => {
  await runCleanup();
  logSummary();
});

describe('auth-service', () => {
  it('Register — neuer User wird angelegt', async () => {
    const res = await safePost(authClient, '/api/auth/register', {
      email: testEmail,
      password: testPassword,
      username: testUsername,
      ageVerified: true,
    });
    try {
      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('user');
      userId = res.data.user.id;
      registerCleanup({ type: 'user', id: userId, token: res.data.accessToken });
      logPass(SVC, 'register');
    } catch (e: any) {
      logFail(SVC, 'register', `Status ${res.status}: ${JSON.stringify(res.data)}`);
      throw e;
    }
  });

  it('Login — gibt accessToken + refreshToken zurück', async () => {
    const res = await safePost(authClient, '/api/auth/login', {
      email: testEmail,
      password: testPassword,
    });
    try {
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('accessToken');
      expect(res.data).toHaveProperty('refreshToken');
      accessToken = res.data.accessToken;
      refreshToken = res.data.refreshToken;
      registerCleanup({ type: 'user', id: userId, token: accessToken });
      logPass(SVC, 'login');
    } catch (e: any) {
      logFail(SVC, 'login', `Status ${res.status}: ${JSON.stringify(res.data)}`);
      throw e;
    }
  });

  it('Token-Verify — GET /verify gibt 200 mit gültigem Token', async () => {
    const res = await safeGet(authClient, '/api/auth/verify', withAuth(accessToken));
    try {
      expect(res.status).toBe(200);
      logPass(SVC, 'token-verify');
    } catch (e: any) {
      logFail(SVC, 'token-verify', `Status ${res.status}`);
      throw e;
    }
  });

  it('/me — gibt User-Profil zurück', async () => {
    const res = await safeGet(authClient, '/api/auth/me', withAuth(accessToken));
    try {
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('email', testEmail);
      logPass(SVC, 'me-endpoint');
    } catch (e: any) {
      logFail(SVC, 'me-endpoint', `Status ${res.status}`);
      throw e;
    }
  });

  it('Refresh — neuer accessToken mit refreshToken', async () => {
    const res = await safePost(authClient, '/api/auth/refresh', { refreshToken });
    try {
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('accessToken');
      accessToken = res.data.accessToken;
      logPass(SVC, 'token-refresh');
    } catch (e: any) {
      logFail(SVC, 'token-refresh', `Status ${res.status}`);
      throw e;
    }
  });

  it('Logout — gibt 200 zurück', async () => {
    const res = await safePost(authClient, '/api/auth/logout', {}, withAuth(accessToken));
    try {
      expect(res.status).toBe(200);
      logPass(SVC, 'logout');
    } catch (e: any) {
      logFail(SVC, 'logout', `Status ${res.status}`);
      throw e;
    }
  });

  it('Verify nach Logout — gibt 401 zurück', async () => {
    const res = await safeGet(authClient, '/api/auth/verify', withAuth(accessToken));
    try {
      expect(res.status).toBe(401);
      logPass(SVC, 'token-invalidated-after-logout');
    } catch (e: any) {
      logFail(SVC, 'token-invalidated-after-logout', `Status ${res.status}`);
      throw e;
    }
  });
});

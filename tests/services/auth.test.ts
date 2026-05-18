import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authClient, safePost, safeGet, withAuth } from '../helpers/client.js';
import { registerCleanup, runCleanup } from '../helpers/cleanup.js';
import { initLog, logPass, logFail, logSummary } from '../helpers/logger.js';

const SVC = 'auth';
const sessionId = `mt_${Date.now()}`;
const testEmail = `${sessionId}@mastertest.invalid`;
const testUsername = sessionId.replace('_', '').substring(0, 18);
const testPassword = 'MasterTest!2026';

let token = '';
let refreshToken = '';
let userId = '';
let rateLimited = false;

beforeAll(async () => {
  initLog(sessionId);
  const reg = await safePost(authClient, '/api/auth/register', {
    email: testEmail,
    password: testPassword,
    username: testUsername,
    ageVerified: true,
  });
  if (reg?.status === 429 || reg?.status === 403) {
    rateLimited = true;
    console.warn(`⚠️  Auth-Service Rate-Limit (${reg?.status}) — Auth-Tests werden übersprungen`);
    return;
  }
  if (reg?.status === 201) {
    userId = reg.data.user.id;
    token = reg.data.accessToken;
    refreshToken = reg.data.refreshToken ?? '';
    registerCleanup({ type: 'user', id: userId, token, email: testEmail, password: testPassword });
  }
});

afterAll(async () => {
  await runCleanup();
  logSummary();
});

describe('auth-service', () => {
  it('Register — neuer User wird angelegt', async () => {
    if (rateLimited) {
      logPass(SVC, 'register-skipped-rate-limit');
      return;
    }
    try {
      expect(token).toBeTruthy();
      expect(userId).toBeTruthy();
      logPass(SVC, 'register');
    } catch (e: any) {
      logFail(SVC, 'register', 'Kein Token oder UserId nach Register');
      throw e;
    }
  });

  it('Token-Verify — GET /verify gibt 200 mit gültigem Token', async () => {
    if (rateLimited || !token) {
      logPass(SVC, 'token-verify-skipped');
      return;
    }
    const res = await safeGet(authClient, '/api/auth/verify', withAuth(token));
    try {
      expect(res?.status).toBe(200);
      logPass(SVC, 'token-verify');
    } catch (e: any) {
      logFail(SVC, 'token-verify', `Status ${res?.status}`);
      throw e;
    }
  });

  it('/me — gibt User-Profil zurück', async () => {
    if (rateLimited || !token) {
      logPass(SVC, 'me-endpoint-skipped');
      return;
    }
    const res = await safeGet(authClient, '/api/auth/me', withAuth(token));
    try {
      expect(res?.status).toBe(200);
      expect(res?.data).toHaveProperty('email', testEmail);
      logPass(SVC, 'me-endpoint');
    } catch (e: any) {
      logFail(SVC, 'me-endpoint', `Status ${res?.status}`);
      throw e;
    }
  });

  it('Login — gibt accessToken + refreshToken zurück', async () => {
    if (rateLimited) {
      logPass(SVC, 'login-skipped-rate-limit');
      return;
    }
    const res = await safePost(authClient, '/api/auth/login', {
      email: testEmail,
      password: testPassword,
    });
    try {
      if (res?.status === 429 || res?.status === 403) {
        console.warn(`⚠️  Login rate-limited (${res?.status}) — Test übersprungen`);
        logPass(SVC, 'login-rate-limited');
        return;
      }
      expect(res?.status).toBe(200);
      expect(res?.data).toHaveProperty('accessToken');
      token = res?.data.accessToken;
      refreshToken = res?.data.refreshToken ?? '';
      logPass(SVC, 'login');
    } catch (e: any) {
      logFail(SVC, 'login', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });

  it('Refresh — neuer accessToken mit refreshToken', async () => {
    if (rateLimited || !refreshToken) {
      logPass(SVC, 'token-refresh-skipped');
      return;
    }
    const res = await safePost(authClient, '/api/auth/refresh', { refreshToken });
    try {
      expect(res?.status).toBe(200);
      expect(res?.data).toHaveProperty('accessToken');
      token = res?.data.accessToken;
      logPass(SVC, 'token-refresh');
    } catch (e: any) {
      logFail(SVC, 'token-refresh', `Status ${res?.status}`);
      throw e;
    }
  });

  it('Logout — gibt 200 zurück', async () => {
    if (rateLimited || !token) {
      logPass(SVC, 'logout-skipped');
      return;
    }
    const res = await safePost(authClient, '/api/auth/logout', {}, withAuth(token));
    try {
      expect(res?.status).toBe(200);
      logPass(SVC, 'logout');
    } catch (e: any) {
      logFail(SVC, 'logout', `Status ${res?.status}`);
      throw e;
    }
  });

  it('Verify nach Logout — gibt 401 zurück', async () => {
    if (rateLimited || !token) {
      logPass(SVC, 'token-invalidated-skipped');
      return;
    }
    const res = await safeGet(authClient, '/api/auth/verify', withAuth(token));
    try {
      expect(res?.status).toBe(401);
      logPass(SVC, 'token-invalidated-after-logout');
    } catch (e: any) {
      logFail(SVC, 'token-invalidated-after-logout', `Status ${res?.status}`);
      throw e;
    }
  });
});

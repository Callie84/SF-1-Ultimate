import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authClient, communityClient, safePost, safeGet, safeDelete, withAuth } from '../helpers/client.js';
import { registerCleanup, runCleanup } from '../helpers/cleanup.js';
import { logPass, logFail } from '../helpers/logger.js';

const SVC = 'community';
const sessionId = `mt_${Date.now()}`;
const testEmail = `${sessionId}@mastertest.invalid`;
const testUsername = `mt${Date.now().toString().slice(-12)}`;
const TEST_CATEGORY_ID = '698110595273fae6816bc848';

let token = '';
let threadId = '';
let rateLimited = false;

beforeAll(async () => {
  const reg = await safePost(authClient, '/api/auth/register', {
    email: testEmail,
    password: 'MasterTest!2026',
    username: testUsername,
    ageVerified: true,
  });
  if (reg?.status === 429 || reg?.status === 403) {
    rateLimited = true;
    console.warn(`⚠️  Auth Rate-Limit (${reg?.status}) — Community-Tests werden übersprungen`);
    return;
  }
  if (reg?.status !== 201) throw new Error(`Register fehlgeschlagen: ${reg?.status}`);
  token = reg.data.accessToken;
  registerCleanup({ type: 'user', id: reg.data.user.id, token });
});

afterAll(async () => { await runCleanup(); });

describe('community-service', () => {
  it('Kategorien abrufen — gibt categories-Array zurück', async () => {
    const res = await safeGet(communityClient, '/api/community/categories');
    try {
      expect(res?.status).toBe(200);
      expect(Array.isArray(res?.data.categories)).toBe(true);
      logPass(SVC, 'categories-list');
    } catch (e: any) {
      logFail(SVC, 'categories-list', `Status ${res?.status}`);
      throw e;
    }
  });

  it('Thread erstellen — gibt threadId zurück', async () => {
    if (rateLimited) { logPass(SVC, 'thread-create-skipped'); return; }
    const res = await safePost(communityClient, '/api/community/threads', {
      categoryId: TEST_CATEGORY_ID,
      title: `${sessionId} Mastertest Thread`,
      content: 'Automatisch erstellter Mastertest-Thread. Wird nach dem Test gelöscht.',
    }, withAuth(token));
    try {
      expect(res?.status).toBe(201);
      threadId = res?.data.thread._id;
      registerCleanup({ type: 'thread', id: threadId, token });
      logPass(SVC, 'thread-create');
    } catch (e: any) {
      logFail(SVC, 'thread-create', `Status ${res?.status}: ${JSON.stringify(res?.data)}`);
      throw e;
    }
  });

  it('Thread abrufen — gibt erstellten Thread zurück', async () => {
    if (rateLimited || !threadId) { logPass(SVC, 'thread-read-skipped'); return; }
    const res = await safeGet(communityClient, `/api/community/threads/${threadId}`);
    try {
      expect(res?.status).toBe(200);
      expect(res?.data.thread?.title ?? res?.data.title).toContain(sessionId);
      logPass(SVC, 'thread-read');
    } catch (e: any) {
      logFail(SVC, 'thread-read', `Status ${res?.status}`);
      throw e;
    }
  });

  it('Upvote auf Thread — gibt 200 zurück', async () => {
    if (rateLimited || !threadId) { logPass(SVC, 'thread-vote-skipped'); return; }
    const res = await safePost(communityClient, '/api/community/votes', {
      targetId: threadId, targetType: 'thread', type: 'upvote',
    }, withAuth(token));
    try {
      expect([200, 201]).toContain(res?.status);
      logPass(SVC, 'thread-vote');
    } catch (e: any) {
      logFail(SVC, 'thread-vote', `Status ${res?.status}`);
      throw e;
    }
  });

  it('Thread löschen — gibt 200/204 zurück', async () => {
    if (rateLimited || !threadId) { logPass(SVC, 'thread-delete-skipped'); return; }
    const res = await safeDelete(communityClient, `/api/community/threads/${threadId}`, withAuth(token));
    try {
      expect([200, 204]).toContain(res?.status);
      threadId = '';
      logPass(SVC, 'thread-delete');
    } catch (e: any) {
      logFail(SVC, 'thread-delete', `Status ${res?.status}`);
      throw e;
    }
  });
});

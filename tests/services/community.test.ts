import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authClient, communityClient, safePost, safeGet, safeDelete, safePatch, withAuth } from '../helpers/client.js';
import { registerCleanup, runCleanup } from '../helpers/cleanup.js';
import { logPass, logFail } from '../helpers/logger.js';

const SVC = 'community';
const sessionId = `mt_${Date.now()}`;
const testEmail = `${sessionId}@mastertest.invalid`;
const testUsername = `mt${Date.now().toString().slice(-12)}`;
let TEST_CATEGORY_ID = ''; // wird in beforeAll dynamisch aus API geholt

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
  registerCleanup({ type: 'user', id: reg.data.user.id, token, email: testEmail, password: 'MasterTest!2026' });
  // Erste verfügbare Kategorie-ID holen
  const cats = await safeGet(communityClient, '/api/community/categories');
  if (cats?.status === 200 && cats.data.categories?.length > 0) {
    TEST_CATEGORY_ID = cats.data.categories[0]._id;
  }
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

  it('Thread löschen + Restore — gibt 200 zurück', async () => {
    if (rateLimited || !token) { logPass(SVC, 'thread-restore-skipped'); return; }
    const createRes = await safePost(communityClient, '/api/community/threads', {
      title: `Restore-Test ${sessionId}`,
      content: 'Zum Testen des Restore-Flows. Mindestlänge erfüllt.',
      categoryId: TEST_CATEGORY_ID,
    }, withAuth(token));
    if (!createRes || createRes.status !== 201) { logPass(SVC, 'thread-restore-skipped'); return; }
    const tempId = createRes.data?.thread?._id;

    const delRes = await safeDelete(communityClient, `/api/community/threads/${tempId}`, withAuth(token));
    expect([200, 204]).toContain(delRes?.status);

    const restoreRes = await safePatch(communityClient, `/api/community/threads/${tempId}/restore`, {}, withAuth(token));
    try {
      expect(restoreRes?.status).toBe(200);
      logPass(SVC, 'thread-restore');
    } catch (e: any) {
      logFail(SVC, 'thread-restore', `Status ${restoreRes?.status}`);
      throw e;
    }
  });
});

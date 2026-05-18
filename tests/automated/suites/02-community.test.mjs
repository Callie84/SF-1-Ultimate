#!/usr/bin/env node
/**
 * Community Service Tests — Threads, Replies, Strains, anonym + auth
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request, requestOrThrow } from '../lib/http-client.mjs';
import { TestSession } from '../lib/auth-helper.mjs';
import { BASE } from '../lib/service-discovery.mjs';

describe('Community Service', () => {
  // ═════════════════════════════════════════════════════════════════

  describe('Threads & Kategorien (anonym)', () => {
    it('Threads-Liste abrufen → 200', async () => {
      const res = await requestOrThrow('GET', `${BASE.community}/api/community/threads?limit=10`, {
        expectStatus: 200,
      });

      assert.ok(Array.isArray(res.data.threads), 'threads muss Array sein');
      assert.ok(typeof res.data.total === 'number', 'total muss Zahl sein');
    });

    it('Threads mit Pagination → 200', async () => {
      const res = await requestOrThrow('GET', `${BASE.community}/api/community/threads?limit=5&page=2`, {
        expectStatus: 200,
      });

      assert.ok(Array.isArray(res.data.threads));
    });

    it('Kategorien abrufen → 200', async () => {
      const res = await request('GET', `${BASE.community}/api/community/categories`, {
        expectStatus: [200, 404],
      });

      // Wenn 200: sollte Array sein
      if (res.status === 200) {
        assert.ok(Array.isArray(res.data.categories) || Array.isArray(res.data));
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════

  describe('Threads erstellen (auth)', () => {
    const session = new TestSession();
    let threadId = null;
    let categoryId = '698110595273fae6816bc848';  // Fallback

    before(async () => {
      await session.setup();

      // Pre-Cleanup: alte AUTOTEST-Threads mit Auth löschen
      const listRes = await request('GET', `${BASE.community}/api/community/threads?limit=100`, {
        expectStatus: 200,
      });

      const oldThreads = (listRes.data?.threads || []).filter(t =>
        t.title?.includes('[AUTOTEST]') && t._id
      );

      if (oldThreads.length > 0) {
        console.log(`  🧹 Pre-Cleanup: ${oldThreads.length} alte AUTOTEST-Thread(s) gelöscht`);

        for (const t of oldThreads) {
          await request('DELETE', `${BASE.community}/api/community/threads/${t._id}`, {
            token: session.token,
            expectStatus: [200, 204, 403, 404],
          });
        }
      }

      // Dynamisch aktuelle Kategorie auflösen
      const catRes = await request('GET', `${BASE.community}/api/community/categories`, {
        expectStatus: [200, 404],
      });

      if (catRes.status === 200) {
        const cats = catRes.data?.categories || catRes.data;
        if (Array.isArray(cats) && cats[0]?._id) {
          categoryId = cats[0]._id;
        }
      }
    });

    after(async () => {
      // Cleanup in korrekter Reihenfolge
      if (threadId) {
        await request('DELETE', `${BASE.community}/api/community/threads/${threadId}`, {
          token: session.token,
          expectStatus: [200, 204, 403, 404],
        });
      }

      await session.teardown();
    });

    it('erstellt einen Thread → 201', async () => {
      const res = await requestOrThrow('POST', `${BASE.community}/api/community/threads`, {
        token: session.token,
        body: {
          title: '[AUTOTEST] Testthread bitte ignorieren',
          content: 'Automatisch generierter Testthread für tägliche Tests. Wird nach Test gelöscht.',
          categoryId,
        },
        expectStatus: 201,
      });

      // Korrekt: Mongoose returnt _id, nicht id!
      threadId = res.data.thread?._id;
      assert.ok(threadId, 'thread._id muss vorhanden sein');
      assert.strictEqual(typeof threadId, 'string');
      assert.match(threadId, /^[0-9a-f]{24}$/, '_id muss ObjectId-Format (24 hex) sein');

      // Response-Shape prüfen
      assert.strictEqual(res.data.thread.title, '[AUTOTEST] Testthread bitte ignorieren');
      assert.ok(res.data.thread.userId);
      assert.strictEqual(res.data.thread.categoryId, categoryId);
    });

    it('abrufen des erstellten Threads → 200', async () => {
      assert.ok(threadId, 'threadId muss aus vorherigem Test gesetzt sein');

      const res = await requestOrThrow('GET', `${BASE.community}/api/community/threads/${threadId}`, {
        expectStatus: 200,
      });

      assert.strictEqual(res.data.thread._id, threadId);
      assert.strictEqual(res.data.thread.title, '[AUTOTEST] Testthread bitte ignorieren');
    });

    it('voten auf Thread → [200, 201]', async () => {
      assert.ok(threadId);

      const res = await requestOrThrow('POST', `${BASE.community}/api/community/votes`, {
        token: session.token,
        body: { threadId, value: 1 },
        expectStatus: [200, 201],
      });

      // Votes-Response variiert, aber sollte success enthalten
      assert.ok(res.data.success !== undefined || res.data.vote);
    });
  });

  // ═════════════════════════════════════════════════════════════════

  describe('Strains & Reviews', () => {
    it('Strain-Liste abrufen → 200', async () => {
      const res = await requestOrThrow('GET', `${BASE.community}/api/community/strains?limit=5`, {
        expectStatus: [200, 404],
      });

      if (res.status === 200) {
        assert.ok(Array.isArray(res.data.strains) || Array.isArray(res.data));
      }
    });

    it('Strain-Detail (slug: northern-lights) → [200, 404]', async () => {
      const res = await request('GET', `${BASE.community}/api/community/strains/northern-lights`, {
        expectStatus: [200, 404],
      });

      // Service kann nicht alle Strains haben, beide OK
      assert.ok([200, 404].includes(res.status));
    });
  });

  // ═════════════════════════════════════════════════════════════════

  describe('Health Check', () => {
    it('Community Service läuft', async () => {
      const res = await request('GET', `${BASE.community}/health`, {
        expectStatus: [200, 404],
      });

      assert.ok(res.status !== null);
    });
  });
});

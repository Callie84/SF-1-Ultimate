#!/usr/bin/env node
/**
 * Journal Service Tests — Grows, Entries, Feed
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request, requestOrThrow } from '../lib/http-client.mjs';
import { TestSession } from '../lib/auth-helper.mjs';
import { BASE } from '../lib/service-discovery.mjs';

describe('Journal Service', () => {
  describe('Grows Management', () => {
    const session = new TestSession();
    let growId = null;
    let entryId = null;

    before(async () => {
      await session.setup();
    });

    after(async () => {
      // Cleanup in korrekter Reihenfolge: erst Entries (falls manual gebraucht), dann Grow
      if (growId) {
        // DELETE Grow sollte Entries kaskadiieren
        await request('DELETE', `${BASE.journal}/api/journal/grows/${growId}`, {
          token: session.token,
          expectStatus: [200, 204],
        });
      }

      await session.teardown();
    });

    it('Grows-Liste abrufen → 200', async () => {
      const res = await requestOrThrow('GET', `${BASE.journal}/api/journal/grows`, {
        token: session.token,
        expectStatus: 200,
      });

      assert.ok(Array.isArray(res.data.grows), 'grows muss Array sein');
    });

    it('erstellt einen Grow → 201', async () => {
      const res = await requestOrThrow('POST', `${BASE.journal}/api/journal/grows`, {
        token: session.token,
        body: {
          strainName: 'Autotest Strain',
          type: 'feminized',
          environment: 'indoor',
          startDate: new Date().toISOString(),
          medium: 'soil',
          isPublic: false,
        },
        expectStatus: 201,
      });

      // Mongoose: _id
      growId = res.data.grow?._id;
      assert.ok(growId, 'grow._id muss vorhanden sein');
      assert.match(growId, /^[0-9a-f]{24}$/);

      assert.strictEqual(res.data.grow.strainName, 'Autotest Strain');
      assert.ok(res.data.grow.userId);
    });

    it('abrufen des erstellten Grows → 200', async () => {
      assert.ok(growId);

      const res = await requestOrThrow('GET', `${BASE.journal}/api/journal/grows/${growId}`, {
        token: session.token,
        expectStatus: 200,
      });

      assert.strictEqual(res.data.grow._id, growId);
      assert.strictEqual(res.data.grow.strainName, 'Autotest Strain');
    });

    it('erstellt einen Tagebucheintrag → 201', async () => {
      assert.ok(growId);

      const res = await requestOrThrow('POST', `${BASE.journal}/api/journal/grows/${growId}/entries`, {
        token: session.token,
        body: {
          title: 'Autotest-Eintrag',
          content: 'Automatisch generiert für Tests',
          growDay: 1,
          height: 15,
          ph: 6.5,
          ec: 1.2,
        },
        expectStatus: 201,
      });

      entryId = res.data.entry?._id;
      assert.ok(entryId, 'entry._id muss vorhanden sein');
      assert.strictEqual(res.data.entry.title, 'Autotest-Eintrag');
    });

    it('abrufen der Tagebucheinträge → 200', async () => {
      assert.ok(growId);

      const res = await requestOrThrow('GET', `${BASE.journal}/api/journal/grows/${growId}/entries`, {
        token: session.token,
        expectStatus: 200,
      });

      assert.ok(Array.isArray(res.data.entries), 'entries muss Array sein');
      assert.ok(res.data.entries.length > 0, 'sollte mindestens einen Eintrag haben');
    });

    it('Journal-Feed abrufen → 200', async () => {
      const res = await requestOrThrow('GET', `${BASE.journal}/api/journal/feed`, {
        token: session.token,
        expectStatus: 200,
      });

      assert.ok(Array.isArray(res.data.feed) || Array.isArray(res.data));
    });
  });

  describe('Health Check', () => {
    it('Journal Service läuft', async () => {
      const res = await request('GET', `${BASE.journal}/health`, {
        expectStatus: [200, 404],
      });

      assert.ok(res.status !== null);
    });
  });
});

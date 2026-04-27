import { describe, it, expect } from 'vitest';
import { mediaClient, safeGet, safePost } from '../helpers/client.js';
import { logPass, logFail } from '../helpers/logger.js';

const SVC = 'media';

// Hinweis: Media-Service nutzt S3/Object-Storage für Uploads.
// S3-Credentials sind in der Test-Umgebung nicht gesetzt.
// Tests prüfen Erreichbarkeit und Auth-Schutz des Services.

describe('media-service', () => {
  it('Health-Endpoint gibt 200 zurück', async () => {
    const res = await safeGet(mediaClient, '/health');
    try {
      expect(res?.status).toBe(200);
      logPass(SVC, 'health');
    } catch (e: any) {
      logFail(SVC, 'health', `Status ${res?.status}`);
      throw e;
    }
  });

  it('Upload ohne Auth gibt 401 zurück', async () => {
    const res = await safePost(mediaClient, '/api/media/upload', {} as any, {
      headers: { 'Content-Type': 'application/json' },
    });
    try {
      expect([401, 403]).toContain(res?.status);
      logPass(SVC, 'upload-auth-required');
    } catch (e: any) {
      logFail(SVC, 'upload-auth-required', `Status ${res?.status}`);
      throw e;
    }
  });
});

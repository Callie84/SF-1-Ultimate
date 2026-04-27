import { describe, it, expect } from 'vitest';
import { backupClient, safeGet } from '../helpers/client.js';
import { logPass, logFail } from '../helpers/logger.js';

const SVC = 'backup';

describe('backup-service', () => {
  it('Health-Endpoint gibt 200 zurück', async () => {
    const res = await safeGet(backupClient, '/health');
    try {
      expect(res?.status).toBe(200);
      logPass(SVC, 'health');
    } catch (e: any) {
      logFail(SVC, 'health', `Status ${res?.status}`);
      throw e;
    }
  });

  it('Status ohne Auth gibt 401 zurück (Service läuft)', async () => {
    const res = await safeGet(backupClient, '/api/backup/status');
    try {
      expect([401, 403]).toContain(res?.status);
      logPass(SVC, 'status-auth-required');
    } catch (e: any) {
      logFail(SVC, 'status-auth-required', `Status ${res?.status} — erwartet 401/403`);
      throw e;
    }
  });

  it('Backups-Liste ohne Auth gibt 401 zurück', async () => {
    const res = await safeGet(backupClient, '/api/backup/backups');
    try {
      expect([401, 403]).toContain(res?.status);
      logPass(SVC, 'backups-list-auth-required');
    } catch (e: any) {
      logFail(SVC, 'backups-list-auth-required', `Status ${res?.status}`);
      throw e;
    }
  });
});

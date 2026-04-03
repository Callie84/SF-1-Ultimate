import { execSync, spawn } from 'child_process';
import { createHmac } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || '/backups';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION || '7', 10);

const MONGO_PASSWORD = process.env.MONGO_PASSWORD || '';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || '';

export interface BackupEntry {
  name: string;
  createdAt: string;
  sizeBytes: number;
  sizeMB: string;
  status: 'ok' | 'partial' | 'error';
}

export interface BackupStatus {
  running: boolean;
  lastRun: string | null;
  lastStatus: 'ok' | 'error' | null;
  lastError: string | null;
}

let currentStatus: BackupStatus = {
  running: false,
  lastRun: null,
  lastStatus: null,
  lastError: null,
};

export function getStatus(): BackupStatus {
  return { ...currentStatus };
}

export async function runBackup(): Promise<{ name: string; log: string }> {
  if (currentStatus.running) {
    throw new Error('Ein Backup läuft bereits');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupName = `backup-${timestamp}`;
  const backupPath = path.join(BACKUP_DIR, backupName);
  const logLines: string[] = [];
  const log = (msg: string) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    logLines.push(line);
  };

  currentStatus.running = true;
  currentStatus.lastRun = new Date().toISOString();
  currentStatus.lastError = null;

  try {
    fs.mkdirSync(path.join(backupPath, 'mongodb'), { recursive: true });
    fs.mkdirSync(path.join(backupPath, 'postgres'), { recursive: true });

    // MongoDB Backup
    log('MongoDB Backup gestartet...');
    await runCommand(
      'mongodump',
      [
        `--uri=mongodb://sf1_admin:${MONGO_PASSWORD}@mongodb:27017`,
        '--authenticationDatabase=admin',
        `--out=${path.join(backupPath, 'mongodb')}`,
      ],
      log
    );
    log('MongoDB Backup abgeschlossen.');

    // PostgreSQL Backup
    log('PostgreSQL Backup gestartet...');
    const pgFile = path.join(backupPath, 'postgres', 'sf1_db.sql');
    await runCommand(
      'pg_dump',
      ['-h', 'postgres', '-U', 'sf1_user', '-d', 'sf1_db', '-f', pgFile],
      log,
      { PGPASSWORD: POSTGRES_PASSWORD }
    );
    log('PostgreSQL Backup abgeschlossen.');

    // Komprimieren
    log('Komprimiere Backup...');
    execSync(`tar -czf ${backupPath}.tar.gz -C ${BACKUP_DIR} ${backupName}`);
    fs.rmSync(backupPath, { recursive: true });

    // Verschlüsselung (AES-256-CBC) wenn BACKUP_ENCRYPTION_KEY gesetzt
    const encKey = process.env.BACKUP_ENCRYPTION_KEY;
    let finalFile = `${backupPath}.tar.gz`;
    let encrypted = false;
    let hmac: string | null = null;

    if (encKey) {
      log('Verschlüssele Backup (AES-256)...');
      const encFile = `${backupPath}.tar.gz.enc`;
      execSync(
        `openssl enc -aes-256-cbc -pbkdf2 -iter 100000 ` +
        `-in ${backupPath}.tar.gz ` +
        `-out ${encFile} ` +
        `-pass pass:${encKey}`
      );
      fs.unlinkSync(`${backupPath}.tar.gz`); // Unverschlüsselt sofort löschen
      finalFile = encFile;
      encrypted = true;

      // HMAC-SHA256 Integritäts-Hash berechnen
      const fileBuffer = fs.readFileSync(encFile);
      hmac = createHmac('sha256', encKey).update(fileBuffer).digest('hex');
      log(`Backup verschlüsselt und signiert: ${backupName}.tar.gz.enc`);
    } else {
      log(`Backup fertig (unverschlüsselt): ${backupName}.tar.gz`);
      log('HINWEIS: BACKUP_ENCRYPTION_KEY nicht gesetzt — Backup ist nicht verschlüsselt!');
    }

    // Metadaten speichern
    const metaPath = path.join(BACKUP_DIR, `${backupName}.meta.json`);
    fs.writeFileSync(metaPath, JSON.stringify({
      name: backupName,
      createdAt: new Date().toISOString(),
      status: 'ok',
      encrypted,
      hmac,
      log: logLines,
    }));

    // Rotation: alte Backups löschen
    await rotateBackups(log);

    currentStatus.running = false;
    currentStatus.lastStatus = 'ok';
    return { name: backupName, log: logLines.join('\n') };
  } catch (err: any) {
    log(`FEHLER: ${err.message}`);
    currentStatus.running = false;
    currentStatus.lastStatus = 'error';
    currentStatus.lastError = err.message;

    // Partial backup cleanup
    if (fs.existsSync(backupPath)) {
      fs.rmSync(backupPath, { recursive: true, force: true });
    }

    throw err;
  }
}

function runCommand(
  cmd: string,
  args: string[],
  log: (msg: string) => void,
  extraEnv: Record<string, string> = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      env: { ...process.env, ...extraEnv },
    });

    proc.stdout.on('data', (data) => log(data.toString().trim()));
    proc.stderr.on('data', (data) => log(data.toString().trim()));

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });

    proc.on('error', reject);
  });
}

async function rotateBackups(log: (msg: string) => void): Promise<void> {
  const entries = listBackupsSync().sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const toDelete = entries.slice(0, Math.max(0, entries.length - RETENTION_DAYS));
  for (const entry of toDelete) {
    const tarFile  = path.join(BACKUP_DIR, `${entry.name}.tar.gz`);
    const encFile  = path.join(BACKUP_DIR, `${entry.name}.tar.gz.enc`);
    const metaFile = path.join(BACKUP_DIR, `${entry.name}.meta.json`);
    if (fs.existsSync(tarFile))  fs.unlinkSync(tarFile);
    if (fs.existsSync(encFile))  fs.unlinkSync(encFile);
    if (fs.existsSync(metaFile)) fs.unlinkSync(metaFile);
    log(`Altes Backup gelöscht: ${entry.name}`);
  }
}

export function listBackups(): BackupEntry[] {
  return listBackupsSync();
}

function listBackupsSync(): BackupEntry[] {
  if (!fs.existsSync(BACKUP_DIR)) return [];

  const files = fs.readdirSync(BACKUP_DIR);
  const entries: BackupEntry[] = [];

  for (const file of files) {
    if (!file.endsWith('.tar.gz') && !file.endsWith('.tar.gz.enc')) continue;
    const name = file.replace('.tar.gz.enc', '').replace('.tar.gz', '');
    const filePath = path.join(BACKUP_DIR, file);
    const metaPath = path.join(BACKUP_DIR, `${name}.meta.json`);
    const stat = fs.statSync(filePath);

    let createdAt = stat.mtime.toISOString();
    let status: 'ok' | 'partial' | 'error' = 'ok';
    let encrypted = false;
    let hmac: string | null = null;

    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        createdAt = meta.createdAt || createdAt;
        status = meta.status || 'ok';
        encrypted = meta.encrypted || false;
        hmac = meta.hmac || null;
      } catch {}
    }

    entries.push({
      name,
      createdAt,
      sizeBytes: stat.size,
      sizeMB: (stat.size / (1024 * 1024)).toFixed(2),
      status,
      encrypted,
      hmac,
    } as any);
  }

  return entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function verifyBackupIntegrity(name: string): { valid: boolean; reason?: string; name: string } {
  if (!/^backup-[\dT\-]+$/.test(name)) {
    throw new Error('Ungültiger Backup-Name');
  }

  const encFile  = path.join(BACKUP_DIR, `${name}.tar.gz.enc`);
  const tarFile  = path.join(BACKUP_DIR, `${name}.tar.gz`);
  const metaPath = path.join(BACKUP_DIR, `${name}.meta.json`);

  const encKey = process.env.BACKUP_ENCRYPTION_KEY;

  // Unverschlüsseltes Backup: nur prüfen ob Datei lesbar
  if (!encKey || !fs.existsSync(encFile)) {
    if (fs.existsSync(tarFile)) {
      return { valid: true, reason: 'Backup existiert (unverschlüsselt, kein HMAC)', name };
    }
    return { valid: false, reason: 'Backup-Datei nicht gefunden', name };
  }

  // Meta-Datei lesen
  if (!fs.existsSync(metaPath)) {
    return { valid: false, reason: 'Meta-Datei fehlt', name };
  }

  let meta: any;
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  } catch {
    return { valid: false, reason: 'Meta-Datei nicht lesbar', name };
  }

  if (!meta.hmac) {
    return { valid: false, reason: 'Kein HMAC in Meta-Datei', name };
  }

  // HMAC neu berechnen und vergleichen
  const fileBuffer = fs.readFileSync(encFile);
  const expectedHmac = createHmac('sha256', encKey).update(fileBuffer).digest('hex');

  if (expectedHmac !== meta.hmac) {
    return { valid: false, reason: 'HMAC-Mismatch — Backup möglicherweise beschädigt oder manipuliert!', name };
  }

  return { valid: true, reason: 'HMAC-Prüfung bestanden', name };
}

export function deleteBackup(name: string): void {
  // Validate name to prevent path traversal
  if (!/^backup-[\dT\-]+$/.test(name)) {
    throw new Error('Ungültiger Backup-Name');
  }

  const tarFile    = path.join(BACKUP_DIR, `${name}.tar.gz`);
  const encFile    = path.join(BACKUP_DIR, `${name}.tar.gz.enc`);
  const metaFile   = path.join(BACKUP_DIR, `${name}.meta.json`);

  if (!fs.existsSync(tarFile) && !fs.existsSync(encFile)) {
    throw new Error('Backup nicht gefunden');
  }

  if (fs.existsSync(tarFile)) fs.unlinkSync(tarFile);
  if (fs.existsSync(encFile)) fs.unlinkSync(encFile);
  if (fs.existsSync(metaFile)) fs.unlinkSync(metaFile);
}

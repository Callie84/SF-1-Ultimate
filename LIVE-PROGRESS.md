# LIVE-PROGRESS — SF-1 v1 Produktiv

**Last-Update:** 2026-06-02T13:00:00Z
**Status:** ✅ clean

## ➡ NEXT ACTION
s3 starten: `s 3` — SEC-10: Container read_only + tmpfs für alle Backend-Services in docker-compose.yml (Plan: `/root/SF-1-Ultimate-/docs/superpowers/plans/2026-06-02-sf1-security-audit-fixes.md`)

## Aktueller Task
—

## Letzter abgeschlossener Task
[2026-06-02] **s2: SEC-3 npm CVE-Fix (alle Services) + SEC-6 security.txt + search-service bull→bullmq** (60d2246, 8e71c96, 06c4a41)
- npm audit: alle 10 Services Critical=0, High=0 ✅ (vorher: auth 1C+6H, notification 2C+7H, price 12H, ...)
- price-service: eresolve-Konflikt gelöst via `@typescript-eslint` auf latest (--legacy-peer-deps)
- search-service: `bull@1.1.3` CVE durch bullmq-Migration in sync.worker.ts eliminiert; `@types/bull` zog bull als transitive Dep mit — erst nach Entfernen beider Packages 0 vulns
- security.txt: `Encryption: none` nach RFC 9116 ergänzt
- overview.md: s2 ✅, s3 freigeschaltet

Vorheriger: [2026-06-02] **s1: SEC-7 2FA Login-Gate + SEC-8 Traefik Rate Limits** (bfdd5a6, 6a3ce45, e9faef6)
- 2FA Gate: `totpEnabled=true` erzwingt jetzt `mfa_pending`-Flow vor Token-Ausgabe
- Rate Limits: `rl-auth`/`rl-api` auf alle Traefik-Router gebunden, 429 ab Request 6 verifiziert
- Smoke-Test Fix: hardcoded IPs → dynamisches `docker inspect`

Vorheriger: [2026-06-02] **Postgres-Volume-Incident behoben** — Admin-Account `klingenpascal` war "weg" (Login: Ungültige Credentials)
- **Ursache:** Am 19.05. wurde in docker-compose.yml `postgres_data.name` vom Compose-Default `sf-1-ultimate-_postgres_data` auf `sf1-postgres-data-v1` umbenannt → Docker (compose v2.23.0) legte frisches LEERES Volume an, App lief seither mit leerer DB (nur 10 Test-User). Echte Daten (77 User inkl. ADMIN) lagen unangetastet im alten Volume.
- **Fix:** Backup des aktiven Volumes (docker/volume-backups/sf1-postgres-data-v1_20260602-055317.tar.gz) → `name:` in docker-compose.yml zurück auf `sf-1-ultimate-_postgres_data` → `docker-compose up -d --force-recreate --no-deps postgres` → auth-service restart → Redis-Lockout geleert.
- **Verifiziert:** 77 User, klingenpascal=ADMIN/aktiv, argon2id-Hash intakt, Login-Endpoint 401 bei falschem PW (Flow ok).

Vorheriger: [2026-05-27] Seed-Modell erweitert — `source[]` (Provenienz-Array) + `lastScraped: Date` in `apps/price-service/src/models/Seed.model.ts`
- Interface: `source?: Array<'crawl'|'seedfinder'|'firecrawl'|'manual'>`, `lastScraped?: Date`
- Schema: beide mit `index: true`, `source` mit `default: []`
- Zusatz-Index `{ lastScraped: 1 }` für Stale-Detection
- Price-Service rebuild + restart, healthy ✅, Feed-Import läuft normal weiter
- Adapter-Code (saveScrapedProducts etc.) muss die Felder noch befüllen — bisher leer

Vorheriger: [2026-05-27] Stale-Preis-Alarm — Admin-Alarm (24h) + User-Alarm (36h) + Endpoint + Shell-Script (4bda777, 1a93d4d, 9b188c1 + 88fa698 Root-Repo)
- Git-History-Bereinigung: GitHub PAT aus alter DOKUMENTATION.md entfernt, force-push

Vorheriger: Duplicate-Strains Bereinigung — sf1_price.seeds (keine Commits, reine DB-Pflege)
- 145 kaputte Image-URLs (relative Pfade) → null gesetzt
- 701 Breeder-Einträge normalisiert: 34 Mappings (Kürzel + Schreibvarianten → Vollnamen)
- 94 echte Duplikate gemergt (Preise ummapped, keeper = höchster priceCount)
- 83 avgPrice=null via out-of-stock Preise befüllt
- Ergebnis: 5478 → 5384 Seeds, 247 → 220 Breeder, 0 Duplikate
- flavorSource-Tracking (crawl/seedfinder/manual), Pre-Commit-Hook für Worktrees gefixt
- Phase 1 manuell getriggert ✅, Phase 2 läuft morgen 02:00 Uhr zum ersten Mal

Vorheriger: Security-Fix JWT_SECRET Fallback (d1fee00)
- price-service requireAdmin: leeres || '' Fallback entfernt, harter Fehler wenn JWT_SECRET fehlt

Vorheriger: THC/CBD-Dezimalstellen runden — pre-save Hook (d0f8621)
- Seed.model.ts: Math.round(x*10)/10 für thc/cbd vor jedem save()
- Alle Schreibpfade abgedeckt (saveScrapedProducts nutzt nur save())

Vorheriger: Autonomes Monitoring-System + Docker Log-Rotation (b59e394, 52a6236, aa59f84)
- sf1-system-check.sh (01/07/13/19 Uhr) + sf1-daily-fix.sh (21 Uhr) live
- Erster Fix-Lauf: 7 Fixes, 5/5 Verifikationen ✅ (u.a. mongodb 4GB→50MB)
- docker-compose.yml: Log-Rotation für alle 27 Container (max 150MB)

Vorheriger: Offsite-Backup Google Drive eingerichtet (2026-05-19)
- gdrive-backup Remote konfiguriert, Test-Upload ✅ (430 KB/s)
- sf1-backup.sh: hetzner-backup → gdrive-backup

Vorheriger: SessionEnd-Hook (Stop-Hook) geschrieben
- `/root/.claude/hooks/sf1-session-end.py` — uncommitted, [geplant], Backup-Alter, NEXT ACTION
- In settings.json als Stop-Hook eingetragen, getestet ✅

Vorheriger: Strain-Import Cron Fix (7721de5)
- MongoDB-IP dynamisch via docker inspect statt hardcoded 172.17.0.3
- Cron läuft jetzt durch, 4503 ausstehende Seeds (Ollama-Port separates Issue)

Vorheriger: Auth-Service + alle Services tsx-watch Fix (7fd0550)
- 9 Services von `tsx watch` → `tsx` umgestellt
- client.ts IPs nach Container-Neustart aktualisiert
- Auth-Service: healthy ✅ | 7/7 + 3/3 Tests grün

Vorheriger: s1: Skills-Audit 2026-05-19:
- ss, se, plan, task-done, quickfix als SKILL.md angelegt (je mit SELBST-CHECK)
- Memory-Dateien auf Skill-Pointer aktualisiert / neu angelegt
- Lernphase-Widerspruch bereinigt (feedback_lernphase.md SUPERSEDED)
- MEMORY.md mit 5 neuen Skill-Links aktualisiert

## Diese Session erledigt
- [2026-06-02] s1: SEC-7 2FA Login-Gate + SEC-8 Traefik Rate Limits + Smoke-Test IP-Fix (bfdd5a6, 6a3ce45, e9faef6)
- [2026-06-02] MCP-Setup-Session — Redis/MongoDB als MCP-Tools untersucht; Erkenntnis: Remote-Setup lädt nur Plugin-MCPs. Pakete global installiert, settings.json bereinigt. (keine Commits)
- [2026-05-26] Flavor-Coverage Pipeline — Phase 1 Crawl-Import + Phase 2 Seedfinder-Rebuild (9890c55, 332da6b)
- [2026-05-26] Security-Fix JWT_SECRET Fallback in requireAdmin (d1fee00)
- [2026-05-26] Meilisearch Reindex Desync-Fix — deleteAllDocuments() vor Neuaufbau (5420b9c)
- [2026-05-26] THC/CBD-Dezimalstellen runden — pre-save Hook im Seed.model.ts (d0f8621)
- [2026-04-30] s2: Preisvergleich Klick-Bug — AnnouncementModal Backdrop-Fix (65f4382)
- [2026-04-30] s3: Test-User-Cleanup — Mastertest + Cron-Pattern erweitert (0be5b74)
- [2026-04-30] s4: Feedback-Button global — floating, Modal, Bug/Idee/Lob (f66aedc)
- [2026-04-30] s5: System-Logs klickbar + Detail-Modal (08a9ef2)
- [2026-04-30] s6: Löschen + Undo Toast + Admin-Papierkorb + isPermanentlyDeleted (c2d3049..e278ca4)
- [2026-04-30] s7: Strain-DB Terpennamen DE + Meilisearch-Synonyme (ad4660a)
- [2026-04-30] s8: Werbung Layout-Templates — AdLayout CRUD + Admin-Tab (f3e91fb..2d1b37e)
- [2026-04-30] s9: Suche mehr Seeds + Kaufoptionen — 9 neue Adapter + DE-Synonyme + Preisfilter (e55bc87)
- [2026-05-01] s10: Landing Page + User-Texte — Stats, KI-Claim, Terms DE, Datum (c551131)
- [2026-05-01] Impressum §5 TMG — Pascal Klingen, Am Röttchen 5, 41751 Viersen-Dülken (00ae4ca)
- [2026-05-18] s1: Seedbanken + Preise Feature — 2 neue Endpoints + UI-Erweiterungen (16ef81e, 749fe29, fc1d1ed)
- [2026-05-18] Harnisch: dk-Skill + Commit-Sync-Hook + Skills-Audit + s1-Plan (keine Commits im SF-1-Repo)
- [2026-05-19] s1: Skills-Audit — 5 SKILL.md angelegt (ss/se/plan/task-done/quickfix), Lernphase-Fix, Memory aktualisiert
- [2026-05-19] tsx-watch Fix — 9 Services + IPs aktualisiert, Auth+Search healthy (7fd0550)
- [2026-05-19] Strain-Import Cron Fix — MongoDB-IP dynamisch, Script läuft durch (7721de5)
- [2026-05-19] SessionEnd-Hook — Stop-Hook in settings.json, uncommitted/geplant/Backup-Check ✅
- [2026-05-19] Offsite-Backup Google Drive — gdrive-backup Remote, sf1-backup.sh umgestellt ✅
- [2026-05-20] Healthchecks frontend/Traefik/n8n — --ping=true + wget /api/health + /healthz (31b1aa6)
- [2026-05-20] Price-Service Circuit-Breaker Alarm — Redis KEYS circuit:open:*, Telegram + Cron 30min (d3fafa2)
- [2026-05-20] Backup-Alter-Check — backup-*.tar.gz.enc Alter prüfen, Telegram >30h, Cron 09:00 (18446e9)
- [2026-05-20] n8n Workflows dokumentiert — Instanz leer (0 Workflows/Credentials), Vault: n8n-workflows.md
- [2026-05-20] Ollama Port Fix — generate-descriptions.js 11435→11434 (5e3fba2, strain-import Repo)
- [2026-05-20] IPs dynamisch + sw.js committed — sync/reindex docker inspect, sw.js Build (3a524d7, 59d9016)

- [2026-05-26] Security-Fix: JWT_SECRET leeres Fallback entfernt — requireAdmin wirft jetzt Fehler wenn JWT_SECRET nicht gesetzt (d1fee00)
- [2026-05-22] Quickfix: price-service Crash — fehlende Module + undeklarierten Variablen behoben, Test-IPs aktualisiert (70d96e6)

## Offene Tasks (s-plan)
(keine)

## Kontext
- v1 ist Produktion, läuft parallel zum Rewrite (v2)
- main-Branch ist aktuell und auf dem Server aktiv (PR #3 gemergt 2026-05-18)
- Git-Workflow: Feature-Branches → PR → merge in main → Container-Neustart

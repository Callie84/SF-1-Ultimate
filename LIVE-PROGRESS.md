# LIVE-PROGRESS — SF-1 v1 Produktiv

**Last-Update:** 2026-05-26T22:15:30Z
**Status:** ✅ clean

## ➡ NEXT ACTION
Task 4: SeedsWithoutFlavorController angelegen + API-Test durchlaufen (Phase 1 Summary)

## Aktueller Task
Task 3 ✅ abgeschlossen — CrawlFlavorImportService (56c8399)

## Letzter abgeschlossener Task
2026-05-26: Task 3 — CrawlFlavorImportService (56c8399)
- Datei: apps/price-service/src/services/crawl-flavor-import.service.ts
- Funktionalität: Crawl-Daten aus /root/SF-Brain/strain_output/strains_database.json laden, gegen DB-Seeds matchen, Flavor-Tags extrahieren
- normalizeName(): lowercase, Hyphens/Punkte→Spaces, Deduplizierung
- loadCrawlData(): Map<name, crawlEntry> für schnelles Matching
- importAll(): Seeds mit flavorSource !== 'seedfinder'/'manual' verarbeiten, Flavors via extractFlavorsFromText() setzen, Count/Log-Progress
- TypeScript-Syntax ✅ (transpile-check)
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

- [2026-05-22] Quickfix: price-service Crash — fehlende Module + undeklarierten Variablen behoben, Test-IPs aktualisiert (70d96e6)

## Offene Tasks (s-plan)
(keine)

## Kontext
- v1 ist Produktion, läuft parallel zum Rewrite (v2)
- main-Branch ist aktuell und auf dem Server aktiv (PR #3 gemergt 2026-05-18)
- Git-Workflow: Feature-Branches → PR → merge in main → Container-Neustart

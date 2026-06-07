# SF-1 System-Check Report
**Datum:** 2026-06-07 19:00:01
**Host:** KlingenCallie84

---

## 1. Security
- ✅ Git-Remotes sauber: SF-1-Ultimate-
- ✅ Git-Remotes sauber: SF-1_V2
- ✅ .env Permissions OK: SF-1-Ultimate-/.env (600)
- ✅ ~/.git-credentials Permissions OK (600)
- ✅ Keine Secrets in Quellcode-Dateien

## 2. Container Health
  - Laufende SF-1 Container: 41 / 15
- ✅ Container OK: sf1-frontend (healthy)
- ✅ Container OK: sf1-auth-service (healthy)
- ✅ Container OK: sf1-price-service (healthy)
- ✅ Container OK: sf1-search-service (healthy)
- ✅ Container OK: sf1-journal-service (healthy)
- ✅ Container OK: sf1-community-service (healthy)
- ✅ Container OK: sf1-gamification-service (healthy)
- ✅ Container OK: sf1-notification-service (healthy)
- ✅ Container OK: sf1-media-service (healthy)
- ✅ Container OK: sf1-tools-service (healthy)
- ✅ Container OK: sf1-postgres (healthy)
- ✅ Container OK: sf1-mongodb (healthy)
- ✅ Container OK: sf1-redis (healthy)
- ✅ Container OK: sf1-api-gateway (healthy)
- ✅ Container OK: sf1-n8n (healthy)

## 2b. HTTP Health-Endpoints
- ⚠️ WARNUNG: HTTP-Check unerwartet: sf1-frontend → <!DOCTYPE html><html lang="de"><head><meta charSet="utf-8"/><meta name="viewport
- ✅ HTTP OK: sf1-auth-service
- ✅ HTTP OK: sf1-price-service
- ✅ HTTP OK: sf1-search-service
- ✅ HTTP OK: sf1-meilisearch
- ✅ HTTP OK: sf1-api-gateway

## 3. Backup-Alter
  - Letztes Backup: mongodb_all_20260606-210002.tar.gz | Alter: 22h | Größe: 548K
- ✅ Backup aktuell: 22h alt

## 4. Disk Space
- ✅ Disk /: 44% (136G frei)

```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          69        30        25.75GB   18.5GB (71%)
Containers      41        41        355.6MB   0B (0%)
Local Volumes   50        24        16.14GB   10.67GB (66%)
Build Cache     42        0         1.307GB   1.307GB
```

## 5. Log-Größen
- ⚠️ WARNUNG: Docker-Logs über 100MB:
  - sf1-v2-mongo: 130M — /var/lib/docker/containers/34a3a4567f972aebc12560f5da6d29396f05b0b436c1d4a52628d76762cceb32/34a3a4567f972aebc12560f5da6d29396f05b0b436c1d4a52628d76762cceb32-json.log
  - sf1-v2-postgres: 141M — /var/lib/docker/containers/d3aaf72851e201247097525e8720bd7604afec1e5e83d50449d629e5dd6a366e/d3aaf72851e201247097525e8720bd7604afec1e5e83d50449d629e5dd6a366e-json.log
  - sf1-v2-loki: 148M — /var/lib/docker/containers/429e6f730a840753ba2b0f358fbd7a23b41314e416b66c8edbc39b247b663c12/429e6f730a840753ba2b0f358fbd7a23b41314e416b66c8edbc39b247b663c12-json.log
  - sf1-loki: 127M — /var/lib/docker/containers/55d3acbf0d2ce19de42aa131dfa95d4844b96fe2524fb3ded6f1b45ed19e6b0f/55d3acbf0d2ce19de42aa131dfa95d4844b96fe2524fb3ded6f1b45ed19e6b0f-json.log
- ✅ System-Log-Größen geprüft

## 6. System Resources
- ✅ RAM OK: 50% (4047/7938MB)
- ✅ Swap OK: 1504/2047MB (73%), 3890MB RAM verfügbar
  - Load Average: 0,92, 0,67, 0,71 | CPUs: 4

## 7. Cron-Job Health
- ✅ Cron daily-fix: vor 21h — [2026-06-06 21:00:48] Daily-Fix: Fixes=2 FehlerFix=0 VerifyOK=5 VerifyFail=0 Bericht=daily-fix-2026-
- ✅ Cron feed-scraper-v3: vor 4h — [2026-06-07T12:00:45.627Z] ════════════════════════�
- ✅ Cron backup-age-check: vor 10h — [2026-06-07T07:00:01Z] OK: Letztes Backup 5h alt (backup-2026-06-07T02-00-00.tar.gz.enc)
- ✅ Cron sf1-backup: vor 21h — [2026-06-06 21:00:02] [0;32m[OK][0m  =========================================
- ✅ Cron price-alarm: vor 0h — [2026-06-07T17:00:01Z] OK: Alle Preise frisch (0 Seedbanken >24h veraltet)
- ✅ Cron daily-mastertest: vor 12h — [2026-06-07T06:00:24+02:00] SF-1 Daily Mastertest abgeschlossen — ✅ 42/42 grün

---

## Zusammenfassung
- 🔴 Kritische Probleme: **0**
- ⚠️ Warnungen: **2**
- 🕐 Geprüft: 2026-06-07 19:00:23

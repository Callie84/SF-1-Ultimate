# SF-1 System-Check Report
**Datum:** 2026-06-28 19:00:01
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
  - Letztes Backup: mongodb_all_20260627-210002.tar.gz | Alter: 22h | Größe: 1,1M
- ✅ Backup aktuell: 22h alt

## 4. Disk Space
- ✅ Disk /: 44% (134G frei)

```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          69        30        25.75GB   18.5GB (71%)
Containers      41        41        482MB     0B (0%)
Local Volumes   50        24        16.53GB   10.67GB (64%)
Build Cache     42        0         1.307GB   1.307GB
```

## 5. Log-Größen
- ⚠️ WARNUNG: Docker-Logs über 100MB:
  - sf1-v2-prometheus: 117M — /var/lib/docker/containers/0d30b60fea173959d8e4ffdcfcb5b0866f1180abf44f6a22cb1a9a2ec523652d/0d30b60fea173959d8e4ffdcfcb5b0866f1180abf44f6a22cb1a9a2ec523652d-json.log
  - sf1-v2-mongo: 216M — /var/lib/docker/containers/34a3a4567f972aebc12560f5da6d29396f05b0b436c1d4a52628d76762cceb32/34a3a4567f972aebc12560f5da6d29396f05b0b436c1d4a52628d76762cceb32-json.log
  - sf1-v2-postgres: 171M — /var/lib/docker/containers/d3aaf72851e201247097525e8720bd7604afec1e5e83d50449d629e5dd6a366e/d3aaf72851e201247097525e8720bd7604afec1e5e83d50449d629e5dd6a366e-json.log
  - sf1-v2-loki: 153M — /var/lib/docker/containers/429e6f730a840753ba2b0f358fbd7a23b41314e416b66c8edbc39b247b663c12/429e6f730a840753ba2b0f358fbd7a23b41314e416b66c8edbc39b247b663c12-json.log
  - sf1-unleash-db: 102M — /var/lib/docker/containers/c37ad7d951e9874c89cbdd2911f0338f0e6fd2ba2e8af9a0b7ec2d1efe87c7f8/c37ad7d951e9874c89cbdd2911f0338f0e6fd2ba2e8af9a0b7ec2d1efe87c7f8-json.log
  - sf1-v2-postgres-exporter: 107M — /var/lib/docker/containers/9b0a6fece2bf73b28e0143b87d0f6a216227341994f30301bda97cc712bd7de6/9b0a6fece2bf73b28e0143b87d0f6a216227341994f30301bda97cc712bd7de6-json.log
- ✅ System-Log-Größen geprüft

## 6. System Resources
- ✅ RAM OK: 59% (4688/7938MB)
- ✅ Swap OK: 1553/2047MB (75%), 3250MB RAM verfügbar
  - Load Average: 0,70, 0,66, 0,64 | CPUs: 4

## 7. Cron-Job Health
- ✅ Cron daily-fix: vor 21h — [2026-06-27 21:00:49] Daily-Fix: Fixes=1 FehlerFix=0 VerifyOK=5 VerifyFail=0 Bericht=daily-fix-2026-
- ✅ Cron feed-scraper-v3: vor 4h — [2026-06-28T12:00:35.924Z] ════════════════════════�
- ✅ Cron backup-age-check: vor 10h — [2026-06-28T07:00:01Z] OK: Letztes Backup 5h alt (backup-2026-06-28T02-00-00.tar.gz.enc)
- ✅ Cron sf1-backup: vor 21h — [2026-06-27 21:00:02] [0;32m[OK][0m  =========================================
- ✅ Cron price-alarm: vor 0h — [2026-06-28T17:00:01Z] OK: Alle Preise frisch (0 Seedbanken >24h veraltet)
- ✅ Cron daily-mastertest: vor 13h — [2026-06-28T06:00:24+02:00] SF-1 Daily Mastertest abgeschlossen — ✅ 42/42 grün

## 8. Strain-Datenbank
- ✅ Strains OK: 4503 in sf1_community.strains

---

## Zusammenfassung
- 🔴 Kritische Probleme: **0**
- ⚠️ Warnungen: **2**
- 🕐 Geprüft: 2026-06-28 19:00:24

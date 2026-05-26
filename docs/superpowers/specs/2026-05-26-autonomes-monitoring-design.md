# SF-1 Autonomes Monitoring-System — Design Spec
**Datum:** 2026-05-26
**Status:** Approved

---

## Ziel
Vollautomatisches System das alle 6 Stunden den Server-Zustand prüft, Berichte schreibt und täglich Probleme selbstständig behebt — ohne manuelle Bestätigung.

---

## Komponenten

### A) `sf1-system-check.sh` — 6h-Checker
**Pfad:** `/root/scripts/sf1-system-check.sh`
**Cron:** `0 1,7,13,19 * * *` → 4 Berichte/Tag

**Prüfungen:**
1. Security: Token in Git-Remote-URLs, `.env`-Permissions (600), `~/.git-credentials`-Permissions, Secrets in Quellcode
2. Container Health: Docker-Status aller 15 SF-1-Container + HTTP via `docker exec` mit korrektem Tool je Container
3. Backup-Alter: Neuestes `*.tar.gz` in `/root/backups/`, Schwellen 26h (⚠️) / 48h (🔴)
4. Disk Space: Alle Mounts via `df -h`, Docker-Disk via `docker system df`, Schwellen 80%/90%
5. Log-Größen: Docker-Container-Logs >100MB, System-Logs >50MB
6. System Resources: RAM (80%/90%), Load Average, Swap
7. Cron-Job Health: Alter der Logfiles der wichtigsten Jobs

**Health-Check-Tools (exakt wie docker-compose):**
- `sf1-search-service`: `wget -qO- http://localhost:7700/health`
- `sf1-auth-service`: `node -e "require('http').get(...)"` (kein wget)
- `sf1-api-gateway` (Traefik): `wget -qO- http://localhost:8080/ping`
- Alle anderen: `wget -qO- http://localhost:<port>/health`

**Ausgabe:** `system-check-YYYY-MM-DD_HH-MM.md` in:
- `/root/SF-1-Ultimate-/reports/`
- `/root/SF-Brain/Reports/`

Berichte älter als 14 Tage automatisch gelöscht.

---

### B) `sf1-daily-fix.sh` — Täglicher Auto-Fixer
**Pfad:** `/root/scripts/sf1-daily-fix.sh`
**Cron:** `0 21 * * *`

| Problem | Fix | Schutz |
|---|---|---|
| Container gestoppt/unhealthy | `docker restart <name>` | Max 1x pro Container |
| Token in Git-Remote-URL | URL bereinigen + Credential-Store | Nur ghp_/ghs_ Pattern |
| Docker-Log >200MB | `truncate --size=50M <logfile>` | Nur Container-Logs |
| Backup >48h alt | `/root/scripts/sf1-backup.sh` | Nur wenn nicht läuft |
| Disk >85% | `docker image prune -f` (nur dangling) | Nie named Images |
| `.env`-Permissions falsch | `chmod 600` | Nur bekannte Pfade |

**Nie anfassen:** `docker compose down`, prisma, Migrations, .env-Inhalt, Container/Volumes löschen.

---

### C) Permissions (`settings.json`)
Allow-Einträge für Betrieb ohne Bestätigungsdialog — alle notwendigen docker/git/chmod/truncate-Befehle.

---

### D) Cron
```
0 1,7,13,19 * * *  sf1-system-check.sh >> /var/log/sf1-system-check.log 2>&1
0 21 * * *          sf1-daily-fix.sh    >> /var/log/sf1-daily-fix.log 2>&1
```

# Automations-Audit SF-1 — 2026-05-19

**Erstellt:** 2026-05-19  
**Zweck:** Vollständiger Befund aller Automationen — Grundlage für Folge-Session  
**Gesamtscore:** 68% — Basis solide, kritische Lücken vorhanden

---

## 🔴 KRITISCH — sofort beheben

### 1. SessionEnd-Hook fehlt komplett
- **Problem:** Es gibt keinen `SessionEnd`-Hook in `/root/.claude/settings.json`
- **Impact:** Sessions enden unkontrolliert — DOKUMENTATION.md wird nicht final geprüft, kein Vault-Update, kein Backup-Trigger, keine Session-Summary
- **Was fehlt:** Hook `sf1-session-end.py` schreiben + in settings.json eintragen
- **Aufwand:** 2–3h
- **Sollte tun:** DOKUMENTATION.md-Check → Vault Status & Roadmap updaten → Backup auslösen → Session-Summary in SF-Brain/Logs/sessions.md → uncommitted changes warnen → LIVE-PROGRESS finalisieren

### 2. Auth-Service unhealthy (tsx crash)
- **Problem:** `sf1-auth-service` wirft `ERR_MODULE_NOT_FOUND: Cannot find module '/app/src/index.ts'`
- **Impact:** Authentifizierung kann ausfallen — kritisch für alle User-Operationen
- **Was fehlt:** Diagnose + Rebuild des Containers
- **Aufwand:** 30min
- **Nächster Schritt:** `docker logs sf1-auth-service --tail 50` → Ursache klären → ggf. `docker compose up -d --build auth-service`

### 3. Strain-Import Batch-Cron — Silent Fail
- **Problem:** Cron läuft alle 5min (`*/5 * * * * /root/scripts/strain-import/run-description-batches.sh`), aber `/root/scripts/strain-import/cron.log` ist leer seit 2026-04-29
- **Impact:** Strain-Beschreibungen werden nicht mehr importiert — Datenqualität degradiert
- **Was fehlt:** Script debuggen, Logging verbessern, Fehlerbehandlung
- **Aufwand:** 1h
- **Nächster Schritt:** Script manuell ausführen → Output prüfen → Fehler beheben → Logging nach `/var/log/strain-import.log` umleiten

### 4. Offsite-Backup nicht eingerichtet
- **Problem:** rclone ist installiert, aber `hetzner-backup:sf1-ultimate` Remote ist nicht konfiguriert
- **Symptom:** In `/var/log/sf1-backup.log`: "Offsite-Remote nicht konfiguriert — nur lokales Backup"
- **Impact:** Nur lokale Backups → kein Schutz bei Server-Ausfall
- **Was fehlt:** `/root/scripts/setup-rclone-hetzner.sh` ausführen, dann testen
- **Aufwand:** 30min (braucht Hetzner Storage Box Credentials vom User)

---

## 🟡 WICHTIG — nächste 2 Wochen

### 5. Fehlende Healthchecks für 10 Services
- **Services ohne Healthcheck:** journal-service, search-service, notification-service, gamification-service, media-service, community-service, tools-service, frontend, price-service, n8n
- **Impact:** Unhealthy Services werden nicht automatisch erkannt/neugestartet
- **Lösung:** HTTP `/health`-Endpoint + Healthcheck in docker-compose.yml pro Service

### 6. Price-Service System-Monitoring fehlt
- **User-Alerts:** ✅ funktionieren (targetPrice, restock etc.)
- **System-Alarms:** ❌ fehlen — wenn >3 Adapter Circuit-Breaker offen sind, gibt es keinen Alert
- **Lösung:** Cron-Script das Circuit-Breaker-Status prüft + Telegram-Alert sendet

### 7. Backup-Alter-Monitoring fehlt
- **Problem:** Wenn der Backup-Cron still ausfällt, merkt niemand es
- **Lösung:** Script das prüft ob letztes Backup < 30h alt ist + Alert wenn nicht

### 8. n8n Workflows — Status unbekannt
- **Container:** läuft (healthy, Up 2 weeks)
- **Problem:** Welche Workflows aktiv sind, ist nicht dokumentiert
- **Lösung:** n8n Admin (Port 5678 intern) → Workflows auflisten + in Vault dokumentieren

---

## ✅ Läuft gut — kein Handlungsbedarf

| Automation | Details |
|-----------|---------|
| **Backup lokal** | Täglich 03:00, 7-Tage-Retention, Verifikation So 04:00 ✅ |
| **Content-Check** | Montag 09:00, Telegram-Alarm bei >10% Abweichung ✅ |
| **Daily Mastertest** | Täglich 06:00, 42 Tests ✅ |
| **Docker-Cleanup** | Sonntag 03:30, `docker system prune -f` ✅ |
| **npm audit** | 1. des Monats 04:00 ✅ |
| **MT-User-Cleanup** | Täglich 02:30 ✅ |
| **Price-Service Circuit Breaker** | 5 Failures / 1h Window, Redis-basiert ✅ |
| **Price-Service User-Alerts** | targetPrice, restock, discount ✅ |
| **Claude: plan-guard** | Blockiert Edit/Write ohne aktiven Task ✅ |
| **Claude: bash-guard** | Blockiert destruktive Befehle ✅ |
| **Claude: file-guard** | Schützt kritische Dateien ✅ |
| **Claude: progress-touch** | Updated Last-Update nach Edit/Write ✅ |
| **Claude: progress-commit-sync** | Updated LIVE-PROGRESS nach git commit ✅ |
| **Claude: dok-reminder** | Erinnert an DOKUMENTATION.md (Regel 2+19) ✅ |
| **Claude: prettier-formatter** | Auto-Format TS/TSX/JS/JSX nach Edit ✅ |
| **Claude: vault-sync-dokumentation** | Kopiert DOKUMENTATION.md nach Vault nach Edit ✅ |
| **Claude: session-start** | Zeigt Projekt + NEXT ACTION beim Start ✅ |
| **Claude: weiter-trigger** | Injiziert LIVE-PROGRESS-Kontext bei "weiter" ✅ |
| **Claude: idle-notification** | Wall-Benachrichtigung wenn Claude wartet ✅ |

---

## Priorisierter Arbeitsplan

```
SOFORT (heute/morgen):
  [ ] 2. Auth-Service unhealthy → docker logs → rebuild
  [ ] 3. Strain-Import Cron → manuell testen → Fehler beheben
  [ ] 4. Offsite-Backup → rclone einrichten (Credentials nötig)
  [ ] 1. SessionEnd-Hook → schreiben + eintragen

DIESE WOCHE:
  [ ] 5. Healthchecks für 10 Services
  [ ] 6. Price-Service System-Alarm (Circuit-Breaker → Telegram)
  [ ] 7. Backup-Alter-Check Cron

SPÄTER:
  [ ] 8. n8n Workflows dokumentieren
```

---

## Technische Details (für Diagnose)

### Auth-Service Fehler
```bash
docker logs sf1-auth-service --tail 50
# Fehler: ERR_MODULE_NOT_FOUND: /app/src/index.ts
# Rebuild: docker compose -f /root/SF-1-Ultimate-/docker-compose.yml up -d --build auth-service
```

### Strain-Import Debug
```bash
# Manuell testen:
bash /root/scripts/strain-import/run-description-batches.sh
# Cron-Log prüfen:
cat /root/scripts/strain-import/cron.log
# System-Cron-Log:
grep strain /var/log/syslog | tail -20
```

### Offsite-Backup einrichten
```bash
# Setup-Script (braucht Hetzner Credentials):
bash /root/scripts/setup-rclone-hetzner.sh
# Test nach Einrichtung:
rclone ls hetzner-backup:sf1-ultimate
# Nächster Backup-Lauf manuell:
bash /root/scripts/sf1-backup.sh
```

### Unhealthy Services prüfen
```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -v "healthy"
# Aktuell unhealthy (Stand 2026-05-19):
# sf1-auth-service, sf1-search-service, sf1-journal-service,
# sf1-notification-service, sf1-gamification-service,
# sf1-media-service, sf1-community-service, sf1-tools-service
```

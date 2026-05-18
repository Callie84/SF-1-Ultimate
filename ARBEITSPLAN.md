# SF-1 Ultimate – Offener Arbeitsplan
**Stand:** 2026-02-25
**Check-Tool:** `bash scripts/health-check.sh`

---

## Priorität 1 – Sofort erledigen (blockiert andere Punkte)

### 🔴 1.1 Unsichere Secrets in `.env` ersetzen
Diese Werte sind noch Platzhalter und müssen **vor dem Launch** ersetzt werden:

```bash
nano /root/SF-1-Ultimate-/.env
```

| Variable | Problem | Aktion |
|----------|---------|--------|
| `POSTGRES_PASSWORD` | `CHANGE_ME_...` | Sicheres Passwort setzen |
| `REDIS_PASSWORD` | `CHANGE_ME_...` | Sicheres Passwort setzen |
| `JWT_SECRET` | `CHANGE_ME_...` | Mindestens 32 Zeichen, zufällig |
| `JWT_REFRESH_SECRET` | `CHANGE_ME_...` | Mindestens 32 Zeichen, zufällig |

**Passwörter generieren:**
```bash
openssl rand -hex 32   # für JWT-Secrets
openssl rand -base64 24 | tr -d '/+=' # für DB-Passwörter
```

**Nach Änderung:** Postgres- und Redis-Container neu erstellen (Daten bleiben in Volumes):
```bash
cd /root/SF-1-Ultimate-
docker-compose up -d --force-recreate postgres redis
# Dann alle Services die DB nutzen neustarten:
docker-compose restart auth-service
```

⚠️ **Auch `.env.staging` aktualisieren** (enthält dieselben DB-Passwörter da shared infra).

---

### 🔴 1.2 DNS-Einträge anlegen
Alle 4 Subdomains benötigen **A-Records** auf die Server-IP.

**Server-IP ermitteln:**
```bash
curl -s https://api.ipify.org
```

**Einzutragende Records:**

| Subdomain | Typ | Ziel | Zweck |
|-----------|-----|------|-------|
| `traefik.seedfinderpro.de` | A | Server-IP | Traefik Dashboard |
| `grafana.seedfinderpro.de` | A | Server-IP | Grafana Dashboard |
| `prometheus.seedfinderpro.de` | A | Server-IP | Prometheus (BasicAuth) |
| `staging.seedfinderpro.de` | A | Server-IP | Staging-Umgebung |

**DNS prüfen (nach Propagation ~5–60min):**
```bash
bash scripts/health-check.sh dns
```

**SSL-Zertifikate** werden von Traefik automatisch via Let's Encrypt ausgestellt sobald die DNS-Records aktiv sind und das erste Request kommt.

---

## Priorität 2 – Bald erledigen

### 🟡 2.1 Telegram-Alertmanager einrichten

1. **Telegram-Bot erstellen:**
   - Chat mit [@BotFather](https://t.me/BotFather) öffnen
   - `/newbot` → Name und Username vergeben
   - **Bot-Token** kopieren (Format: `1234567890:ABCdef...`)

2. **Chat-ID ermitteln:**
   ```bash
   # Bot zuerst in deinen gewünschten Chat/Gruppe einladen, dann:
   curl "https://api.telegram.org/bot<DEIN_TOKEN>/getUpdates"
   # → "chat": {"id": -1001234567890, ...}  (negative Zahl = Gruppe)
   ```

3. **In `.env` eintragen:**
   ```bash
   nano /root/SF-1-Ultimate-/.env
   # TELEGRAM_BOT_TOKEN=1234567890:ABCdef...
   # TELEGRAM_CHAT_ID=-1001234567890
   ```

4. **Alertmanager neu starten:**
   ```bash
   docker-compose restart alertmanager
   ```

5. **Test-Alert senden:**
   ```bash
   curl -X POST http://localhost:9093/api/v1/alerts \
     -H 'Content-Type: application/json' \
     -d '[{"labels":{"alertname":"TestAlert","severity":"warning"},"annotations":{"description":"Test vom Health-Check"}}]'
   ```
   → Muss Telegram-Nachricht auslösen.

---

### 🟡 2.2 Hetzner Storage Box einrichten (Offsite-Backup)

1. **Storage Box bestellen:** [https://www.hetzner.com/storage/storage-box](https://www.hetzner.com/storage/storage-box)
   - Empfehlung: BX11 (1 TB, ~3,81 €/Monat)

2. **SSH-Key für Storage Box aktivieren:**
   - Hetzner Robot → Storage Box → SSH-Key hinzufügen
   - Oder: Passwort-Zugang (SFTP auf Port 23)

3. **rclone konfigurieren:**
   ```bash
   bash /root/scripts/setup-rclone-hetzner.sh
   ```

4. **Offsite-Backup testen:**
   ```bash
   bash /root/scripts/sf1-backup.sh
   # → Sollte am Ende: "Offsite-Upload zu hetzner-backup: OK" zeigen
   ```

5. **Check:**
   ```bash
   bash scripts/health-check.sh bak
   ```

---

## Priorität 3 – Optional / Bei Bedarf

### ⚪ 3.1 Staging-Umgebung nutzen
DNS-Record `staging.seedfinderpro.de` muss gesetzt sein (→ 1.2).

```bash
bash scripts/staging-up.sh          # Start
bash scripts/staging-up.sh --branch staging  # mit Git-Branch

# URL: https://staging.seedfinderpro.de
# Login: staging / OBFnBtQj4HCbEcpIwT1d4A

bash scripts/staging-down.sh        # Stop (spart RAM)
bash scripts/promote-to-prod.sh     # Staging → Production mergen
```

---

### ⚪ 3.2 Backup-Wiederherstellung testen

```bash
# Letztes Backup anzeigen:
ls -lh /root/backups/sf1-daily/

# Restore-Script ausführen (auf Staging-DBs testen!):
bash scripts/restore-database.sh
```

---

### ⚪ 3.3 Google/Discord OAuth einrichten (falls gewünscht)

```bash
nano /root/SF-1-Ultimate-/.env
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
# DISCORD_CLIENT_ID=...
# DISCORD_CLIENT_SECRET=...
```

---

## Schnellzugriff Debug-Befehle

```bash
# ── Health-Checks ───────────────────────────────
bash scripts/health-check.sh           # Alles prüfen
bash scripts/health-check.sh --debug   # Mit Details
bash scripts/health-check.sh sec       # Nur Sicherheit
bash scripts/health-check.sh mon       # Nur Monitoring
bash scripts/health-check.sh bak       # Nur Backup

# ── Docker ──────────────────────────────────────
docker-compose ps                      # Status aller Container
docker-compose logs -f <service>       # Logs eines Services
docker-compose restart <service>       # Service neustarten
docker-compose up -d --force-recreate <service>  # Container neu erstellen

# ── Datenbanken ─────────────────────────────────
docker exec -it sf1-mongodb mongosh -u sf1_admin -p $MONGO_PASSWORD
docker exec -it sf1-postgres psql -U sf1_user sf1_db
docker exec -it sf1-redis redis-cli -a $REDIS_PASSWORD

# ── Logs ────────────────────────────────────────
journalctl -u fail2ban -f              # Fail2ban-Events
tail -f /var/log/ufw.log               # UFW geblockte Verbindungen
docker logs sf1-api-gateway            # Traefik-Logs

# ── Sicherheit ──────────────────────────────────
ufw status verbose                     # Firewall-Regeln
iptables -L DOCKER-USER -n -v         # Docker-Bypass-Schutz
fail2ban-client status sshd           # Gebannte IPs
sshd -T | grep -E "(root|password|auth)"  # SSH-Einstellungen

# ── Backup ──────────────────────────────────────
bash /root/scripts/sf1-backup.sh      # Manuelles Backup
ls -lh /root/backups/sf1-daily/       # Backup-Dateien
crontab -l                            # Cron-Jobs

# ── Staging ─────────────────────────────────────
bash scripts/staging-up.sh            # Staging starten
bash scripts/staging-down.sh          # Staging stoppen
docker-compose -f docker-compose.staging.yml --env-file .env.staging ps
```

---

## Nächster vollständiger Check

```bash
bash /root/SF-1-Ultimate-/scripts/health-check.sh
```

Alle Punkte sollten grün sein wenn:
1. DNS-Records gesetzt ✓
2. Secrets ersetzt ✓
3. Telegram konfiguriert ✓
4. Hetzner Storage Box eingerichtet ✓

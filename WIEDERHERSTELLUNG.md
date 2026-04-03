# SF-1 Ultimate — Vollständige Wiederherstellung

> Dieses Dokument erklärt wie SF-1 Ultimate auf einem neuen Server von Grund auf wiederhergestellt wird.
> Voraussetzung: Du hast das GitHub-Repo, eine `.env`-Datei und ein Backup-Archiv (`.tar.gz.enc`).

---

## Was du brauchst

| Datei | Wo gespeichert | Zweck |
|-------|----------------|-------|
| GitHub-Repo | github.com/Callie84/SF-1-Ultimate-Backup | Gesamter Code |
| `.env` | Passwort-Manager / lokale Kopie | Alle Secrets & Credentials |
| `backup-DATUM.tar.gz.enc` | Lokale Kopie / externer Speicher | Datenbank-Dumps (PostgreSQL + MongoDB) |
| `backup-DATUM.meta.json` | Lokale Kopie / externer Speicher | Backup-Metadaten |

---

## Schritt 1 — Neuen Server vorbereiten

```bash
# Docker installieren (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker

# Docker Compose (Plugin)
apt-get install -y docker-compose-plugin

# Git & Node.js
apt-get install -y git nodejs npm
```

---

## Schritt 2 — Repo klonen

```bash
git clone https://github.com/Callie84/SF-1-Ultimate-Backup.git /root/SF-1-Ultimate-
cd /root/SF-1-Ultimate-
```

---

## Schritt 3 — `.env` wiederherstellen

Die `.env`-Datei enthält alle Secrets und ist NICHT im Repo. Du musst sie aus deinem Passwort-Manager kopieren:

```bash
nano /root/SF-1-Ultimate-/.env
# Inhalt aus Passwort-Manager einfügen und speichern
```

**Wichtige Variablen die enthalten sein müssen:**
- `JWT_SECRET`
- `POSTGRES_PASSWORD` / `DATABASE_URL`
- `MONGO_PASSWORD` / `MONGODB_URL`
- `REDIS_PASSWORD`
- `BACKUP_ENCRYPTION_KEY` ← wird für Entschlüsselung benötigt!
- `SMTP_*` (Brevo-Credentials)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `HETZNER_S3_*` (Foto-Uploads)
- `NEXT_PUBLIC_API_URL` (Domain)

---

## Schritt 4 — Backup-Archiv auf Server kopieren

Auf deinem lokalen PC ausführen:
```bash
scp backup-DATUM.tar.gz.enc root@NEUE-SERVER-IP:/root/SF-1-Ultimate-/backups/
scp backup-DATUM.meta.json  root@NEUE-SERVER-IP:/root/SF-1-Ultimate-/backups/
```

---

## Schritt 5 — Datenbanken starten (nur DBs, noch keine App)

```bash
cd /root/SF-1-Ultimate-/

# Nur Infrastruktur-Services starten
docker compose up -d mongodb postgres redis meilisearch

# Warten bis alle bereit sind (~20 Sekunden)
sleep 20
docker compose ps
```

---

## Schritt 6 — Backup entschlüsseln und entpacken

```bash
cd /root/SF-1-Ultimate-/backups/

# BACKUP_ENCRYPTION_KEY aus .env lesen
source /root/SF-1-Ultimate-/.env

# Backup entschlüsseln (AES-256-CBC)
openssl enc -aes-256-cbc -pbkdf2 -iter 100000 \
  -d \
  -in backup-DATUM.tar.gz.enc \
  -out backup-DATUM.tar.gz \
  -pass pass:${BACKUP_ENCRYPTION_KEY}

# Entpacken
mkdir -p /tmp/sf1-restore
tar -xzf backup-DATUM.tar.gz -C /tmp/sf1-restore
ls /tmp/sf1-restore/backup-DATUM/
```

---

## Schritt 7 — Datenbanken wiederherstellen

### PostgreSQL

```bash
source /root/SF-1-Ultimate-/.env

# SQL-Dump einspielen
docker exec -i sf1-postgres psql \
  -U sf1_user -d sf1_db \
  < /tmp/sf1-restore/backup-DATUM/postgres/sf1_db.sql

echo "PostgreSQL wiederhergestellt ✓"
```

### MongoDB

```bash
source /root/SF-1-Ultimate-/.env

# mongodump-Verzeichnis wiederherstellen
docker run --rm \
  --network sf1-network \
  -v /tmp/sf1-restore/backup-DATUM/mongodb:/backup \
  mongo:7 \
  mongorestore \
    --uri="mongodb://sf1_admin:${MONGO_PASSWORD}@mongodb:27017" \
    --authenticationDatabase=admin \
    /backup

echo "MongoDB wiederhergestellt ✓"
```

---

## Schritt 8 — Alle Services starten

```bash
cd /root/SF-1-Ultimate-/
docker compose up -d

# Status prüfen (~60 Sekunden warten für Build)
sleep 60
docker ps --format "table {{.Names}}\t{{.Status}}" | grep sf1
```

---

## Schritt 9 — Prüfen ob alles läuft

```bash
# Health-Check aller Services
curl -s http://localhost/api/health | jq .

# Logs prüfen falls ein Service nicht startet
docker logs sf1-auth-service --tail 30
docker logs sf1-frontend --tail 30
```

---

## Schritt 10 — Cleanup

```bash
# Entschlüsseltes Archiv sofort löschen (Sicherheit)
rm /root/SF-1-Ultimate-/backups/backup-DATUM.tar.gz
rm -rf /tmp/sf1-restore/

echo "Cleanup erledigt ✓"
```

---

## Häufige Probleme

| Problem | Lösung |
|---------|--------|
| `openssl: bad decrypt` | `BACKUP_ENCRYPTION_KEY` falsch — aus .env prüfen |
| Container startet nicht | `docker logs sf1-SERVICENAME --tail 50` |
| PostgreSQL: role does not exist | `docker exec sf1-postgres createuser -U postgres sf1_user` |
| Frontend baut nicht | `docker compose build web-app --no-cache` |
| Meilisearch-Index leer | Über Admin-Panel neu indexieren: `/admin/monitoring` |

---

## Domain / SSL nach Wiederherstellung

Wenn die Domain gleich bleibt: nichts zu tun — Traefik holt SSL-Zertifikat automatisch.

Wenn neue Domain:
```bash
# In .env anpassen:
NEXT_PUBLIC_API_URL=https://neue-domain.de
FRONTEND_URL=https://neue-domain.de

# Services neu starten:
docker compose up -d --force-recreate
```

# SF-1 Ultimate — Vollständiger Systembericht
**Stand: 2026-03-05 | Version: Session 29**

> Dieser Bericht beschreibt das SF-1 Ultimate System vollständig und detailliert,
> sodass ein exakter Nachbau möglich ist.

---

## Inhaltsverzeichnis

1. [Projektübersicht](#1-projektübersicht)
2. [Technologie-Stack](#2-technologie-stack)
3. [Infrastruktur & Netzwerk](#3-infrastruktur--netzwerk)
4. [Datenbanken](#4-datenbanken)
5. [Microservices — Detailbeschreibung](#5-microservices--detailbeschreibung)
6. [Frontend — Next.js Web-App](#6-frontend--nextjs-web-app)
7. [Monitoring-Stack](#7-monitoring-stack)
8. [Backup-System](#8-backup-system)
9. [Authentifizierung & Sicherheit](#9-authentifizierung--sicherheit)
10. [Externe Dienste & APIs](#10-externe-dienste--apis)
11. [Umgebungsvariablen](#11-umgebungsvariablen)
12. [Deployment & Betrieb](#12-deployment--betrieb)
13. [Vollständige API-Referenz](#13-vollständige-api-referenz)
14. [Datenmodelle](#14-datenmodelle)
15. [Frontend-Routen & Seiten](#15-frontend-routen--seiten)

---

## 1. Projektübersicht

**Name:** SF-1 Ultimate (seedfinderpro.de)
**Typ:** Cannabis Growing Community Plattform
**Domain:** https://seedfinderpro.de
**Server:** Hetzner Cloud VPS, Linux Debian

### Kernbereiche der Plattform

| Bereich | Beschreibung |
|---------|-------------|
| **Grow-Journal** | Private Wachstumstagebücher mit Einträgen, Fotos, Messwerten, Erinnerungen |
| **Öffentliche Grows** | Discovery-Feed für veröffentlichte Grows (Like, Kommentar, Follow) |
| **Community-Forum** | Thread-basiertes Forum mit Kategorien, Replies, Reaktionen, Voting |
| **Strain-Datenbank** | 2800+ Cannabis Sorten mit Preisvergleich, Reviews, SEO-Seiten |
| **Preisvergleich** | 11 Seedbank-Feeds (Affiliate), täglich aktualisiert, Preisalarme |
| **AI-Assistent** | Chat, Pflanzen-Diagnose, Grow-Berater (GPT-4o) |
| **Gamification** | XP, Level-System, Achievements, Badges, Leaderboard |
| **Nachrichten** | Privates Messaging-System zwischen Nutzern |
| **Kalender** | Grow-Kalender mit Erinnerungen (Gießen, Düngen, Ernten) |
| **Rechner-Tools** | VPD, EC/PPM, DLI, PPFD, Stromkosten, CO₂-Kalkulator |
| **Seedbank-Reviews** | Bewertungssystem für Seedbanks |
| **Werbeanzeigen** | Buchbares Ad-System (Rectangle/Square, Impression/Click-Tracking) |
| **Notifications** | Echtzeit-Benachrichtigungen (WebSocket + E-Mail) |
| **Admin-Panel** | Vollständiges Backend für alle Plattform-Bereiche |
| **Backup** | Automatisierte Datenbank-Backups (täglich 02:00 Uhr) |

---

## 2. Technologie-Stack

### Backend
| Komponente | Technologie | Version |
|------------|-------------|---------|
| Runtime | Node.js | 20 |
| Sprache | TypeScript | 5.3 |
| HTTP-Framework | Express.js | 4.18 |
| Hot-Reload (Dev) | tsx watch | 4.6 |
| Build | tsc | - |
| ORM (PostgreSQL) | Prisma | 5.x |
| ODM (MongoDB) | Mongoose | 8.x |
| Redis Client | ioredis / redis | 4.x |
| Validierung | Zod | 3.22 |
| JWT | jsonwebtoken | 9.x |
| WebSocket | socket.io | 4.7 |
| Metrics | prom-client | 15.x |

### Frontend
| Komponente | Technologie | Version |
|------------|-------------|---------|
| Framework | Next.js | 14.2 (App Router) |
| Sprache | TypeScript | 5.4 |
| UI-Bibliothek | Tailwind CSS + shadcn/ui | - |
| State (Server) | TanStack React Query | 5.x |
| State (Client) | Zustand | 4.5 |
| Formulare | React Hook Form + Zod | 7.x |
| HTTP-Client | Axios | 1.6 |
| Icons | Lucide React | 0.364 |
| Toast | Sonner | 1.4 |
| Datum | date-fns | 3.x |
| Charts | Recharts | 2.x |
| WebSocket Client | socket.io-client | 4.7 |
| Themes | next-themes | 0.3 |
| Cookie | js-cookie | 3.x |

### Infrastruktur
| Komponente | Technologie | Version |
|------------|-------------|---------|
| Reverse Proxy / SSL | Traefik | 2.10 |
| Container | Docker Compose | 3.8 |
| SSL | Let's Encrypt (ACME) | - |
| Primäre DB | MongoDB | 7 |
| Relationale DB | PostgreSQL | 15 |
| Cache / Queue | Redis | 7 |
| Volltextsuche | Meilisearch | 1.5 |
| Objekt-Storage | Hetzner Object Storage (S3-kompatibel) | - |
| E-Mail | Brevo SMTP | - |
| AI | OpenAI API (GPT-4o, GPT-4o-mini) | - |

---

## 3. Infrastruktur & Netzwerk

### Docker-Netzwerk

Alle Container laufen im `sf1-network` (Bridge-Netzwerk). Keine Ports werden direkt auf dem Host exponiert — ausschließlich Traefik bindet auf Port 80/443.

### Container-IPs (dynamisch, typische Werte)

| Container | IP | Port |
|-----------|-----|------|
| sf1-api-gateway (Traefik) | Host-Ports 80/443 | - |
| sf1-frontend | 172.28.0.7 | 3000 |
| sf1-auth-service | 172.28.0.12 | 3001 |
| sf1-price-service | 172.28.0.8 | 3002 |
| sf1-journal-service | 172.28.0.11 | 3003 |
| sf1-tools-service | 172.28.0.4 | 3004 |
| sf1-community-service | 172.28.0.13 | 3005 |
| sf1-notification-service | 172.28.0.x | 3006 |
| sf1-search-service | 172.28.0.14 | 3007 |
| sf1-media-service | 172.28.0.x | 3008 |
| sf1-gamification-service | 172.28.0.x | 3009 |
| sf1-ai-service | 172.28.0.x | 3010 |
| sf1-backup | 172.28.0.24 | 3011 |
| sf1-mongodb | 172.28.0.x | 27017 |
| sf1-postgres | 172.28.0.x | 5432 |
| sf1-redis | 172.28.0.x | 6379 |
| sf1-meilisearch | 172.28.0.x | 7700 |
| sf1-prometheus | 172.28.0.x | 9090 |
| sf1-grafana | 172.28.0.x | 3000 |
| sf1-alertmanager | 172.28.0.x | 9093 |
| sf1-loki | 172.28.0.x | 3100 |
| sf1-node-exporter | 172.28.0.x | 9100 |

### Traefik Routing-Regeln

Traefik konfiguriert sich ausschließlich über Docker-Labels (keine statischen Config-Dateien aktiv).

| Route | Service | Regel |
|-------|---------|-------|
| `seedfinderpro.de/*` | frontend | Fallback, Prio 1 |
| `/api/auth/*` | auth-service | Prio 10 |
| `/api/journal/*`, `/api/grows/*`, `/api/plants/*` | journal-service | Prio 10 |
| `/api/community/*`, `/api/posts/*`, `/api/comments/*` | community-service | Prio 10 |
| `/api/prices/*`, `/api/strains/*`, `/api/alerts/*` | price-service | Prio 10 |
| `/api/gamification/*`, `/api/achievements/*`, `/api/leaderboard/*` | gamification-service | Prio 10 |
| `/api/notifications/*`, `/api/preferences/*` | notification-service | Prio 10 |
| `/api/search/*` | search-service | Prio 10 |
| `/api/ai/*` | ai-service | Prio 10 |
| `/api/tools/*`, `/api/calculator/*` | tools-service | Prio 10 |
| `/api/media/*`, `/api/upload/*` | media-service | Prio 10 |
| `/api/backup/*` | backup-service | Prio 10 |
| `/ws/notifications` | notification-service | WebSocket |
| `traefik.seedfinderpro.de` | Traefik Dashboard | BasicAuth |
| `prometheus.seedfinderpro.de` | Prometheus | BasicAuth |
| `grafana.seedfinderpro.de` | Grafana | Grafana-Auth |

**Wichtig:** Kein Strip-Prefix — alle Services empfangen den vollen Pfad (z.B. `/api/community/threads`).

### SSL/TLS

Let's Encrypt über ACME HTTP-Challenge. Zertifikate werden automatisch erneuert und in einem Docker Volume (`traefik_certs`) gespeichert.

---

## 4. Datenbanken

### MongoDB (Port 27017)

MongoDB v7. Authentifizierung: User `sf1_admin` / `${MONGO_PASSWORD}`. Separate Datenbanken pro Service (Isolation):

| Datenbank | Verwendet von | Inhalt |
|-----------|--------------|--------|
| `sf1_auth` | auth-service | Sessions (Redis wird ebenfalls genutzt) |
| `sf1_community` | community-service | Threads, Replies, Votes, Categories, Follows, Messages, Ads, Strains-Reviews, Reports, Bans |
| `sf1_journal` | journal-service | Grows, Entries, Photos, Reminders, Reactions, Comments |
| `sf1_notification` | notification-service | Notifications, Preferences, Devices |
| `sf1_gamification` | gamification-service | UserProfiles, Achievements, Badges, Events |
| `sf1_price` | price-service | Seeds, Prices, PriceAlerts |
| `sf1_search` | search-service | gespiegelte Daten für Meilisearch-Index |
| `sf1_media` | media-service | Media-Metadaten |
| `sf1_ai` | ai-service | Chat-Sessions, Diagnose-Historie |
| `sf1_tools` | tools-service | Berechnungs-Historie |

### PostgreSQL (Port 5432)

PostgreSQL 15. Datenbank: `sf1_db`. User: `sf1_user`. Wird ausschließlich vom auth-service via Prisma verwendet.

**Prisma-Schema (4 Models):**

```
User {
  id, email (unique), username (unique), passwordHash,
  role (USER|PREMIUM|MODERATOR|ADMIN),
  provider (LOCAL|GOOGLE|DISCORD), providerId,
  premiumUntil, avatar, bio,
  isVerified, isActive, isBanned,
  createdAt, updatedAt
}

Session {
  id, userId, token (unique),
  expiresAt, createdAt
}

RefreshToken {
  id, userId, token (unique),
  expiresAt, createdAt
}

PasswordReset {
  id, userId, token (unique),
  expiresAt, used, createdAt
}
```

### Redis (Port 6379)

Redis 7. Passwort: `${REDIS_PASSWORD}`. Verwendung:

| Schlüssel-Muster | Verwendung |
|-----------------|-----------|
| `session:{token}` | Auth-Sessions (legacy, wird nicht mehr primär genutzt) |
| `queue:notifications` | Message-Queue für Notification-Pipeline (RPUSH/BLPOP) |
| `cache:*` | Response-Caching in div. Services |
| Diverse | Rate-Limiting, kurzlebige Daten |

### Meilisearch (Port 7700)

Meilisearch v1.5. Master-Key: `${MEILISEARCH_MASTER_KEY}`. Indexes:

| Index | Daten | Durchsuchbare Felder |
|-------|-------|---------------------|
| `strains` | 2800+ Cannabis Sorten | name, breeder, genetics, description |
| `seeds` | Seeds/Produkte mit Preisen | name, breeder, seedbank |
| `threads` | Community-Threads | title, content, category |
| `grows` | Öffentliche Grows | title, description, strainName |

---

## 5. Microservices — Detailbeschreibung

### 5.1 auth-service (Port 3001)

**Basis-Image:** `node:20-slim` (benötigt openssl für Prisma)
**DB:** PostgreSQL (Prisma) + MongoDB (Sessions) + Redis
**Besonderheiten:**
- `apt-get install openssl ca-certificates` im Container-Start (für Prisma)
- `npx prisma generate && npx prisma db push` bei jedem Start
- Foto-Upload für Avatare: lokales Verzeichnis `/app/uploads/`, serviert via `/api/auth/uploads/`
- Profil-Avatare werden auf Hetzner Object Storage (S3) hochgeladen und als S3-URL gespeichert

**API-Routen (`/api/auth/`):**

| Methode | Pfad | Authentifizierung | Beschreibung |
|---------|------|------------------|-------------|
| POST | `/register` | Public | Registrierung (email, username, password) |
| POST | `/login` | Public | Login → JWT Access + Refresh Token als Cookie |
| POST | `/logout` | Auth | Session invalidieren |
| GET | `/verify` | Auth | Token validieren, User-Daten zurückgeben |
| POST | `/refresh` | Public (RefreshToken Cookie) | Access Token erneuern |
| GET | `/me` | Auth | Eigenes Profil |
| GET | `/users/:username` | Public | Öffentliches Nutzerprofil |
| GET | `/users/by-id/:userId` | Auth | User nach ID |
| PATCH | `/profile` | Auth | Profil-Update (bio, username) |
| POST | `/profile/avatar` | Auth | Avatar hochladen (multipart/form-data) |
| POST | `/forgot-password` | Public | Passwort-Reset E-Mail senden |
| POST | `/reset-password` | Public | Passwort mit Token zurücksetzen |
| POST | `/change-password` | Auth | Passwort ändern |
| GET | `/users/:userId/email` | Internal (X-Internal-Secret) | User-E-Mail für notification-service |
| GET | `/internal/user/:userId` | Internal | Vollständige User-Daten intern |
| GET | `/analytics/*` | Admin | Nutzer-Analytics |
| GET | `/admin/*` | Admin | User-Verwaltung, Rollen setzen, Bans |

**Cookie-Namen:**
- `sf1_access_token`: JWT Access Token (httpOnly, Secure, SameSite=Strict)
- `sf1_refresh_token`: Refresh Token (httpOnly, Secure)

**JWT-Payload:**
```json
{ "userId": "clxxx...", "email": "user@example.com", "role": "USER" }
```

---

### 5.2 community-service (Port 3005)

**Basis-Image:** `node:20-alpine`
**DB:** MongoDB (`sf1_community`) + Redis

**Mongoose-Modelle:**

| Modell | Felder (wichtigste) |
|--------|---------------------|
| `Thread` | title, content, category, authorId, slug, isPinned, isLocked, viewCount, replyCount, isPublic |
| `Reply` | threadId, authorId, content, isEdited, isDeleted |
| `Vote` | targetId, targetType (thread/reply), userId, value (+1/-1) |
| `Category` | name, slug, description, color, order, postCount |
| `Follow` | followerId, followingId, followType (user/grow) |
| `Message` | conversationId, senderId, content, isRead |
| `Conversation` | participantIds, lastMessageAt |
| `Report` | targetId, targetType, reporterId, reason, status |
| `Ban` | userId, reason, bannedBy, expiresAt |
| `Ad` | type (rectangle/square), title, imageUrl, link, isActive, order, clientName, clientEmail, startDate, endDate, budget, cpm, impressions, clicks |
| `AdZoneConfig` | zones[] (id, adType, width, height, isActive) |

**Strains** werden ebenfalls in community-service verwaltet (Seed-Daten aus price-service gespiegelt, Reviews, Toggle-Status).

**API-Routen:**

| Pfad | Beschreibung |
|------|-------------|
| `GET /api/community/threads` | Thread-Liste (pagination, filter, sort) |
| `POST /api/community/threads` | Thread erstellen |
| `GET /api/community/threads/:id` | Thread-Detail |
| `PATCH /api/community/threads/:id` | Thread bearbeiten |
| `DELETE /api/community/threads/:id` | Thread löschen |
| `GET /api/community/threads/search` | Volltext-Suche |
| `POST /api/community/threads/:id/solve` | Als gelöst markieren |
| `POST /api/community/replies` | Reply erstellen |
| `GET /api/community/replies/threads/:threadId/replies` | Replies zu Thread |
| `PATCH /api/community/replies/:id` | Reply bearbeiten |
| `DELETE /api/community/replies/:id` | Reply löschen |
| `POST /api/community/votes` | Abstimmen |
| `GET /api/community/categories` | Kategorien-Liste |
| `POST /api/community/follows` | Folgen / Entfolgen |
| `GET /api/community/follows/feed` | Following-Feed |
| `GET /api/community/messages` | Nachrichten-Übersicht |
| `POST /api/community/messages` | Nachricht senden |
| `GET /api/community/strains` | Strain-Liste |
| `GET /api/community/strains/:id` | Strain-Detail |
| `GET /api/community/strains/:slug/reviews` | Reviews zu Strain |
| `POST /api/community/strains/:slug/reviews` | Review schreiben |
| `DELETE /api/community/strains/:slug/reviews/my` | Eigene Review löschen |
| `POST /api/community/strains` | Strain erstellen (Admin) |
| `PUT /api/community/strains/:id` | Strain bearbeiten (Admin) |
| `DELETE /api/community/strains/:id` | Strain löschen (Admin) |
| `POST /api/community/strains/:id/toggle` | Strain aktivieren/deaktivieren (Admin) |
| `GET /api/community/ads` | Aktive Ads (public, gefiltert nach Datum) |
| `GET /api/community/ads/all` | Alle Ads (Admin) |
| `GET /api/community/ads/stats` | Buchungs-Statistiken mit CTR/Revenue (Admin) |
| `POST /api/community/ads` | Ad erstellen (Admin) |
| `PUT /api/community/ads/:id` | Ad bearbeiten (Admin) |
| `DELETE /api/community/ads/:id` | Ad löschen (Admin) |
| `POST /api/community/ads/:id/impression` | Impression tracken (public) |
| `POST /api/community/ads/:id/click` | Click tracken (public) |
| `GET /api/community/ads/zones` | Zonen-Konfiguration (public) |
| `PUT /api/community/ads/zones` | Zonen-Konfiguration speichern (Admin) |
| `GET /api/community/moderation/*` | Moderation (Admin/Moderator) |
| `GET /api/community/analytics/*` | Statistiken (Admin) |

---

### 5.3 journal-service (Port 3003)

**Basis-Image:** `node:20-alpine`
**DB:** MongoDB (`sf1_journal`) + Redis
**S3:** Foto-Upload direkt in Hetzner Object Storage

**Mongoose-Modelle:**

| Modell | Felder |
|--------|--------|
| `Grow` | userId, title, strainName, strainId, phase (seedling/veg/flower/harvest), isPublic, isFinished, coverPhotoUrl, startDate, harvestDate, totalYield, rating, tags |
| `Entry` | growId, userId, date, title, content, phase, measurements (height_cm, ph, ec, temperature, humidity, vpd, light_hours, water_ml, nutrients), photos[], week, day |
| `Photo` | growId, entryId, userId, url (S3), thumbnailUrl, caption, takenAt |
| `Reminder` | userId, growId, type (watering/nutrients/training/harvest/custom), title, scheduledAt, recurrence, isCompleted |
| `Reaction` | targetId, targetType (grow/entry/comment), userId, emoji |
| `Comment` | targetId, targetType, userId, content, isEdited |

**API-Routen:**

| Pfad | Beschreibung |
|------|-------------|
| `GET /api/grows` | Eigene Grows |
| `POST /api/grows` | Grow erstellen |
| `GET /api/grows/:id` | Grow-Detail |
| `PATCH /api/grows/:id` | Grow bearbeiten (inkl. Strain-Verknüpfung) |
| `DELETE /api/grows/:id` | Grow löschen |
| `GET /api/grows/:id/stats` | Grow-Statistiken |
| `POST /api/grows/:id/harvest` | Ernte abschließen |
| `GET /api/journal/entries/:growId` | Einträge zu Grow |
| `POST /api/journal/entries` | Eintrag erstellen |
| `GET /api/journal/entries/:id/entry/:entryId` | Eintrag-Detail |
| `PATCH /api/journal/entries/:entryId` | Eintrag bearbeiten |
| `DELETE /api/journal/entries/:entryId` | Eintrag löschen |
| `POST /api/journal/photos` | Foto hochladen (multipart → S3) |
| `GET /api/journal/uploads/:filename` | Statische Fotos (legacy, lokal) |
| `GET /api/journal/reminders` | Erinnerungen |
| `POST /api/journal/reminders` | Erinnerung erstellen |
| `PATCH /api/journal/reminders/:id/complete` | Als erledigt markieren |
| `PATCH /api/journal/reminders/:id/skip` | Überspringen |
| `GET /api/journal/feed` | Öffentlicher Grows-Feed |
| `GET /api/grows/:id/public` | Öffentlicher Grow (optionale Auth) |
| `POST /api/journal/social/react` | Reaktion auf Grow/Eintrag |
| `POST /api/journal/social/comment` | Kommentar |
| `GET /api/journal/analytics` | Journal-Statistiken |
| `GET /api/journal/calendar` | Kalender-Ansicht (Erinnerungen nach Datum) |

---

### 5.4 notification-service (Port 3006)

**Basis-Image:** `node:20-alpine`
**DB:** MongoDB (`sf1_notification`) + Redis
**WebSocket:** socket.io auf `/ws/notifications`

**Mongoose-Modelle:**

| Modell | Felder |
|--------|--------|
| `Notification` | userId, type (comment/reply/reaction/follow/mention/price_alert/milestone/badge/system), title, message, link, isRead, actorId, entityId, entityType |
| `Preference` | userId, enabled, preferences{type: {in_app, email, push}}, emailDigest, quietHours{enabled, start, end} |
| `Device` | userId, token, platform (web/ios/android), lastSeen |

**Workers:**
- `email.worker.ts`: sendet E-Mail-Benachrichtigungen via Brevo SMTP
- `push.worker.ts`: Push-Notifications (vorbereitet)
- `queue.worker.ts`: liest aus Redis-Queue `queue:notifications` (BLPOP) und erstellt Notifications

**WebSocket-Auth (socket.io):**
1. Client verbindet zu `window.location.origin` mit `path: '/ws/notifications'`
2. Client sendet `auth` Event mit `{ userId, token }` (JWT aus Cookie)
3. Server verifiziert JWT mit `jwt.verify(token, JWT_SECRET)`
4. Bei Erfolg: Client tritt Room `user:${userId}` bei
5. Neue Notification → Server emittiert `notification:new` im User-Room

**API-Routen:**

| Pfad | Beschreibung |
|------|-------------|
| `GET /api/notifications` | Eigene Notifications (pagination, filter) |
| `PATCH /api/notifications/:id/read` | Als gelesen markieren |
| `PATCH /api/notifications/read-all` | Alle als gelesen |
| `DELETE /api/notifications/:id` | Löschen |
| `GET /api/notifications/unread-count` | Ungelesen-Zähler |
| `GET /api/preferences` | Benachrichtigungs-Einstellungen |
| `PATCH /api/preferences` | Einstellungen aktualisieren (inkl. quietHours) |

**Notification-Typen:**
- `comment` — Kommentar auf Grow
- `reply` — Antwort auf Thread-Reply
- `reaction` — Reaktion auf Grow/Eintrag
- `follow` — Jemand folgt dem User
- `mention` — @mention in Thread/Reply
- `price_alert` — Preisalarm ausgelöst
- `milestone` — Grow-Meilenstein
- `badge` — Achievement erhalten
- `system` — System-Nachrichten

---

### 5.5 price-service (Port 3002)

**Basis-Image:** `node:20-alpine`
**DB:** MongoDB (`sf1_price`) + Redis

**Mongoose-Modelle:**

| Modell | Felder |
|--------|--------|
| `Seed` | name, slug, breeder, seedbank, type (regular/feminized/autoflowering), thc, cbd, flowering_time, genetics, description, imageUrl, affiliateUrl, isActive, tags |
| `Price` | seedId, seedbank, price, currency, inStock, scrapedAt, affiliateUrl |
| `PriceAlert` | userId, seedId, targetPrice, isTriggered, triggeredAt |

**Feed-Adapter (11 Seedbanks):**
Jeder Adapter implementiert `BaseFeed` und scrapt/parst den jeweiligen Seedbank-Feed (XML/JSON/HTML):
- Royal Queen Seeds (rqs)
- FastBuds
- Dutch Passion
- Greenhouse Seeds
- Anesia Seeds
- Sensi Seeds
- Seedsman
- Zamnesia
- Paradise Seeds
- Weed Seed Shop
- Mr. Hanf

**Feed-Worker:** `feed.worker.ts` — läuft als Cron-Job, aktualisiert Preise täglich. Bei Preisunterschreitung: schreibt Message in Redis-Queue `queue:notifications`.

**API-Routen:**

| Pfad | Beschreibung |
|------|-------------|
| `GET /api/prices/browse` | Seeds durchstöbern (pagination, filter) |
| `GET /api/prices/search` | Seed-Suche |
| `GET /api/prices/today` | Heutige Angebote |
| `GET /api/prices/trending` | Trending Seeds |
| `GET /api/prices/compare` | Preisvergleich mehrerer Seeds |
| `GET /api/prices/seed/:slug` | Seed-Detail mit Preisverlauf |
| `GET /api/prices/click` | Affiliate-Klick-Tracking (Redirect) |
| `GET /api/prices/clicks/stats` | Klick-Statistiken (Admin) |
| `GET /api/alerts` | Eigene Preisalarme |
| `POST /api/alerts` | Preisalarm erstellen |
| `DELETE /api/alerts/:id` | Preisalarm löschen |

---

### 5.6 gamification-service (Port 3009)

**Basis-Image:** `node:20-alpine`
**DB:** MongoDB (`sf1_gamification`) + Redis

**Mongoose-Modelle:**

| Modell | Felder |
|--------|--------|
| `UserProfile` | userId, xp, level, streak, totalGrows, totalEntries, totalHarvests, totalComments, badges[] |
| `Achievement` | id, name, description, icon, xpReward, condition, category |
| `Badge` | userId, achievementId, earnedAt |
| `Event` | userId, type, data, processedAt |

**Services:**
- `event-processor.service.ts`: verarbeitet Events (Grow erstellt, Eintrag hinzugefügt, Harvest, usw.) → XP vergeben, Achievements prüfen
- `achievement.service.ts`: Achievement-Definitionen und -Prüfung
- `profile.service.ts`: XP/Level-Berechnungen

**API-Routen:**

| Pfad | Beschreibung |
|------|-------------|
| `GET /api/gamification/:userId` | User-Profil (XP, Level, Badges) |
| `GET /api/gamification/:userId/summary` | Kurzfassung |
| `GET /api/leaderboard` | Bestenliste |
| `GET /api/achievements` | Alle Achievements |
| `POST /api/gamification/admin/*` | Admin: XP vergeben, Reset |
| `GET /api/gamification/analytics/*` | Statistiken |

---

### 5.7 ai-service (Port 3010)

**Basis-Image:** `node:20-alpine`
**DB:** MongoDB (`sf1_ai`)
**API:** OpenAI (GPT-4o, GPT-4o-mini)

**API-Routen:**

| Pfad | Beschreibung |
|------|-------------|
| `POST /api/ai/diagnose` | Vollständige Pflanzen-Diagnose (Text + optional Bild) |
| `POST /api/ai/diagnose/quick` | Schnell-Diagnose |
| `GET /api/ai/diagnose/common` | Häufige Probleme |
| `POST /api/ai/advice` | Allgemeiner Grow-Rat |
| `POST /api/ai/advice/strain` | Strain-spezifische Empfehlungen |
| `POST /api/ai/advice/setup` | Setup-Beratung |
| `POST /api/ai/advice/harvest` | Ernte-Zeitpunkt-Analyse |
| `POST /api/ai/chat` | Chat-Nachricht senden |
| `GET /api/ai/chat/sessions` | Chat-Verläufe |
| `GET /api/ai/chat/sessions/:id` | Chat-Session-Detail |
| `GET /api/ai/admin/*` | AI-Monitoring (Admin) |

---

### 5.8 tools-service (Port 3004)

**Basis-Image:** `node:20-alpine`
**DB:** MongoDB (`sf1_tools`)

**Kalkulatoren:**

| Tool | Endpoint | Berechnet |
|------|----------|-----------|
| VPD | `POST /api/tools/vpd` | Vapor Pressure Deficit |
| EC/PPM | `POST /api/tools/ec-ppm` | Konversion EC ↔ PPM |
| DLI | `POST /api/tools/dli` | Daily Light Integral |
| PPFD | `POST /api/tools/ppfd` | Photosynthetic Photon Flux Density |
| Stromkosten | `POST /api/tools/power-cost` | Stromkosten-Kalkulation |
| CO₂ | `POST /api/tools/co2` | CO₂-Bedarf |
| Vergleich | `POST /api/tools/compare` | Szenarien-Vergleich |
| Presets | `GET /api/tools/presets` | Voreinstellungen |
| Verlauf | `GET /api/tools/history` | Berechnungs-Verlauf |

---

### 5.9 search-service (Port 3007)

**Basis-Image:** `node:20-alpine`
**DB:** Mehrere MongoDB-Verbindungen + Meilisearch + Redis

**Besonderheit:** Separate MongoDB-Verbindungen für jede Quelldatenbank:
- `MONGODB_URL` → sf1_search
- `MONGODB_URL_PRICES` → sf1_price
- `MONGODB_URL_COMMUNITY` → sf1_community
- `MONGODB_URL_JOURNAL` → sf1_journal

**Workers:** `reindex.worker.ts` — indiziert alle Daten in Meilisearch (muss sequenziell laufen, nicht parallel).

**Mongoose-Pattern:** Immer `mongoose.models['X'] || mongoose.model('X', schema)` — verhindert OverwriteModelError bei tsx watch.

**API-Routen:**

| Pfad | Beschreibung |
|------|-------------|
| `GET /api/search?q=...` | Übergreifende Suche (Strains, Seeds, Threads, Grows) |
| `GET /api/search/strains` | Strain-spezifische Suche |
| `GET /api/search/reindex` | Vollständige Reindizierung (Admin) |

---

### 5.10 media-service (Port 3008)

**Basis-Image:** `node:20-alpine`
**DB:** MongoDB (`sf1_media`)

Verwaltet Medien-Metadaten. Uploads gehen direkt in Hetzner Object Storage (S3).

---

### 5.11 backup-service (Port 3011)

**Basis-Image:** `node:20-slim` + `mongodb-database-tools` + `postgresql-client`
**Volumes:** `./backups:/backups`

**Funktionen:**
- `mongodump` → alle MongoDB-Datenbanken
- `pg_dump` → PostgreSQL sf1_db
- Komprimierung: `.tar.gz`
- Cron: täglich 02:00 (`0 2 * * *`)
- Rotation: 7 neueste Backups behalten
- REST-API für Admin-Zugriff (JWT-Auth)

**API-Routen:**

| Pfad | Beschreibung |
|------|-------------|
| `GET /health` | Health (public) |
| `GET /api/backup/status` | Status, letzter Lauf, Schedule (Admin) |
| `GET /api/backup/backups` | Backup-Liste (Admin) |
| `POST /api/backup/backups/trigger` | Manuell starten (Admin) |
| `DELETE /api/backup/backups/:name` | Löschen (Admin) |

---

## 6. Frontend — Next.js Web-App

### Architektur

- **Framework:** Next.js 14 App Router
- **Rendering:** Primär Client-Side (alle Seiten `'use client'`), wenige Server-Seiten (landing, SEO-Seiten)
- **Build:** Production-Build in Container (`npm run build && npm run start`)
- **API-Calls:** Alle über `api-client.ts` (Axios-Wrapper mit JWT-Cookie automatisch)

### API-Client (`src/lib/api-client.ts`)

```typescript
// Axios-Instance mit Interceptor:
// - Request: liest JWT aus Cookie 'sf1_access_token', setzt Authorization: Bearer
// - Response: gibt response.data direkt zurück (kein .data Wrapping nötig)
// - 401: Redirect zu /auth/login
const api = { get, post, put, patch, delete };
```

### Auth-Provider (`src/components/providers/auth-provider.tsx`)

```typescript
// Context: { user, isLoading, isAuthenticated, login, logout, refetch }
// Holt User via GET /api/auth/verify beim Mount
// Heartbeat: alle 5min GET /api/auth/verify (Auto-Logout bei 401)
```

### Verzeichnisstruktur

```
apps/web-app/src/
├── app/                    # Next.js App Router Pages (66 page.tsx Dateien)
├── components/
│   ├── admin/              # Admin-Komponenten (AdZoneEditor, etc.)
│   ├── ads/                # AdCarousel
│   ├── ai/                 # AI-Komponenten
│   ├── analytics/          # Analytics-Charts
│   ├── community/          # Forum-Komponenten
│   ├── follows/            # Follow-Komponenten
│   ├── journal/            # Journal/Grow-Komponenten
│   ├── layout/             # DashboardLayout, Sidebar, Header
│   ├── messages/           # Nachrichten-Komponenten
│   ├── notifications/      # Notification-Komponenten
│   ├── providers/          # AuthProvider, ThemeProvider, QueryProvider
│   ├── search/             # Suche
│   ├── tools/              # Rechner-Komponenten
│   └── ui/                 # shadcn/ui Basiskomponenten
├── hooks/                  # React Query Hooks (22 Hook-Dateien)
└── lib/
    ├── api-client.ts
    └── utils.ts
```

### React Query Hooks

| Hook-Datei | Zuständig für |
|------------|--------------|
| `use-journal.ts` | Grows, Einträge, Fotos |
| `use-community.ts` | Threads, Replies, Votes, Kategorien |
| `use-notifications.ts` | Notifications, Preferences |
| `use-realtime-notifications.ts` | WebSocket-Verbindung |
| `use-gamification.ts` | XP, Level, Achievements, Leaderboard |
| `use-strains.ts` | Strain-Daten, Reviews |
| `use-ads.ts` | Ads, Tracking, Stats |
| `use-ad-zones.ts` | Zonen-Konfiguration |
| `use-backup.ts` | Backup-Status, -Liste, -Trigger |
| `use-follows.ts` | Follow/Unfollow, Feed |
| `use-messages.ts` | Nachrichten, Konversationen |
| `use-reminders.ts` | Erinnerungen |
| `use-analytics.ts` | Plattform-Analytics |
| `use-admin.ts` | Admin-Dashboard-Daten |
| `use-ai-monitoring.ts` | AI-Service-Monitoring |
| `use-scraper.ts` | Feed-Import-Status |
| `use-debounce.ts` | Utility-Hook |

---

## 7. Monitoring-Stack

### Prometheus + Grafana + Alertmanager

Alle Microservices implementieren `prom-client` und exponieren `/metrics` (Prometheus-Format).

**Prometheus scrapt:**
- Alle 11 Microservices (15s Intervall)
- Node-Exporter (CPU, RAM, Disk, Netzwerk)
- Retention: 15 Tage

**Grafana:**
- URL: `https://grafana.seedfinderpro.de`
- Admin-Credentials via `GRAFANA_ADMIN_PASSWORD`
- Dashboards: Provisioniert über `./monitoring/grafana/provisioning/`

**Alertmanager:**
- Alerts via Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`)
- Konfiguration: `./monitoring/alertmanager/alertmanager.yml`

### Log-Aggregation (Loki + Promtail)

- **Promtail** liest Docker-Container-Logs via Docker-Socket
- Sendet an **Loki**
- Grafana zeigt Logs über Loki-Datasource

### Node-Exporter

Host-Metriken (CPU, RAM, Disk, Netzwerk) via PID-Namespace des Hosts.

---

## 8. Backup-System

### Automatisch (Cron)

- **Zeitplan:** Täglich 02:00 Uhr UTC
- **MongoDB:** `mongodump --uri mongodb://sf1_admin:PASS@mongodb:27017 --authenticationDatabase=admin`
- **PostgreSQL:** `pg_dump -h postgres -U sf1_user -d sf1_db`
- **Komprimierung:** `tar -czf backup-TIMESTAMP.tar.gz`
- **Speicherort:** `/root/SF-1-Ultimate-/backups/` (Host-Verzeichnis, gemountet als Volume)
- **Rotation:** 7 neueste Backups, ältere werden automatisch gelöscht

### Manuell

Via Admin-UI unter `/admin/backup` oder direkt:
```bash
cd /root/SF-1-Ultimate-/backups/
ls -lh *.tar.gz
```

### Wiederherstellung

```bash
# MongoDB
mongorestore --uri "mongodb://sf1_admin:PASS@localhost:27017" \
  --authenticationDatabase=admin backup-TIMESTAMP/mongodb/

# PostgreSQL
psql -h localhost -U sf1_user -d sf1_db < backup-TIMESTAMP/postgres/sf1_db.sql
```

---

## 9. Authentifizierung & Sicherheit

### JWT-Flow

```
1. POST /api/auth/login
   → JWT Access Token (15min) als Cookie 'sf1_access_token' (httpOnly)
   → JWT Refresh Token (7 Tage) als Cookie 'sf1_refresh_token' (httpOnly)

2. Jeder API-Request:
   → Frontend liest Cookie, setzt Authorization: Bearer <token>
   → Service verifiziert: jwt.verify(token, JWT_SECRET)
   → req.user = { userId, email, role }

3. Token abgelaufen:
   → Axios-Interceptor fängt 401
   → POST /api/auth/refresh mit Refresh-Token
   → Neuer Access Token
   → Original-Request wird wiederholt

4. Auto-Logout:
   → Heartbeat alle 5min: GET /api/auth/verify
   → Bei 401: logout() → Cookie löschen → Redirect /landing
```

### Auth-Middleware (alle Services)

Jeder Service implementiert eigene JWT-Verifikation (kein Traefik ForwardAuth):

```typescript
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  req.user = { id: payload.userId, email: payload.email, role: payload.role };
  next();
};
```

### Internal-Service-Kommunikation

Für Service-zu-Service Calls ohne User-Kontext:
```
X-Internal-Secret: ${INTERNAL_SECRET}
```

### Rollen

| Rolle | Beschreibung |
|-------|-------------|
| `USER` | Standard-Nutzer |
| `PREMIUM` | Premium-Nutzer (erweiterte Funktionen) |
| `MODERATOR` | Forum-Moderator |
| `ADMIN` | Vollzugriff auf Admin-Panel |

### CORS

Alle Services: `origin: process.env.CORS_ORIGIN || 'https://seedfinderpro.de'`

---

## 10. Externe Dienste & APIs

| Dienst | Verwendung | Konfiguration |
|--------|-----------|---------------|
| **OpenAI** | AI-Assistent, Diagnose, Chat | `OPENAI_API_KEY` |
| **Hetzner Object Storage** | Foto-Upload (S3-kompatibel) | `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` |
| **Brevo (ehemals Sendinblue)** | E-Mail (SMTP) | `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=2525`, `SMTP_USER`, `SMTP_PASS` |
| **Telegram** | Monitoring-Alerts | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| **Let's Encrypt** | SSL-Zertifikate | Automatisch via Traefik ACME |

**Noch nicht konfiguriert / optional:**
- UptimeRobot (Uptime-Monitoring)
- Hetzner Storage Box (Offsite-Backups via rsync/sftp)
- Google OAuth, Discord OAuth (`GOOGLE_CLIENT_ID`, etc. leer)

---

## 11. Umgebungsvariablen

Alle Variablen in `/root/SF-1-Ultimate-/.env`:

```env
# Datenbanken
POSTGRES_PASSWORD=<stark>
MONGO_PASSWORD=<stark>
REDIS_PASSWORD=<stark>
MEILISEARCH_MASTER_KEY=<stark>

# JWT
JWT_SECRET=<64-char-hex>
JWT_REFRESH_SECRET=<64-char-hex>

# Service-Kommunikation
INTERNAL_SECRET=<string>

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Hetzner S3
S3_ENDPOINT=https://fsn1.your-objectstorage.com
S3_BUCKET=sf1-uploads
S3_REGION=eu-central
S3_ACCESS_KEY=<key>
S3_SECRET_KEY=<secret>

# E-Mail (Brevo)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=2525
SMTP_USER=<user>@smtp-brevo.com
SMTP_PASS=<pass>
SMTP_FROM=noreply@seedfinderpro.de

# Monitoring
GRAFANA_ADMIN_PASSWORD=<string>
TELEGRAM_BOT_TOKEN=<token>
TELEGRAM_CHAT_ID=<chat-id>

# Traefik BasicAuth (htpasswd-Format)
TRAEFIK_DASHBOARD_USERS=admin:$$apr1$$...

# CORS
CORS_ORIGIN=https://seedfinderpro.de

# Service-URLs (intern)
NOTIFICATION_SERVICE_URL=http://sf1-notification-service:3006
SEARCH_SERVICE_URL=http://sf1-search-service:3007

# Frontend
NEXT_PUBLIC_API_URL=""  # leer = same-origin
```

---

## 12. Deployment & Betrieb

### Erstmaliges Setup

```bash
# 1. Repo klonen / Dateien auf Server kopieren
cd /root/SF-1-Ultimate-

# 2. .env befüllen (alle Variablen setzen)
cp .env.example .env
nano .env

# 3. Backups-Verzeichnis erstellen
mkdir -p backups

# 4. Alle Services starten
docker-compose up -d

# 5. Status prüfen
docker-compose ps
docker-compose logs -f --tail=50
```

### Wichtige Operationen

```bash
# Frontend nach Code-Änderungen neu bauen (5-10 Min)
docker-compose restart frontend

# Einzelnen Service nach Code-Änderungen neu starten
docker-compose restart community-service

# Meilisearch reindizieren (Admin-Endpoint)
curl -X POST https://seedfinderpro.de/api/search/reindex \
  -H "Authorization: Bearer <admin-jwt>"

# Logs eines Services
docker-compose logs -f journal-service

# In Container einsteigen
docker exec -it sf1-community-service sh

# Backup manuell auslösen
# Via Admin-UI: https://seedfinderpro.de/admin/backup
```

### Frontend-Rebuild-Prozess

Das Frontend ist ein **Production-Build** (kein Hot-Reload). Jede Code-Änderung erfordert:

```bash
docker-compose restart frontend
# Wartezeit: ~5-10 Minuten (npm install + next build + next start)
# Status prüfen:
docker-compose logs --tail=5 frontend
# Bereit wenn: "✓ Ready in Xms"
```

### Service-Abhängigkeiten

```
mongodb (healthy) ──┬──► auth-service
                    ├──► community-service
                    ├──► journal-service
                    ├──► notification-service
                    ├──► gamification-service
                    ├──► price-service
                    ├──► search-service
                    ├──► ai-service
                    └──► backup-service

postgres (healthy) ─────► auth-service

redis (healthy) ────┬──► auth-service
                    ├──► journal-service
                    ├──► notification-service
                    ├──► gamification-service
                    ├──► price-service
                    └──► community-service

meilisearch ────────────► search-service
```

---

## 13. Vollständige API-Referenz

### Basis-URL

Alle API-Calls: `https://seedfinderpro.de` (Production) oder `http://localhost` (Dev)

### Auth-Endpoints

```
POST   /api/auth/register              → { user, token }
POST   /api/auth/login                 → Cookies setzen
POST   /api/auth/logout                → Cookies löschen
GET    /api/auth/verify                → { user }
POST   /api/auth/refresh               → Neuer Access Token
GET    /api/auth/me                    → Eigenes Profil
GET    /api/auth/users/:username       → Öffentliches Profil
GET    /api/auth/users/by-id/:userId   → User nach ID
PATCH  /api/auth/profile               → Profil bearbeiten
POST   /api/auth/profile/avatar        → Avatar hochladen
POST   /api/auth/forgot-password       → Reset-E-Mail
POST   /api/auth/reset-password        → Passwort zurücksetzen
POST   /api/auth/change-password       → Passwort ändern
```

### Journal-Endpoints

```
GET    /api/grows                      → Eigene Grows
POST   /api/grows                      → Grow erstellen
GET    /api/grows/:id                  → Grow-Detail
PATCH  /api/grows/:id                  → Grow bearbeiten
DELETE /api/grows/:id                  → Grow löschen
POST   /api/grows/:id/harvest          → Ernten
GET    /api/grows/:id/stats            → Statistiken
GET    /api/grows/:id/public           → Öffentlicher Grow
GET    /api/journal/entries/:growId    → Einträge
POST   /api/journal/entries            → Eintrag erstellen
PATCH  /api/journal/entries/:id        → Eintrag bearbeiten
DELETE /api/journal/entries/:id        → Eintrag löschen
POST   /api/journal/photos             → Foto hochladen
GET    /api/journal/reminders          → Erinnerungen
POST   /api/journal/reminders          → Erinnerung erstellen
PATCH  /api/journal/reminders/:id/complete → Erledigt
GET    /api/journal/feed               → Öffentlicher Feed
GET    /api/journal/calendar           → Kalender-Ansicht
POST   /api/journal/social/react       → Reaktion
POST   /api/journal/social/comment     → Kommentar
```

### Community-Endpoints

```
GET    /api/community/threads          → Thread-Liste
POST   /api/community/threads          → Thread erstellen
GET    /api/community/threads/:id      → Thread-Detail
PATCH  /api/community/threads/:id      → Thread bearbeiten
DELETE /api/community/threads/:id      → Thread löschen
GET    /api/community/threads/search   → Suche
POST   /api/community/replies          → Reply erstellen
PATCH  /api/community/replies/:id      → Reply bearbeiten
DELETE /api/community/replies/:id      → Reply löschen
POST   /api/community/votes            → Abstimmen
GET    /api/community/categories       → Kategorien
GET    /api/community/follows/feed     → Following-Feed
POST   /api/community/follows          → Folgen/Entfolgen
GET    /api/community/messages         → Nachrichten
POST   /api/community/messages         → Nachricht senden
GET    /api/community/strains          → Strains
GET    /api/community/strains/:id      → Strain-Detail
GET    /api/community/strains/:slug/reviews → Reviews
POST   /api/community/strains/:slug/reviews → Review schreiben
GET    /api/community/ads              → Aktive Ads
POST   /api/community/ads/:id/impression → Impression
POST   /api/community/ads/:id/click    → Click
GET    /api/community/ads/zones        → Zonen-Konfig
```

### Notification-Endpoints

```
GET    /api/notifications              → Liste (mit Filter/Pagination)
PATCH  /api/notifications/:id/read     → Als gelesen
PATCH  /api/notifications/read-all     → Alle gelesen
DELETE /api/notifications/:id          → Löschen
GET    /api/notifications/unread-count → Zähler
GET    /api/preferences                → Einstellungen
PATCH  /api/preferences                → Einstellungen speichern
```

### Gamification-Endpoints

```
GET    /api/gamification/:userId       → User-Profil
GET    /api/gamification/:userId/summary → Kurzfassung
GET    /api/leaderboard                → Bestenliste
GET    /api/achievements               → Alle Achievements
```

### Price-Endpoints

```
GET    /api/prices/browse              → Seeds (pagination)
GET    /api/prices/search              → Suche
GET    /api/prices/today               → Heutige Deals
GET    /api/prices/trending            → Trending
GET    /api/prices/compare             → Preisvergleich
GET    /api/prices/seed/:slug          → Seed-Detail
GET    /api/prices/click               → Affiliate-Klick
GET    /api/alerts                     → Preisalarme
POST   /api/alerts                     → Alarm erstellen
DELETE /api/alerts/:id                 → Alarm löschen
```

### AI-Endpoints

```
POST   /api/ai/diagnose                → Pflanzen-Diagnose
POST   /api/ai/diagnose/quick          → Schnell-Diagnose
GET    /api/ai/diagnose/common         → Häufige Probleme
POST   /api/ai/advice                  → Grow-Rat
POST   /api/ai/advice/strain           → Strain-Empfehlung
POST   /api/ai/advice/setup            → Setup-Beratung
POST   /api/ai/advice/harvest          → Ernte-Analyse
POST   /api/ai/chat                    → Chat-Nachricht
GET    /api/ai/chat/sessions           → Chat-Verläufe
GET    /api/ai/chat/sessions/:id       → Session-Detail
```

### Tools-Endpoints

```
POST   /api/tools/vpd                  → VPD berechnen
POST   /api/tools/ec-ppm               → EC↔PPM
POST   /api/tools/dli                  → DLI berechnen
POST   /api/tools/ppfd                 → PPFD berechnen
POST   /api/tools/power-cost           → Stromkosten
POST   /api/tools/co2                  → CO₂-Bedarf
POST   /api/tools/compare              → Szenarien vergleichen
GET    /api/tools/presets              → Voreinstellungen
GET    /api/tools/history              → Verlauf
```

### Search-Endpoints

```
GET    /api/search?q=...               → Globale Suche
GET    /api/search/strains?q=...       → Strain-Suche
POST   /api/search/reindex             → Reindizieren (Admin)
```

### Backup-Endpoints (Admin)

```
GET    /api/backup/status              → Status + Schedule
GET    /api/backup/backups             → Backup-Liste
POST   /api/backup/backups/trigger     → Manuell starten
DELETE /api/backup/backups/:name       → Backup löschen
```

---

## 14. Datenmodelle

### MongoDB — community-service

**Thread:**
```typescript
{
  _id: ObjectId,
  title: string,
  content: string,           // Markdown
  category: ObjectId,        // → Category
  authorId: string,          // userId aus PostgreSQL
  slug: string,              // URL-freundlich, unique
  isPinned: boolean,
  isLocked: boolean,
  isSolved: boolean,
  viewCount: number,
  replyCount: number,
  voteScore: number,
  isPublic: boolean,
  tags: string[],
  createdAt: Date,
  updatedAt: Date
}
```

**Ad:**
```typescript
{
  _id: ObjectId,
  type: 'rectangle' | 'square',
  title: string,
  imageUrl: string,
  link: string,
  linkTarget: '_blank' | '_self',
  altText: string,
  isActive: boolean,
  order: number,
  // Buchungsdaten
  clientName?: string,
  clientEmail?: string,
  startDate?: Date,
  endDate?: Date,
  budget?: number,           // in EUR
  cpm?: number,              // Cost per Mille
  // Tracking
  impressions: number,       // default: 0
  clicks: number,            // default: 0
  createdAt: Date
}
```

### MongoDB — journal-service

**Grow:**
```typescript
{
  _id: ObjectId,
  userId: string,
  title: string,
  strainName: string,
  strainId?: string,         // Link zu community-service Strain
  phase: 'seedling' | 'veg' | 'flower' | 'harvest',
  isPublic: boolean,
  isFinished: boolean,
  coverPhotoUrl?: string,
  startDate: Date,
  harvestDate?: Date,
  totalYield?: number,       // in Gramm
  rating?: number,           // 1-5
  tags: string[],
  createdAt: Date
}
```

**Entry:**
```typescript
{
  _id: ObjectId,
  growId: ObjectId,
  userId: string,
  date: Date,
  title: string,
  content: string,           // Markdown
  phase: string,
  week: number,
  day: number,
  measurements: {
    height_cm?: number,
    ph?: number,
    ec?: number,
    temperature?: number,    // °C
    humidity?: number,       // %
    vpd?: number,
    light_hours?: number,
    water_ml?: number,
    nutrients?: string
  },
  photos: ObjectId[],        // → Photo
  createdAt: Date
}
```

### PostgreSQL — auth-service (Prisma)

```sql
User {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String?  @unique
  passwordHash String?
  role      UserRole @default(USER)    -- USER | PREMIUM | MODERATOR | ADMIN
  provider  AuthProvider @default(LOCAL) -- LOCAL | GOOGLE | DISCORD
  isVerified Boolean @default(false)
  isActive  Boolean @default(true)
  isBanned  Boolean @default(false)
  avatar    String?
  bio       String?
  createdAt DateTime @default(now())
}

Session {
  id        String   @id
  userId    String
  token     String   @unique
  expiresAt DateTime
}

RefreshToken {
  id        String   @id
  userId    String
  token     String   @unique
  expiresAt DateTime
}
```

---

## 15. Frontend-Routen & Seiten

### Öffentliche Routen (ohne Login)

| Route | Seite |
|-------|-------|
| `/` | Root → Redirect zu `/dashboard` (eingeloggt) oder `/landing` |
| `/landing` | Landing Page (Feature-Übersicht, nur Login/Register klickbar) |
| `/auth/login` | Login |
| `/auth/register` | Registrierung |
| `/auth/forgot-password` | Passwort vergessen |
| `/auth/reset-password` | Passwort zurücksetzen |
| `/about` | Über die Plattform |
| `/privacy` | Datenschutz |
| `/contact` | Kontakt |
| `/strains` | Strain-Datenbank (SEO-optimiert) |
| `/strains/[slug]` | Strain-Detail (SEO-optimiert, JSON-LD) |
| `/strains/compare` | Strain-Vergleich |

### Authentifizierte Routen (DashboardLayout mit Sidebar)

| Route | Seite |
|-------|-------|
| `/dashboard` | Dashboard (KPIs, aktive Grows, Erinnerungen, Quick-Actions) |
| `/journal` | Grow-Journal-Übersicht |
| `/journal/new` | Neuen Grow anlegen |
| `/journal/[id]` | Grow-Detail |
| `/journal/[id]/edit` | Grow bearbeiten |
| `/journal/[id]/entry/new` | Eintrag hinzufügen |
| `/journal/[id]/entry/[entryId]` | Eintrag-Detail |
| `/journal/[id]/entry/[entryId]/edit` | Eintrag bearbeiten |
| `/journal/stats` | Statistiken |
| `/grows` | Öffentliche Grows (Discovery-Feed) |
| `/grows/[id]` | Öffentlicher Grow-Detail |
| `/community` | Forum-Übersicht (Kategorien, Thread-Liste) |
| `/community/new` | Neuen Thread erstellen |
| `/community/[slug]` | Kategorie-Seite |
| `/community/thread/[id]` | Thread-Detail mit Replies |
| `/messages` | Nachrichten-Übersicht |
| `/notifications` | Notification-Center (Filter, Pagination) |
| `/calendar` | Grow-Kalender |
| `/prices` | Preisvergleich (Browse, Suche, Filter) |
| `/seedbanks` | Seedbank-Übersicht mit Reviews |
| `/alerts` | Preisalarme verwalten |
| `/search` | Globale Suche |
| `/ai` | AI-Assistent Hub |
| `/ai/chat` | AI-Chat |
| `/ai/diagnose` | Pflanzen-Diagnose |
| `/ai/advisor` | Grow-Berater |
| `/tools` | Rechner-Tools Hub |
| `/tools/vpd` | VPD-Rechner |
| `/tools/ppfd` | PPFD-Rechner |
| `/leaderboard` | Bestenliste (XP-Rangliste) |
| `/profile` | Eigenes Profil |
| `/profile/[username]` | Fremdes Profil |
| `/settings` | Einstellungen (Notifications, QuietHours) |

### Admin-Routen (nur ADMIN-Rolle)

| Route | Seite |
|-------|-------|
| `/admin` | Admin-Dashboard (KPIs, System-Health) |
| `/admin/users` | Nutzerverwaltung |
| `/admin/threads` | Thread-Verwaltung |
| `/admin/grows` | Grows-Verwaltung |
| `/admin/categories` | Forum-Kategorien |
| `/admin/moderation` | Moderations-Queue |
| `/admin/strains` | Strain-Verwaltung |
| `/admin/seedbanks` | Seedbank-Verwaltung |
| `/admin/scraper` | Feed-Importer |
| `/admin/clicks` | Affiliate-Klick-Statistiken |
| `/admin/ads` | Werbeanzeigen (Buchungen, Stats, Zonen) |
| `/admin/achievements` | Achievement-Verwaltung |
| `/admin/analytics` | Plattform-Analytics |
| `/admin/ai` | AI-Service-Monitoring |
| `/admin/logs` | System-Logs |
| `/admin/settings` | Admin-Einstellungen |
| `/admin/backup` | Backup-Verwaltung |

---

## Anhang: Schnell-Referenz für Nachbau

### Minimales Setup (Reihenfolge)

1. `.env` mit allen Secrets befüllen
2. `docker-compose up -d mongodb postgres redis` (Datenbanken)
3. Warten bis alle healthy: `docker-compose ps`
4. `docker-compose up -d` (alle Services)
5. Admin-Account erstellen: Ersten User über `/api/auth/register` erstellen, dann in PostgreSQL Rolle auf `ADMIN` setzen:
   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';
   ```
6. Strains importieren: `/admin/scraper` → Feed-Import starten
7. Meilisearch befüllen: `POST /api/search/reindex`

### Kritische Konfigurationspunkte

- **JWT_SECRET** muss in allen Services identisch sein
- **MONGO_PASSWORD** darf keine Shell-Sonderzeichen enthalten (Vermeidung von Escape-Problemen)
- Traefik ACME: Domain muss auf Server-IP zeigen, Port 80 muss erreichbar sein
- Frontend hat keinen Hot-Reload: nach jeder Änderung `docker-compose restart frontend` (5-10 Min)
- Express-Routen: Spezifische Routen immer VOR parameterisierten Routen (`/stats` vor `/:id`)
- Meilisearch Reindex: MUSS sequenziell laufen (nicht Promise.all)

### Häufige Fehler beim Nachbau

| Problem | Ursache | Lösung |
|---------|---------|--------|
| 401 bei allen API-Calls | JWT_SECRET unterschiedlich | Alle Services prüfen |
| Auth-Service startet nicht | Prisma fehlt openssl | `apt-get install openssl` im Dockerfile |
| Suche liefert nichts | Meilisearch leer | `POST /api/search/reindex` |
| WebSocket verbindet nicht | Traefik WebSocket-Support | Header `Connection: upgrade` in Traefik |
| Frontend zeigt weiß | Build-Fehler | `docker-compose logs frontend` prüfen |
| MongoDB Verbindungsfehler | authSource fehlt | `?authSource=admin&directConnection=true` in URL |
| OverwriteModelError | Mongoose Model doppelt | `mongoose.models['X'] \|\| mongoose.model(...)` Pattern |

---

*Bericht erstellt: 2026-03-05 | SF-1 Ultimate Session 29*

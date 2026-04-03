# SF-1 Ultimate - Claude Code Kontext

**Letzte Aktualisierung:** 2026-03-06 (Session 32 - Hetzner S3 ✅ | Session 31 - SMTP/E-Mail ✅ | Session 30 - Forum-Moderation ✅ | Session 29 - Backup ✅)
**Vollständige Dokumentation:** `DOKUMENTATION.md` im Projekt-Root
**Projekt:** seedfinderpro.de - Cannabis Growing Community Platform

---

## Projekt-Übersicht

Eine Fullstack Cannabis-Community-Plattform mit:
- Grow-Journalen
- Forum/Community
- Strain-Datenbank (184 Strains importiert)
- Preisvergleich für Seeds
- AI-Assistent (OpenAI GPT-4)
- Volltext-Suche (Meilisearch)
- Gamification-System

---

## Tech Stack

| Komponente | Technologie |
|------------|-------------|
| Frontend | Next.js 14, React 18, TailwindCSS |
| API Gateway | Traefik v2.10 (HTTPS, Let's Encrypt) |
| Auth | JWT Tokens, PostgreSQL (Prisma) |
| Datenbanken | MongoDB 7, PostgreSQL 15, Redis 7 |
| Suche | Meilisearch v1.5 |
| Container | Docker Compose |
| Domain | seedfinderpro.de |

---

## Microservices (alle laufen auf sf1-network)

| Service | Port | Pfad | Status |
|---------|------|------|--------|
| frontend | 3000 | / | ✅ |
| auth-service | 3001 | /api/auth/* | ✅ |
| price-service | 3002 | /api/prices/*, /api/strains/* | ✅ |
| journal-service | 3003 | /api/journal/*, /api/grows/* | ✅ |
| tools-service | 3004 | /api/tools/* | ✅ |
| community-service | 3005 | /api/community/* | ✅ |
| notification-service | 3006 | /api/notifications/* | ✅ |
| search-service | 3007 | /api/search/* | ✅ |
| media-service | 3008 | /api/media/* | ✅ |
| gamification-service | 3009 | /api/gamification/* | ✅ |
| ai-service | 3010 | /api/ai/* | ✅ |
| backup-service | 3011 | /api/backup/* | ✅ |

---

## Was wurde gemacht

### Session 1-2 (früher)
- Docker-Setup mit allen Services
- Traefik Routing konfiguriert
- Auth-System mit JWT implementiert
- Community-Service mit Forum

### Session 3
1. **Auth-Pfade gefixt** - `/auth/*` → `/api/auth/*` für Traefik
2. **Admin-Zugang erstellt** - User-Rolle auf ADMIN gesetzt
3. **Kategorien-Erstellung gefixt** - authMiddleware vor moderatorMiddleware
4. **AI-Service gefixt** - JWT-Auth statt nur X-User-Id Header
5. **OpenAI integriert** - API-Key in .env
6. **Strains importiert** - 184 Strains von Cannlytics API
7. **Meilisearch Sync** - Strains in Suchindex
8. **Health-Endpoints** - Alle Services haben `/api/{service}/health`
9. **Admin-Panel erweitert**:
   - Neue Strains-Verwaltung (`/admin/strains`)
   - UI-Komponenten: Badge, Table, Select, Dialog

### Session 5 - Feature 1: Benachrichtigungen (2026-02-03)

**Backend:**
- `apps/notification-service/src/middleware/auth.ts` - JWT-Support hinzugefügt
- `apps/notification-service/package.json` - jsonwebtoken Dependency
- `docker-compose.yml` - JWT_SECRET für notification-service

**Frontend:**
- `apps/web-app/src/hooks/use-notifications.ts` - React Query Hooks
- `apps/web-app/src/app/notifications/page.tsx` - Benachrichtigungs-Seite
- `apps/web-app/src/components/layout/notifications-dropdown.tsx` - API-Pfade korrigiert

**Features:**
- Benachrichtigungs-Dropdown in Navigation (Bell-Icon)
- Unread-Counter Badge
- Typen: comment, reply, reaction, follow, mention, price_alert, milestone, badge, system
- Alle als gelesen markieren
- Vollständige Benachrichtigungs-Seite unter `/notifications`

---

### Session 5 - Feature 2: Private Nachrichten (2026-02-03)

**Backend (community-service):**
- `apps/community-service/src/models/Conversation.model.ts` - Conversation Model (2 Participants, unreadCounts)
- `apps/community-service/src/models/Message.model.ts` - Message Model (sender, receiver, content)
- `apps/community-service/src/services/message.service.ts` - Business Logic
- `apps/community-service/src/routes/messages.routes.ts` - REST API Endpoints
- `apps/community-service/src/index.ts` - Route registriert

**API Endpoints:**
- `GET /api/community/messages/conversations` - Alle Konversationen
- `GET /api/community/messages/unread-count` - Ungelesene Nachrichten Anzahl
- `POST /api/community/messages/send` - Nachricht senden
- `GET /api/community/messages/conversation/:id` - Nachrichten einer Konversation
- `POST /api/community/messages/conversation/:id/read` - Als gelesen markieren
- `DELETE /api/community/messages/conversation/:id` - Konversation löschen (soft)
- `DELETE /api/community/messages/:id` - Nachricht löschen (soft)
- `POST /api/community/messages/start/:userId` - Konversation starten

**Frontend:**
- `apps/web-app/src/hooks/use-messages.ts` - React Query Hooks
- `apps/web-app/src/app/messages/page.tsx` - Nachrichten-Seite (Chat-Interface)
- `apps/web-app/src/components/messages/message-dropdown.tsx` - Header Dropdown
- `apps/web-app/src/components/ui/avatar.tsx` - Avatar UI Komponente
- `apps/web-app/src/components/layout/header.tsx` - MessageDropdown hinzugefügt
- `apps/web-app/src/components/layout/sidebar.tsx` - "Nachrichten" Link hinzugefügt

**Features:**
- Chat-Interface mit Konversations-Liste und Nachrichten-Ansicht
- Unread-Counter Badge im Header
- Nachrichten senden und empfangen
- Als gelesen markieren
- Konversationen löschen (soft delete per User)
- Responsive Design (Mobile: Liste/Chat separat)
- Suche in Konversationen

**URL:** https://seedfinderpro.de/messages

---

### Session 5 - Feature 3: Follow-System (2026-02-03)

**Backend (community-service):**
- `apps/community-service/src/models/Follow.model.ts` - Follow Model (follower, following)
- `apps/community-service/src/services/follow.service.ts` - Business Logic
- `apps/community-service/src/routes/follows.routes.ts` - REST API Endpoints
- `apps/community-service/src/index.ts` - Route registriert

**Backend (auth-service):**
- `apps/auth-service/src/routes/auth.routes.ts` - `/users/:username` Endpoint hinzugefügt
- `apps/auth-service/src/services/user.service.ts` - `findByUsername()` Methode hinzugefügt

**API Endpoints:**
- `POST /api/community/follows/:userId` - User folgen
- `DELETE /api/community/follows/:userId` - User entfolgen
- `GET /api/community/follows/check/:userId` - Follow-Status prüfen
- `GET /api/community/follows/stats/:userId` - Follower/Following Counts
- `GET /api/community/follows/followers/:userId` - Follower-Liste
- `GET /api/community/follows/following/:userId` - Following-Liste
- `GET /api/community/follows/suggestions` - Vorgeschlagene User
- `GET /api/community/follows/mutual/:userId` - Gemeinsame Follower
- `GET /api/auth/users/:username` - User-Profil öffentlich

**Frontend:**
- `apps/web-app/src/hooks/use-follows.ts` - React Query Hooks
- `apps/web-app/src/components/follows/follow-button.tsx` - Follow/Unfollow Button
- `apps/web-app/src/components/follows/follow-stats.tsx` - Follower/Following Anzeige
- `apps/web-app/src/components/follows/followers-list.tsx` - Follower/Following Listen
- `apps/web-app/src/components/ui/skeleton.tsx` - Skeleton Loader UI
- `apps/web-app/src/app/profile/[username]/page.tsx` - Öffentliche Profilseite
- `apps/web-app/src/app/profile/page.tsx` - FollowStats hinzugefügt

**Features:**
- Anderen Usern folgen/entfolgen
- Follower/Following Counts auf Profil
- Follow-Button mit Hover-Effekt ("Folgst du" -> "Entfolgen")
- Öffentliche Profilseiten unter `/profile/[username]`
- Vorschläge für User zum Folgen
- Gemeinsame Follower anzeigen

---

### Session 5 - Feature 4: Strain-Vergleich (2026-02-04)

**Frontend:**
- `apps/web-app/src/hooks/use-strains.ts` - React Query Hooks für Strains
- `apps/web-app/src/app/strains/page.tsx` - Strain-Datenbank Übersicht
- `apps/web-app/src/app/strains/compare/page.tsx` - Strain-Vergleichsseite
- `apps/web-app/src/components/layout/sidebar.tsx` - "Strains" Link hinzugefügt

**Features:**
- Strain-Datenbank mit Suche und Filter (Type: Indica/Sativa/Hybrid/Autoflower)
- Paginierte Strain-Liste mit Karten-Ansicht
- Bis zu 4 Strains zum Vergleich auswählen
- Side-by-Side Vergleichskarten mit:
  - THC/CBD Werte
  - Genetik
  - Effekte
  - Aromen/Flavors
- Vergleichstabelle für schnellen Überblick
- Deep-Links für Vergleiche via URL-Parameter

**URLs:**
- https://seedfinderpro.de/strains - Strain-Datenbank
- https://seedfinderpro.de/strains/compare - Vergleichsseite
- https://seedfinderpro.de/strains/compare?ids=id1,id2 - Direkter Vergleich

---

### Session 5 (2026-02-03) - Analytics Dashboard

#### 1. Backend Analytics Endpoints erstellt
**Neue Dateien:**
- `apps/auth-service/src/routes/analytics.routes.ts` - User-Statistiken (PostgreSQL/Prisma)
- `apps/community-service/src/routes/analytics.routes.ts` - Thread/Reply-Stats (MongoDB)
- `apps/journal-service/src/routes/analytics.routes.ts` - Grow-Stats (MongoDB)
- `apps/gamification-service/src/routes/analytics.routes.ts` - User-Engagement (MongoDB)
- `apps/search-service/src/routes/search.routes.ts` - `/analytics` Route erweitert

**Features:**
- Alle Endpoints Admin-only (JWT + role check)
- Parallele MongoDB-Aggregationen für Performance
- 30-Tage-Trends, Top-Content, Verteilungen

#### 2. Frontend Analytics Dashboard
**Neue Dateien:**
- `apps/web-app/src/hooks/use-analytics.ts` - React Query Hooks für alle Endpoints
- `apps/web-app/src/components/analytics/stat-card.tsx` - KPI-Karten
- `apps/web-app/src/components/analytics/traffic-chart.tsx` - Trend-Charts (recharts)
- `apps/web-app/src/components/analytics/top-content-table.tsx` - Top Threads/Grows
- `apps/web-app/src/components/analytics/popular-searches.tsx` - Beliebte Suchen
- `apps/web-app/src/components/analytics/user-distribution.tsx` - Pie-Charts
- `apps/web-app/src/app/admin/analytics/page.tsx` - Dashboard-Seite

#### 3. Auth-Middleware für Services aktualisiert
**Problem:** gamification-service und search-service unterstützten keine JWT-Tokens
**Lösung:**
- `apps/gamification-service/src/middleware/auth.ts` - JWT-Verifikation hinzugefügt
- `apps/search-service/src/middleware/auth.ts` - JWT-Verifikation hinzugefügt
- `jsonwebtoken` Dependency zu beiden Services hinzugefügt

#### 4. JWT_SECRET in docker-compose.yml
**Problem:** Services konnten Tokens nicht verifizieren (unterschiedliche Secrets)
**Lösung:** `JWT_SECRET: ${JWT_SECRET}` zu gamification-service und search-service hinzugefügt

**Dashboard URL:** https://seedfinderpro.de/admin/analytics

---

### Session 8 (2026-02-19) - Fixes & Ad-Karussell

#### 1. Analytics-Seite: DashboardLayout fehlte
- `apps/web-app/src/app/admin/analytics/page.tsx` - DashboardLayout Wrapper hinzugefügt (Sidebar fehlte)

#### 2. AI-Chat: Sessions werden nach Re-Login geladen
- `apps/web-app/src/app/ai/chat/page.tsx` - useEffect beim Mount lädt letzte Sessions aus Redis

#### 3. Auth-Redirect: Eingeloggte User → Dashboard
- `apps/web-app/src/app/page.tsx` - Server-seitiger Cookie-Check, Redirect zu /dashboard
- `apps/web-app/src/app/landing/page.tsx` - gleiches Pattern
- `apps/web-app/src/app/auth/login/page.tsx` - useAuth Hook, redirect wenn bereits eingeloggt

#### 4. 1 Account pro IP (Redis-basiert)
- `apps/auth-service/src/routes/auth.routes.ts` - IP-Locking bei Login (7 Tage TTL)
- Fehler 403 wenn von IP bereits anderer Account eingeloggt
- Logout löscht beide IP-Mappings

#### 5. Admin-Backend Endpoints
- `apps/auth-service/src/routes/admin.routes.ts` (NEU) - /api/auth/admin/* Endpoints
  - GET/PATCH/POST /users, GET /logs
- `apps/auth-service/src/index.ts` - Route registriert
- `apps/web-app/src/hooks/use-admin.ts` - Alle Hooks korrigiert (falsche /api/admin/* Pfade)

#### 6. Kategorien Edit/Delete funktionieren
- `apps/community-service/src/routes/categories.routes.ts` - PUT + DELETE Endpoints
- `apps/web-app/src/app/admin/categories/page.tsx` - Inline-Edit + Delete-Bestätigung

#### 7. Werbe-Karussell System (NEU)
**Backend (community-service):**
- `apps/community-service/src/models/Ad.model.ts` - MongoDB Ad Model (type, title, imageUrl, link, isActive, order)
- `apps/community-service/src/routes/ads.routes.ts` - CRUD Endpoints
  - `GET /api/community/ads?type=rectangle|square` - Aktive Ads (öffentlich)
  - `GET /api/community/ads/all` - Alle Ads (Admin)
  - `POST /api/community/ads` - Erstellen (Admin)
  - `PUT /api/community/ads/:id` - Aktualisieren (Admin)
  - `DELETE /api/community/ads/:id` - Löschen (Admin)

**Frontend:**
- `apps/web-app/src/hooks/use-ads.ts` - React Query Hooks (useAds, useAllAds, useCreateAd, useUpdateAd, useDeleteAd)
- `apps/web-app/src/components/ads/ad-carousel.tsx` - Karussell-Komponente
  - Auto-Play (konfigurierbar), Pause bei Hover
  - Vor/Zurück Buttons (bei mehreren Ads, hover-sichtbar)
  - Dot-Navigation
  - Platzhalter wenn keine Ads vorhanden (gepunktete Umrandung mit "Werbefläche" Text)
  - Typen: rectangle (728×90 = h-[90px]) und square (300×300 = aspect-square)
- `apps/web-app/src/components/layout/dashboard-layout.tsx` - Rechteck-Banner zwischen Header und Content
- `apps/web-app/src/components/layout/sidebar.tsx` - Quadrat-Banner vor Settings-Footer
- `apps/web-app/src/app/admin/ads/page.tsx` - Admin-Verwaltungsseite
  - Live-Vorschau beider Karussell-Typen
  - Tab-Switcher: Rechteck / Quadrat
  - Erstellen/Bearbeiten Formular
  - Aktiv/Inaktiv Toggle, Löschen

#### 8. Analytics-Karten klickbar gemacht
- `apps/web-app/src/components/analytics/stat-card.tsx` - `href` prop → rendert als `<Link>`, Hover-Effekt + Pfeil-Icon
- `apps/web-app/src/app/admin/analytics/page.tsx` - Alle StatCards mit `href` zu Admin-Zielseiten
- `apps/web-app/src/components/analytics/top-content-table.tsx` - "Alle anzeigen" Header-Link
- `apps/web-app/src/components/analytics/popular-searches.tsx` - Suchbegriffe → `/search?q=...`

#### 9. Scraper/Feed-Importer Admin-Dashboard (NEU)
**Backend (price-service):**
- `apps/price-service/src/index.ts` - Admin-Endpoints dupliziert unter `/api/prices/admin/*` (via Traefik erreichbar)
  - `GET /api/prices/admin/feeds` - Alle 11 Feeds + Queue-Stats + nächster Scheduler-Lauf
  - `GET /api/prices/admin/queue/stats` - Queue-Statistiken
  - `POST /api/prices/admin/feed/:seedbank` - Feed in BullMQ-Queue einreihen
  - `POST /api/prices/admin/feeds/run-all` - Alle 11 Feeds einreihen
  - `POST /api/prices/admin/feed/:seedbank/now` - Sofort-Import (synchron, für Debugging)
  - Auth: `requireAdmin` Funktion prüft `X-User-Role: ADMIN` Header (Traefik) oder Bearer JWT

**Frontend:**
- `apps/web-app/src/hooks/use-scraper.ts` - React Query Hooks (useScraperFeeds, useScheduleFeed, useScheduleAllFeeds, useRunFeedNow)
  - Auto-Refresh alle 15s (Queue-Status live)
- `apps/web-app/src/app/admin/scraper/page.tsx` - Dashboard mit:
  - 5 Queue-Stat-Karten (Wartend, Aktiv, Abgeschlossen, Fehlgeschlagen, Verzögert)
  - Schedule-Info (täglicher Import 02:00 UTC, nächster Lauf)
  - Feed-Karten nach Tier gruppiert (Tier 1-4)
  - Pro Feed: Name, Website, Quelle (HTML/API/CSV), Provision, "In Queue" + "Sofort" Buttons
  - Toast-Feedback mit Import-Ergebnis (Produkte, Seeds, Dauer)
- `apps/web-app/src/app/admin/page.tsx` - "Feed-Importer" Schnellzugriff-Button

**Feed-Importer (11 total):**
| Tier | Feeds |
|------|-------|
| 1 (30%+) | fastbuds, zamnesia, weed-seed-shop |
| 2 (20-30%) | sensi-seeds, dutch-passion |
| 3 (15-20%) | seedsman, royal-queen-seeds |
| 4 (weitere) | greenhouse-seeds, paradise-seeds, anesia-seeds, mr-hanf |

---

### Session 4 (2026-02-03) - Bug Fixes

#### 1. Frontend: `toLocaleString` TypeError behoben
**Problem:** Crash bei der Suche wenn API-Fehler zurückgibt
**Ursache:** `results.total.toLocaleString()` auf undefined aufgerufen
**Lösung:** `apps/web-app/src/app/search/page.tsx`
- Zeile 101: `results?.total ?` Check hinzugefügt
- Zeile 144: `typeof results.total === 'number'` Check
- Zeile 147: Fallback auf `query` Variable
- Zeile 148: Conditional Rendering für `results.took`

#### 2. Search-Service: Route-Reihenfolge korrigiert
**Problem:** `/api/search/popular` und `/api/search/history/recent` gaben 404
**Ursache:** Express Router-Reihenfolge - `/:index` Route fing alle Requests ab
**Lösung:** `apps/search-service/src/routes/search.routes.ts`
- Spezifische Routen (`/history/recent`, `/popular`) VOR parametrisierte Routen (`/:index`) verschoben
- `/history/recent` jetzt auch ohne Auth nutzbar (gibt leeres Array zurück)

#### 3. Community-Service: Thread-Replies Route hinzugefügt
**Problem:** `/api/community/threads/:id/replies` gab 404
**Ursache:** Route war in `replies.routes.ts` mit falschem Prefix
**Lösung:** `apps/community-service/src/routes/threads.routes.ts`
- Neue Route `GET /:id/replies` hinzugefügt
- `replyService` importiert
- `/search` Route ebenfalls vor `/:id` verschoben (gleiche Problematik)

#### 4. Frontend: Favicon hinzugefügt
**Problem:** `/favicon.ico` gab 404
**Lösung:**
- `apps/web-app/src/app/icon.svg` erstellt (Cannabis-Blatt SVG)
- `apps/web-app/src/app/layout.tsx` Metadata erweitert mit `icons` Config

#### 5. Frontend: AI-Seite erstellt
**Problem:** `/ai` gab 404 (nur Unterseiten existierten)
**Lösung:** `apps/web-app/src/app/ai/page.tsx` erstellt
- Index-Seite mit Links zu Chat, Diagnose, Advisor

#### 6. Frontend: Search API Response Transformation
**Problem:** Client-side Exception bei Suche - API-Response Format passte nicht
**Ursache:**
- API gibt zurück: `{ strains: { hits: [...], totalHits }, threads: {...}, ... }`
- Frontend erwartete: `{ results: [...], total, query, took }`
**Lösung:** `apps/web-app/src/app/search/page.tsx`
- `transformApiResponse()` Funktion hinzugefügt
- Kombiniert alle Kategorien zu einem einheitlichen `SearchResult[]` Array
- Berechnet Gesamtzahl und Verarbeitungszeit
- Null-Checks für `results.results` hinzugefügt
- `apps/web-app/src/components/search/search-results.tsx` - Null-Check für results Array

---

## Admin-Funktionen (aktuell)

| Seite | Funktion |
|-------|----------|
| `/admin` | Dashboard, System-Status |
| `/admin/analytics` | Analytics Dashboard (User, Content, Trends) |
| `/admin/users` | Benutzer verwalten, Rollen, Bannen |
| `/admin/moderation` | Gemeldete Inhalte prüfen |
| `/admin/categories` | Forum-Kategorien |
| `/admin/strains` | Strain-Datenbank (184 Einträge) |
| `/admin/threads` | Thread-Verwaltung (Suche, Anpinnen, Sperren, Löschen) |
| `/admin/grows` | Grow-Verwaltung (Suche, Status-Filter, Löschen) |
| `/admin/logs` | System-Logs (Level/Service-Filter, Aktualisieren) |
| `/admin/ads` | Werbeanzeigen (Rechteck 728×90 + Quadrat 300×300, Karussell) |
| `/admin/scraper` | Feed-Importer Dashboard (11 Affiliate-Feeds, Queue-Stats, Sofort/Queue-Import) |
| `/admin/seedbanks` | Seedbank-Verwaltung |
| `/admin/achievements` | Gamification-Achievements |
| `/admin/ai` | AI-Service Übersicht |
| `/admin/clicks` | Click-Tracking & Affiliate-Stats |
| `/admin/backup` | Backup-Automatisierung (tägl. 02:00, 7 Tage Retention) |
| `/admin/settings` | Admin-Einstellungen + SMTP-Test |

---

## Bekannte Bug-Patterns (für zukünftiges Debugging)

### Express Router Reihenfolge
**Problem:** Parametrisierte Routen (`/:id`) fangen spezifische Routen ab
**Lösung:** Spezifische Routen IMMER VOR parametrisierten definieren:
```javascript
// RICHTIG:
router.get('/search', ...)    // spezifisch - zuerst
router.get('/popular', ...)   // spezifisch - zuerst
router.get('/:id', ...)       // parametrisiert - zuletzt

// FALSCH:
router.get('/:id', ...)       // fängt "search" und "popular" ab!
router.get('/search', ...)    // wird nie erreicht
```

### Undefined-Werte bei API-Responses
**Problem:** Frontend crasht bei unerwarteten API-Responses
**Lösung:** Defensive Checks vor dem Rendern:
```typescript
// RICHTIG:
{results?.total && typeof results.total === 'number' && (
  <span>{results.total.toLocaleString()}</span>
)}

// FALSCH:
{results && (
  <span>{results.total.toLocaleString()}</span>  // crasht wenn total undefined
)}
```

### Next.js App Router Seiten
**Problem:** Ordner ohne `page.tsx` geben 404
**Lösung:** Immer eine `page.tsx` erstellen oder Redirect einrichten

### API Response Format Mismatch
**Problem:** Frontend erwartet anderes Format als API liefert
**Lösung:** Transformation-Layer im Frontend:
```typescript
// API gibt zurück
{ strains: { hits: [...] }, threads: { hits: [...] } }

// Frontend erwartet
{ results: [...], total: number }

// Lösung: Transform-Funktion
function transformApiResponse(apiResponse) {
  const results = [
    ...apiResponse.strains?.hits || [],
    ...apiResponse.threads?.hits || [],
  ];
  return { results, total: results.length };
}
```

---

## Vorgeschlagene Erweiterungen (noch nicht implementiert)

1. ~~**Analytics Dashboard**~~ ✅ Implementiert (Session 5)
2. ~~**Benachrichtigungen**~~ ✅ Implementiert (Session 5 - Feature 1)
3. ~~**Private Nachrichten**~~ ✅ Implementiert (Session 5 - Feature 2)
4. ~~**Follow-System**~~ ✅ Implementiert (Session 5 - Feature 3)
5. ~~**Strain-Vergleich**~~ ✅ Implementiert (Session 5 - Feature 4)
6. ~~**System-Logs**~~ ✅ Implementiert (Session 7 - Admin Logs Page)
7. ~~**Forum-Moderations-Workflow**~~ ✅ Implementiert (Session 30)
8. ~~**SMTP / E-Mail-System**~~ ✅ Implementiert (Session 31 — Brevo, Welcome, Reset, Admin-Test)
9. ~~**Hetzner Object Storage**~~ ✅ Implementiert (Session 32 — war bereits fertig, getestet)
10. **Grow-Kalender/Erinnerungen** - Termine und Tasks (Session 33)
11. **Ernte-Statistiken** - Detaillierte Auswertungen (Session 34)
12. **AI-Service Monitoring** - Token-Verbrauch, Kosten (Session 35)
13. **UptimeRobot & Monitoring** - Health-Checks, Alerts (Session 36)

---

## Wichtige Dateien

```
/root/SF-1-Ultimate-/
├── docker-compose.yml          # Alle Services definiert (JWT_SECRET für alle Services)
├── .env                        # Credentials (NICHT committen!)
├── CLAUDE_CONTEXT.md           # Diese Datei - Session-Kontext
├── scripts/
│   ├── import-strains.js       # MongoDB Strain-Import
│   └── sync-strains-to-meilisearch.js
├── apps/
│   ├── web-app/                        # Next.js Frontend
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx              # Root Layout + Metadata
│   │       │   ├── icon.svg                # Favicon (Session 4)
│   │       │   ├── admin/analytics/page.tsx # Analytics Dashboard (NEU Session 5)
│   │       │   ├── ai/page.tsx             # AI Tools Index (Session 4)
│   │       │   ├── messages/page.tsx       # Private Messages (NEU Session 5)
│   │       │   └── search/page.tsx         # Suche (gefixt Session 4)
│   │       ├── components/analytics/       # Analytics-Komponenten (NEU Session 5)
│   │       │   ├── stat-card.tsx
│   │       │   ├── traffic-chart.tsx
│   │       │   ├── top-content-table.tsx
│   │       │   ├── popular-searches.tsx
│   │       │   └── user-distribution.tsx
│   │       ├── hooks/
│   │       │   ├── use-analytics.ts        # Analytics React Query Hooks (NEU Session 5)
│   │       │   └── use-messages.ts         # Messages React Query Hooks (NEU Session 5)
│   │       └── components/messages/
│   │           └── message-dropdown.tsx    # Header Dropdown (NEU Session 5)
│   ├── auth-service/
│   │   └── src/routes/analytics.routes.ts  # User-Analytics (NEU Session 5)
│   ├── community-service/
│   │   └── src/
│   │       ├── models/
│   │       │   ├── Conversation.model.ts   # Private Messages (NEU Session 5)
│   │       │   └── Message.model.ts        # Private Messages (NEU Session 5)
│   │       ├── services/
│   │       │   └── message.service.ts      # Private Messages (NEU Session 5)
│   │       └── routes/
│   │           ├── threads.routes.ts       # inkl. /replies Route (Session 4)
│   │           ├── messages.routes.ts      # Private Messages API (NEU Session 5)
│   │           └── analytics.routes.ts     # Community-Analytics (NEU Session 5)
│   ├── journal-service/
│   │   └── src/routes/analytics.routes.ts  # Grow-Analytics (NEU Session 5)
│   ├── gamification-service/
│   │   └── src/
│   │       ├── routes/analytics.routes.ts  # Engagement-Analytics (NEU Session 5)
│   │       └── middleware/auth.ts          # JWT-Support (gefixt Session 5)
│   ├── search-service/
│   │   └── src/
│   │       ├── routes/search.routes.ts     # inkl. /analytics (erweitert Session 5)
│   │       └── middleware/auth.ts          # JWT-Support (gefixt Session 5)
│   └── ai-service/                         # OpenAI Integration
```

---

## Befehle

```bash
# Services neustarten
docker-compose restart [service-name]

# Logs anzeigen
docker logs sf1-[service-name] --tail 50

# Alle Container Status
docker-compose ps

# Frontend neu bauen
docker-compose restart frontend

# Strains importieren
docker exec -it sf1-mongodb mongosh -u sf1_admin -p [password] --authenticationDatabase admin

# Health prüfen
curl https://seedfinderpro.de/api/[service]/health
```

---

## Bekannte Credentials (in .env)

- MongoDB: sf1_admin / ${MONGO_PASSWORD}
- PostgreSQL: sf1_user / ${POSTGRES_PASSWORD}
- Meilisearch Key: ${MEILISEARCH_MASTER_KEY}
- JWT Secret: ${JWT_SECRET}
- OpenAI: ${OPENAI_API_KEY}

## GitHub

- **Repository:** https://github.com/Callie84/SF-1-Ultimate
- **Branch:** claude/review-server-sf1-h3kMz
- **Token:** Im Git-Remote konfiguriert (gültig bis ~2026-02-10)

---

### Session 6 - AI-Service Komplett-Fix (2026-02-06)

**Problem:** AI-Service Backend lieferte andere Response-Formate als Frontend erwartet.

**Gefixt:**

1. **OpenAI Modelle aktualisiert** (`config/openai.ts`)
   - `gpt-4-vision-preview` / `gpt-4-turbo-preview` -> `gpt-4o` / `gpt-4o-mini`
   - Veraltete Modellnamen funktionierten nicht mehr

2. **Diagnose: Frontend-Backend Mismatch gefixt** (`services/diagnosis.service.ts`, `routes/ai.routes.ts`)
   - Frontend sendet `description`, Backend akzeptiert jetzt beides (`description` + `symptoms`)
   - Backend gibt jetzt `{ diagnoses: [{ problem, confidence (0-1), description, causes[], solutions[], severity }] }` zurück
   - Regex-Parsing ersetzt durch `response_format: { type: 'json_object' }` (structured output)
   - Fallback bei Parse-Fehler

3. **Chat: Response-Format gefixt** (`services/chat.service.ts`)
   - Alt: `{ response, sessionId }`
   - Neu: `{ content, messageId, timestamp, sessionId }` (wie Frontend erwartet)
   - Session-TTL: 1h -> 24h
   - Redis SET-Index für schnellere User-Session-Suche
   - Messages haben jetzt `id` Feld

4. **Chat Sessions Endpoint gefixt** (`routes/ai.routes.ts`)
   - Alt: `{ session: { messages: [...] } }` (gewrappt)
   - Neu: `{ id, messages, createdAt, updatedAt }` (direkt, wie Frontend erwartet)

5. **Advisor: Komplett überarbeitet** (`services/advisor.service.ts`, `routes/ai.routes.ts`)
   - Neue `getGrowPlan()` Methode für Frontend-Format (`{ experience, goal, growType, medium }`)
   - Returns: `{ strainRecommendations[], setupAdvice[], timeline[], tips[] }`
   - `extractImprovements()` (war leer) -> JSON structured output
   - `/advice` Route akzeptiert jetzt beide Formate (neues Frontend + legacy)
   - Alle Advisor-Endpoints nutzen JSON structured output

6. **Rate-Limiting implementiert** (`middleware/rate-limit.ts`)
   - Redis-basiertes Sliding-Window Rate-Limiting
   - 10 Requests/Minute pro User
   - Rate-Limit Headers (X-RateLimit-Limit, X-RateLimit-Remaining)
   - Fail-open bei Redis-Fehler

**Geänderte Dateien:**
- `apps/ai-service/src/config/openai.ts` - Modelle aktualisiert
- `apps/ai-service/src/services/diagnosis.service.ts` - JSON structured output
- `apps/ai-service/src/services/advisor.service.ts` - Neues Format + JSON output
- `apps/ai-service/src/services/chat.service.ts` - Korrektes Response-Format
- `apps/ai-service/src/routes/ai.routes.ts` - Alle Fixes integriert
- `apps/ai-service/src/middleware/rate-limit.ts` - NEU: Rate-Limiting

---

### Session 7 - Admin-Seiten, Statische Seiten, System-Benchmark (2026-02-07)

**Admin-Seiten erstellt (3 fehlende Seiten die 404 gaben):**

1. **`/admin/threads`** - Thread-Verwaltung
   - `apps/web-app/src/app/admin/threads/page.tsx` - NEU
   - Suche, Status-Filter, Anpinnen, Sperren, Löschen
   - Hooks: `useAdminThreads()` in `use-admin.ts`

2. **`/admin/grows`** - Grow-Verwaltung
   - `apps/web-app/src/app/admin/grows/page.tsx` - NEU
   - Suche, Status-Filter (active/completed/abandoned), Löschen
   - Hooks: `useAdminGrows()` in `use-admin.ts`

3. **`/admin/logs`** - System-Logs
   - `apps/web-app/src/app/admin/logs/page.tsx` - NEU
   - Level-Filter (info/warn/error), Service-Filter, Aktualisieren
   - Hooks: `useAdminLogs()` in `use-admin.ts`

**Notification Dropdown ans Theme angepasst:**
- Header nutzt jetzt `NotificationDropdown` aus `components/notifications/notification-dropdown.tsx`
- Alte `NotificationsDropdown` (hardcoded Farben, neo-deep) ersetzt durch saubere shadcn/ui-Variante
- `apps/web-app/src/components/layout/header.tsx` - Import geändert

**Statische Seiten erstellt (4 fehlende Seiten die aus Footer/Register verlinkt waren):**
- `apps/web-app/src/app/about/page.tsx` - Über uns Seite
- `apps/web-app/src/app/privacy/page.tsx` - Datenschutzerklärung
- `apps/web-app/src/app/terms/page.tsx` - Nutzungsbedingungen
- `apps/web-app/src/app/contact/page.tsx` - Kontaktformular

**HTTP→HTTPS Redirect gefixt:**
- `docker-compose.yml` - Traefik `entrypoints.web.http.redirections` hinzugefügt
- HTTP Requests werden jetzt per 301 auf HTTPS weitergeleitet

**System-Benchmark Ergebnis (2026-02-07):**
- 16/16 Docker Container: ✅ Alle laufen
- 10/10 Backend Services: ✅ Alle healthy
- 42/42 Frontend Routen: ✅ Keine 404s
- 12/12 API Endpoints: ✅ Alle erreichbar
- SSL/HTTPS: ✅ Aktiv + HTTP→HTTPS Redirect (301)
- Response Times: 27-54ms

**Geänderte Dateien:**
- `apps/web-app/src/hooks/use-admin.ts` - 3 neue Hooks (useAdminThreads, useAdminGrows, useAdminLogs)
- `apps/web-app/src/components/layout/header.tsx` - NotificationDropdown Import
- `docker-compose.yml` - HTTP→HTTPS Redirect für Traefik

---

## Alle Frontend-Routen (42 Seiten, Stand 2026-02-07)

| Route | Seite |
|-------|-------|
| `/` | Redirect → `/landing` oder `/dashboard` |
| `/landing` | Landing Page |
| `/auth/login` | Login |
| `/auth/register` | Registrierung |
| `/dashboard` | User Dashboard |
| `/profile` | Eigenes Profil |
| `/profile/[username]` | Öffentliches Profil |
| `/settings` | Einstellungen (alle Tabs auf einer Seite) |
| `/community` | Forum-Übersicht |
| `/community/new` | Neuer Thread |
| `/community/[slug]` | Kategorie |
| `/community/thread/[id]` | Thread-Ansicht |
| `/journal` | Journal-Übersicht |
| `/journal/new` | Neues Journal |
| `/journal/[id]` | Journal-Detail |
| `/journal/[id]/entry/new` | Neuer Eintrag |
| `/messages` | Private Nachrichten |
| `/notifications` | Benachrichtigungen |
| `/search` | Volltextsuche |
| `/prices` | Preisvergleich |
| `/strains` | Strain-Datenbank |
| `/strains/compare` | Strain-Vergleich |
| `/tools` | Rechner-Übersicht |
| `/tools/vpd` | VPD-Rechner |
| `/tools/co2` | CO2-Rechner |
| `/tools/dli` | DLI-Rechner |
| `/tools/ec` | EC-Rechner |
| `/tools/power` | Stromkosten-Rechner |
| `/tools/ppfd` | PPFD-Rechner |
| `/ai` | AI-Assistent Übersicht |
| `/ai/chat` | AI-Chat |
| `/ai/advisor` | Grow-Berater |
| `/ai/diagnose` | Pflanzen-Diagnose |
| `/admin` | Admin-Dashboard |
| `/admin/users` | Benutzer-Verwaltung |
| `/admin/categories` | Kategorien-Verwaltung |
| `/admin/settings` | Admin-Einstellungen |
| `/admin/analytics` | Analytics Dashboard |
| `/admin/threads` | Thread-Verwaltung |
| `/admin/grows` | Grow-Verwaltung |
| `/admin/logs` | System-Logs |
| `/admin/moderation` | Meldungen/Reports |
| `/admin/strains` | Strain-Verwaltung |
| `/about` | Über uns |
| `/privacy` | Datenschutz |
| `/terms` | Nutzungsbedingungen |
| `/contact` | Kontakt |

---

---

### Session 8 - Bug Fixes & Feature Improvements (2026-02-19)

**1. Analytics-Seite: DashboardLayout hinzugefügt**
- `apps/web-app/src/app/admin/analytics/page.tsx` - DashboardLayout importiert und genutzt
- Linke Sidebar erscheint jetzt korrekt auf `/admin/analytics`

**2. AI Chat: Sessions persistent laden**
- `apps/web-app/src/app/ai/chat/page.tsx` - `useEffect` zum Laden aller Sessions beim Mount
- Beim Öffnen der Seite werden bestehende Sessions vom Server geladen
- Die neueste Session wird automatisch geladen und angezeigt

**3. Redirect: Eingeloggte User → Dashboard**
- `apps/web-app/src/app/page.tsx` - Cookie-Check (sf1_access_token), Redirect zu /dashboard
- `apps/web-app/src/app/landing/page.tsx` - Cookie-Check, Redirect zu /dashboard
- `apps/web-app/src/app/auth/login/page.tsx` - useAuth-Check, Redirect zu /dashboard wenn eingeloggt
- Neuer Tab öffnen → direkt zum Dashboard wenn eingeloggt

**4. 1 Account per IP - Backend-Einschränkung**
- `apps/auth-service/src/routes/auth.routes.ts` - IP-Lock via Redis beim Login
- Redis-Key: `ip:login:{ip}` → userId (7 Tage TTL)
- Reverse-Key: `user:ip:{userId}` → IP für Logout-Cleanup
- Logout räumt IP-Mappings auf

**5. Kategorie-Buttons (Edit/Delete) jetzt funktional**
- `apps/community-service/src/routes/categories.routes.ts` - PUT und DELETE Endpoints hinzugefügt
- `apps/web-app/src/hooks/use-admin.ts` - `useUpdateCategory()` und `useDeleteCategory()` hinzugefügt
- `apps/web-app/src/app/admin/categories/page.tsx` - Inline-Edit-Formular und Löschen-Funktion

**6. Admin-Backend-Endpoints erstellt**
- `apps/auth-service/src/routes/admin.routes.ts` - NEU: Admin-Routen
  - `GET /api/auth/admin/users` - User-Liste mit Suche, Pagination, Filter
  - `PATCH /api/auth/admin/users/:id` - User aktualisieren
  - `POST /api/auth/admin/users/:id/ban` - User bannen/entsperren
  - `GET /api/auth/admin/logs` - System-Logs aus Redis
- `apps/auth-service/src/index.ts` - Admin-Routes unter `/api/auth/admin` registriert

**7. Frontend-Hooks auf korrekte Endpoints umgestellt**
- `useAdminUsers` → `/api/auth/admin/users`
- `useAdminThreads` → `/api/community/threads`
- `useAdminGrows` → `/api/grows`
- `useAdminLogs` → `/api/auth/admin/logs`
- `useDeleteContent` → Korrekte Service-Pfade je nach Typ
- `useResolveReport` → `/api/community/moderation/reports`

---

### Session 10 - Bug-Fixes & Missing Features (2026-03-02/03)

**1. Loki Log-Aggregation gefixt**
- `monitoring/loki/loki.yml` - path_prefix: /tmp/loki → /loki
- `docker-compose.yml` - Volume: loki_data:/loki

**2. Admin Click-Stats Seite**
- `apps/web-app/src/app/admin/clicks/page.tsx` - NEU: Affiliate-Klick-Statistiken
- `apps/web-app/src/app/admin/page.tsx` - Link zur Clicks-Seite hinzugefügt

**3. Passwort-Reset E-Mail**
- `apps/notification-service/src/templates/email/password-reset.hbs` - NEU: E-Mail-Template
- `apps/notification-service/src/services/email.service.ts` - password-reset Template geladen
- `apps/notification-service/src/routes/notifications.routes.ts` - POST /internal/email Endpoint
- `apps/auth-service/src/routes/auth.routes.ts` - forgot-password ruft notification-service auf (fire-and-forget)
- SMTP-Konfiguration in .env und docker-compose (noch ohne echte Credentials)

**4. Change-Password Endpoint**
- `apps/auth-service/src/routes/auth.routes.ts` - POST /api/auth/change-password hinzugefügt

**5. Preise-Seite Click-Tracking**
- `apps/web-app/src/app/prices/page.tsx` - Shop-Links durch /api/prices/click?url=... ersetzt

**6. Preisalarme Frontend + JWT-Auth**
- `apps/web-app/src/app/alerts/page.tsx` - NEU: Preisalarme-Verwaltungsseite
- `apps/price-service/src/routes/alerts.routes.ts` - authMiddleware() statt Header-Auth
- `apps/price-service/src/services/alert.service.ts` - populate('seedId') hinzugefügt
- `apps/web-app/src/components/layout/sidebar.tsx` - "Preisalarme" Link hinzugefügt
- `docker-compose.yml` - JWT_SECRET für price-service

**7. 404 Seite**
- `apps/web-app/src/app/not-found.tsx` - NEU: Custom 404 Seite

**8. Journal Edit-Seiten & Harvest-Feature**
- `apps/web-app/src/app/journal/[id]/edit/page.tsx` - NEU: Grow bearbeiten
- `apps/web-app/src/app/journal/[id]/entry/[entryId]/edit/page.tsx` - NEU: Eintrag bearbeiten
- `apps/web-app/src/app/journal/[id]/page.tsx` - Delete-Button funktional, Harvest-Button+Form hinzugefügt
- `apps/web-app/src/hooks/use-journal.ts` - useHarvestGrow() Hook hinzugefügt

---

### Session 11 - Meilisearch Reindex & Notification Pipeline (2026-03-03)

**1. Meilisearch OverwriteModelError gefixt**
- `apps/search-service/src/services/indexing.service.ts` - Alle Mongoose-Models mit `mongoose.models['X'] || mongoose.model(...)` Pattern
- `reindexAll()` von `Promise.all()` auf sequentiell umgestellt (mongoose session conflict)
- Neue Env-Variablen: `MONGODB_URL_PRICES`, `MONGODB_URL_COMMUNITY`, `MONGODB_URL_JOURNAL`
- `docker-compose.yml` - Neue env vars für search-service hinzugefügt
- **Ergebnis:** 2802 Strains, 3 Threads, 1 Grow erfolgreich indexiert

**2. Auth Internal Endpoint**
- `apps/auth-service/src/routes/auth.routes.ts` - GET /api/auth/users/:userId/email (X-Internal-Secret Auth)
- Wird vom email.worker der notification-service genutzt

**3. Queue Worker (Notification Pipeline)**
- `apps/notification-service/src/workers/queue.worker.ts` - NEU: Liest aus Redis-Liste `queue:notifications`
- `apps/notification-service/src/index.ts` - startQueueWorker() in Start-Sequenz
- Verarbeitet `price_alert` Messages von price-service

**4. Auth-Service Healthcheck**
- `docker-compose.yml` - wget → node -e "require('http').get(...)" (wget nicht in node:20-slim)

**5. Backup erstellt (2026-03-03 00:16:47)**
- `/root/SF-1-Ultimate-/backups/20260303-001647/` - Vollständig und verifiziert
- PostgreSQL ✅ MongoDB ✅ Redis ✅ Code ✅ .env ✅

---

---

### Session 12 - Seedbank-Admin & Grow-Kalender (2026-03-03)

**4. Gamification auf Profil + Leaderboard (NEU)**
- `apps/web-app/src/hooks/use-gamification.ts` - NEU: React Query Hook für `GET /api/gamification/profile/:userId`
- `apps/web-app/src/app/profile/page.tsx` - Gamification-Sektion: Level/XP-Progressbar, Stats-Grid (Reputation, Streak, Beiträge, Rang), Achievements-Grid mit Rarity-Farben
- `apps/web-app/src/app/profile/[username]/page.tsx` - Öffentliches Profil: echte Gamification-Stats statt Platzhalter, XP-Bar, Achievement-Badges
- `apps/web-app/src/app/dashboard/page.tsx` - Level/XP-Karte nutzt echte API-Daten statt User-Objekt
- `apps/web-app/src/app/leaderboard/page.tsx` - NEU: Bestenliste (XP/Reputation/Level), Podium-Ansicht für Top 3, vollständige Rangliste mit Links zum Profil
- `apps/web-app/src/components/layout/sidebar.tsx` - "Bestenliste" Link hinzugefügt

**1. Seedbank-Admin-Verwaltung (NEU)**
- `apps/price-service/src/index.ts` - `GET /api/prices/admin/seedbanks` Endpoint (aggregiert Seed+Price Stats aus MongoDB)
- `apps/web-app/src/app/admin/seedbanks/page.tsx` - NEU: Admin-Übersicht aller Seedbanks mit Statistiken
  - Seeds in DB, Preiseinträge, Mindestpreis, letzter Import-Zeitstempel
  - Tier-Klassifizierung + Provision angezeigt
  - Link zum Feed-Importer für Direktimport
- `apps/web-app/src/app/admin/page.tsx` - "Seedbanks" Button im Schnellzugriff hinzugefügt

**2. Grow-Kalender mit Reminder-System (NEU)**
- `apps/journal-service/src/routes/reminders.routes.ts` - NEU: Alle Reminder-API-Routen
  - `GET /api/journal/reminders/calendar?year=&month=` - Kalender-Daten (gruppiert nach Tag)
  - `GET /api/journal/reminders/upcoming?days=7` - Bevorstehende Erinnerungen
  - `GET /api/journal/reminders/overdue` - Überfällige Erinnerungen
  - `GET /api/journal/reminders/stats` - Statistiken
  - `POST /api/journal/reminders` - Erstellen (mit Wiederholung)
  - `PATCH /api/journal/reminders/:id/complete` - Als erledigt markieren
  - `PATCH /api/journal/reminders/:id/skip` - Überspringen
  - `PUT /api/journal/reminders/:id` - Aktualisieren
  - `DELETE /api/journal/reminders/:id` - Löschen
- `apps/journal-service/src/index.ts` - remindersRoutes unter `/api/journal/reminders` registriert
- `apps/web-app/src/hooks/use-reminders.ts` - NEU: React Query Hooks
- `apps/web-app/src/app/calendar/page.tsx` - NEU: Monatliche Kalenderansicht
  - Reminder-Badges auf Kalendertagen (hover: Erledigt/Überspringen/Löschen)
  - Sidebar: Überfällige Erinnerungen + Nächste 7 Tage
  - Dialog zum Erstellen mit Typ, Datum, Zeit, Wiederholung
  - 6 Typen: Gießen, Düngen, Umtopfen, Ernte, Kontrolle, Sonstiges
- `apps/web-app/src/components/layout/sidebar.tsx` - "Kalender" Link hinzugefügt

**3. Bereits in Session 10/11 existierend (nicht erneut gebaut):**
- `/strains/[slug]/` - Strain-Detail-Seite ✅
- `sitemap.ts`, `robots.ts` - SEO ✅
- `layout.tsx` - Meta-Tags ✅

---

---

### Session 13 - Dashboard Widget, Kalender-Filter, Seedbank-Toggle, Achievements-Admin, Harvest-Stats (2026-03-03)

**1. Dashboard "Bevorstehende Erinnerungen" Widget (NEU)**
- `apps/web-app/src/app/dashboard/page.tsx` - `useUpcomingReminders(3)` + `useOverdueReminders()` Hooks integriert
- Widget zeigt: Überfällige Erinnerungen (rot) + Nächste 3 Tage + Quick-Actions (Erledigt/Überspringen)
- Tools-Sektion als horizontales 3-Spalten-Layout unten (statt Card in Grid)
- Reminder-Typ-Icons: Tropfen/Blitz/Schere/Sonne/Auge/Glocke

**2. Kalender growId-Verknüpfung (NEU)**
- `apps/web-app/src/app/calendar/page.tsx` - `useSearchParams()` für `?growId=` URL-Parameter
- Grow-Filter Dropdown im Header (filtert Kalender + Sidebar-Liste)
- "Filter aktiv" Banner mit ✕ zum Zurücksetzen
- Grow-Selector im Create-Dialog (optional)
- Client-side Filterung der Calendar-Daten nach growId
- `export const dynamic = 'force-dynamic'` (Next.js 14 fix für useSearchParams)
- `apps/web-app/src/app/journal/[id]/page.tsx` - "Kalender" Button → `/calendar?growId={id}`

**3. Seedbank deaktivieren Toggle (NEU)**
- `apps/price-service/src/index.ts` - `PATCH /api/prices/admin/seedbanks/:slug/toggle` Endpoint
  - Redis Set `set:inactive:seedbanks` für Toggle-Zustand
  - GET `/api/prices/admin/seedbanks` gibt jetzt `isActive` Feld zurück
- `apps/web-app/src/app/admin/seedbanks/page.tsx` - Toggle-Button (ToggleLeft/ToggleRight Icons)
  - Deaktivierte Seedbanks: opacity-60, rotes "Deaktiviert" Badge, andersfarbiger Background
  - Stats-Card: "Aktiv / X mit Daten"

**4. Achievements Admin-Verwaltung (NEU)**
- `apps/gamification-service/src/routes/admin.routes.ts` - NEU: Admin-Routen
  - `GET /api/gamification/admin/achievements` - Alle Achievements + unlockedCount + totalUsers
  - `PATCH /api/gamification/admin/achievements/:id/toggle` - isActive toggle
  - `GET /api/gamification/admin/badges` - Alle Badges
  - `GET /api/gamification/admin/stats` - Übersicht: totalProfiles, xpStats, etc.
- `apps/gamification-service/src/index.ts` - adminRoutes registriert
- `apps/web-app/src/app/admin/achievements/page.tsx` - NEU: Admin-Seite
  - Achievements gruppiert nach Kategorie
  - Rarity-Farben (legendary=gold, epic=purple, rare=blue)
  - Toggle-Button für jedes Achievement
  - Stats-Kacheln: Profile, Achievements aktiv, Badges, Gesamt-XP
- `apps/web-app/src/app/admin/page.tsx` - "Achievements" Button hinzugefügt

**5. Ernte-Statistiken (NEU)**
- `apps/journal-service/src/routes/grows.routes.ts` - `GET /api/journal/grows/stats` Endpoint (vor /:id)
  - Aggregiert: Overview (total/active/harvested/byEnv/byType), HarvestStats (avgYield/maxYield/avgQuality/avgDuration), topYields (Top 5), topStrains (Top 10)
- `apps/web-app/src/app/journal/stats/page.tsx` - NEU: Persönliche Statistik-Seite
  - Übersicht-Kacheln, Ernte-Stats, Qualitätssterne, Umgebungs-/Typ-Verteilung mit Balken, Bester-Ertrag-Liste, Lieblings-Strains
- `apps/web-app/src/app/journal/page.tsx` - "Statistiken" Button in Journal-Header

**6. Reminder Worker + Notification Integration (NEU)**
- `apps/journal-service/src/workers/reminder.worker.ts` - NEU: Hintergrund-Worker
  - `processOverdueReminders()` - Überfällige Reminders → In-App-Notification
  - `processUpcomingNotifications()` - Vorab-Benachrichtigung (notifyBefore Minuten)
  - Läuft alle 30 Minuten, erster Run nach 10s Startup-Verzögerung
  - Sendet via `POST /api/notifications/internal/create` an notification-service
- `apps/journal-service/src/index.ts` - `startReminderWorker()` nach app.listen() registriert
- `apps/notification-service/src/routes/notifications.routes.ts` - `POST /api/notifications/internal/create` Endpoint
  - Intern, authentifiziert via `X-Internal-Secret` Header
  - Ruft `notificationService.create({ userId, type, title, message })` auf

**7. Price Service Inactive Filter (NEU)**
- `apps/price-service/src/services/price.service.ts` - `getInactiveSeedbanks()` Helper (Redis Set)
  - `getPricesForSeed()` - `$nin` Filter für inaktive Seedbanks
  - `browseSeeds()` - Prices-Enrichment filtert inaktive Seedbanks
  - `searchSeeds()` - Prices-Enrichment filtert inaktive Seedbanks

**8. Next.js 14 Fix: useSearchParams → window.location.search**
- `apps/web-app/src/app/calendar/page.tsx` - `useSearchParams()` ersetzt durch `useEffect + window.location.search`
  - Verhindert prerender-Fehler ohne Suspense-Wrapper
  - `new URLSearchParams(window.location.search).get('growId')` in `useEffect([], [])`

---

---

### Session 17 - Öffentliche Grows (2026-03-03)

**Backend (journal-service):**
- `apps/journal-service/src/routes/grows.routes.ts`
  - `GET /:id` → `optionalAuthMiddleware` (öffentlicher Zugriff ohne Login)
  - Import: `optionalAuthMiddleware` hinzugefügt
- `apps/journal-service/src/routes/entries.routes.ts`
  - `GET /:growId/entries` → `optionalAuthMiddleware`
- `apps/journal-service/src/services/feed.service.ts`
  - `.select('-userId')` entfernt → userId im Feed enthalten

**Frontend (web-app):**
- `apps/web-app/src/hooks/use-journal.ts`
  - `usePublicFeed(options?)` — sortBy: recent/trending/top, 2min Cache
  - `usePublicEntries(growId)` — Einträge ohne Auth abrufbar
  - `useToggleVisibility(id)` — PATCH grows/:id mit {isPublic}
- `apps/web-app/src/app/grows/page.tsx` — NEU: Öffentliche Grows Listing
  - Sortier-Tabs (Neueste/Trending/Top)
  - Grow-Cards mit Strain, Type, Environment, Status, Harvest-Ergebnis, Stats
  - Leerer Zustand mit Call-to-Action
- `apps/web-app/src/app/grows/[id]/page.tsx` — NEU: Öffentliche Grow-Detailseite
  - Timeline-Ansicht identisch zu persönlichem Journal
  - Fotos, Messwerte, Reactions/Kommentare-Counts
  - "Bearbeiten"-Button nur für Owner (userId-Vergleich)
- `apps/web-app/src/app/journal/[id]/page.tsx`
  - Visibility-Toggle-Button: Öffentlich/Privat (Globe/Lock Icon)
  - "Öffentlich ansehen" → `/grows/:id` Link wenn public
- `apps/web-app/src/components/layout/sidebar.tsx`
  - "Öffentliche Grows" Link (`/grows`) mit Sprout-Icon zwischen Journal und Community

**URLs:**
- `/grows` — Öffentliche Grows Discovery
- `/grows/:id` — Öffentliche Detailansicht

---

### Session 16 - SEO: JSON-LD, Sitemap, Metadata (2026-03-03)

**JSON-LD Structured Data:**
- `apps/web-app/src/app/strains/[slug]/page.tsx` — Server Component fetcht Strain + Reviews
  - `@graph`: `Product` Schema + `BreadcrumbList`
  - `Product`: name, description, image, brand (breeder), additionalProperty (THC/CBD/Typ)
  - `aggregateRating`: avgRating + reviewCount aus `/api/community/strains/:slug/reviews` (wenn > 0)
  - `AggregateOffer` mit priceCurrency EUR
  - Canonical URL + Twitter Card ergänzt
  - Beide Fetches gecacht via `{ next: { revalidate: 3600 } }`

**Sitemap erweitert** (`apps/web-app/src/app/sitemap.ts`):
- Neu: `/search` (0.7, weekly), `/leaderboard` (0.6, daily)
- Neu: 6 Tool-Unterseiten `/tools/vpd|ec|dli|ppfd|co2|power` (0.5, monthly)
- Gesamt: 199 URLs (16 statisch + 183 Strain-Seiten)

**Neue Metadata-Layouts:**
- `apps/web-app/src/app/strains/layout.tsx` — NEU: Strain-Datenbank Metadata (gilt für `/strains` Liste)
- `apps/web-app/src/app/prices/layout.tsx` — `'use client'` entfernt → Server Component + Metadata
- `apps/web-app/src/app/search/layout.tsx` — `'use client'` entfernt → Server Component + Metadata

---

### Session 15 - Foto-Upload für Journal-Einträge (2026-03-03)

**Foto-Upload komplett implementiert:**

**Backend (journal-service):**
- `apps/journal-service/src/services/photo.service.ts` - Disk-Storage statt CDN-Platzhalter
  - Speichert Original (2048px), Thumbnail (300px), Medium (800px) in `/app/uploads/{userId}/`
  - Generiert URLs: `${CORS_ORIGIN}/api/journal/uploads/{userId}/{fileId}.jpg`
  - `delete()` löscht Dateien vom Disk via `fs.promises.unlink()`
  - Neue Methode: `getByEntry(entryId, userId)` für GET-Endpoint
- `apps/journal-service/src/index.ts` - Static file serving
  - `express.static('/app/uploads')` an `/api/journal/uploads` (vor JSON-Middleware)
  - Uploads-Verzeichnis wird beim Start erstellt
  - `helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })`
- `apps/journal-service/src/routes/photos.routes.ts`
  - `GET /:entryId/photos` - Alle Fotos eines Eintrags

**Frontend (web-app):**
- `apps/web-app/src/hooks/use-journal.ts`
  - `useUploadPhoto(entryId, growId)` - FormData multipart upload
  - `useDeletePhoto(growId)` - Photo löschen + entries cache invalidieren
- `apps/web-app/src/components/journal/photo-upload.tsx` - NEU: Upload-Komponente
  - Drag-and-Drop oder Klick
  - Lokale Vorschau (URL.createObjectURL) vor dem Upload
  - Upload-Progress pro Foto (Spinner)
  - Bestehende Fotos mit Hover-Delete-Button
  - Validierung: JPEG/PNG/WebP, max 10 MB
- `apps/web-app/src/app/journal/[id]/entry/new/page.tsx`
  - Nach Entry-Erstellung erscheint Photo-Upload-Sektion inline
  - "Fertig — Zum Grow" Button zum Abschluss
- `apps/web-app/src/app/journal/[id]/entry/[entryId]/edit/page.tsx`
  - Photo-Verwaltungs-Sektion unten (bestehende Fotos + neue hinzufügen)
- `apps/web-app/src/app/journal/[id]/page.tsx`
  - Timeline zeigt Photos aus `photo.thumbnailUrl || photo.url` (statt nur strings)

**Speicherort:** `/app/uploads/` im journal-service Container = `./apps/journal-service/uploads/` auf Host

---

### Session 14 - AI-Service Monitoring (2026-03-03)

**AI Monitoring Dashboard (NEU)**
- `apps/ai-service/src/utils/token-tracker.ts` - NEU: Redis-basiertes Token-Tracking
  - `trackUsage()` - Async, fail-silent, speichert täglich + monatlich in Redis
  - `getDailyStats()` / `getLastNDaysStats()` / `getMonthlyStats()` - Aggregationen
  - Kosten-Berechnung: gpt-4o ($0.0025/$0.01 input/output), gpt-4o-mini ($0.00015/$0.0006)
- `apps/ai-service/src/services/chat.service.ts` - `trackUsage()` nach jedem API-Call
- `apps/ai-service/src/services/diagnosis.service.ts` - `trackUsage()` nach diagnose() + quickDiagnose()
- `apps/ai-service/src/services/advisor.service.ts` - `trackUsage()` nach getGrowPlan() + getAdvice()
- `apps/ai-service/src/routes/admin.routes.ts` - NEU: `GET /api/ai/admin/stats`
  - Auth: X-User-Role: ADMIN Header oder JWT Bearer
  - Returns: today, last7Days, last30Summary, currentMonth, lastMonth
- `apps/ai-service/src/index.ts` - adminRoutes unter `/api/ai/admin` registriert
- `apps/web-app/src/hooks/use-ai-monitoring.ts` - NEU: React Query Hook (60s Refresh)
- `apps/web-app/src/app/admin/ai/page.tsx` - NEU: Admin-Seite
  - 4 KPI-Karten: Heute Kosten, Heute Anfragen, Dieser Monat, Letzter Monat
  - Endpoint-Breakdown: Chat/Diagnose/Advisor mit Balken
  - Modell-Split: gpt-4o vs gpt-4o-mini mit Token-Verteilung
  - 7-Tage Chart: Anfragen + Kosten pro Tag
  - 30-Tage Zusammenfassung
  - Preisübersicht-Tabelle
- `apps/web-app/src/app/admin/page.tsx` - "AI-Monitoring" Button im Schnellzugriff

**Redis Keys (TTL 90 Tage):**
- `ai:stats:daily:{YYYY-MM-DD}:requests` - Tägliche Anfragen
- `ai:stats:daily:{date}:tokens:input/output` - Token-Zähler
- `ai:stats:daily:{date}:cost` - Kosten ×10000 als Integer
- `ai:stats:daily:{date}:endpoint:{chat|diagnose|advice}` - Pro Endpoint
- `ai:stats:daily:{date}:model:{gpt-4o|gpt-4o-mini}:input/output` - Pro Modell
- `ai:stats:monthly:{YYYY-MM}:requests/cost` - Monatliche Zusammenfassung (400 Tage TTL)

---

---

### Session 15 - Mobile Responsive Fixes (2026-03-03)

**Überarbeitete Seiten:**
- `apps/web-app/src/app/dashboard/page.tsx` - Stats: `grid-cols-2 lg:grid-cols-4`, `text-2xl sm:text-3xl`, Schnellaktionen `sm:grid-cols-3`
- `apps/web-app/src/app/journal/page.tsx` - Stats: `grid-cols-2 md:grid-cols-4`, Header wrapping, Buttons icon-only auf Mobile
- `apps/web-app/src/app/community/page.tsx` - Stats: `grid-cols-3`, Header wrapping, Thread-Stats auf sm+ hidden, `gap-3 sm:gap-6`
- `apps/web-app/src/app/admin/page.tsx` - Stats: `grid-cols-2 lg:grid-cols-4`, Quick Links: `grid-cols-2 lg:grid-cols-4`, `text-2xl sm:text-3xl`
- `apps/web-app/src/app/strains/page.tsx` - Grid: `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, Header wrapping, Buttons icon-only
- `apps/web-app/src/app/prices/page.tsx` - Heading kleiner `text-xl sm:text-2xl`
- `apps/web-app/src/app/profile/page.tsx` - Header wrapping, `text-2xl sm:text-3xl`, Buttons `size="sm"`
- `apps/web-app/src/app/calendar/page.tsx` - Header `text-2xl sm:text-3xl`, Kalenderzellen `min-h-[56px] sm:min-h-[80px]`
- `apps/web-app/src/app/leaderboard/page.tsx` - `text-2xl sm:text-3xl`
- `apps/web-app/src/app/journal/stats/page.tsx` - `text-2xl sm:text-3xl`
- `apps/web-app/src/app/ai/page.tsx` - Tools-Grid `sm:grid-cols-2 lg:grid-cols-3`
- `apps/web-app/src/components/layout/dashboard-layout.tsx` - Rechteck-Werbebanner `hidden sm:block` (versteckt auf Mobile)

**Mobil-Prinzipien für zukünftige Features:**
- Stats-Grids: immer `grid-cols-2` als mobile Basis (nicht `md:grid-cols-N`)
- Page-Header: `flex flex-wrap items-start justify-between gap-3`
- Überschriften: `text-2xl sm:text-3xl`
- Buttons in Headern: `size="sm"`, icon-only auf Mobile (`hidden sm:inline`)
- Große Icons in Headern: `h-6 w-6 sm:h-8 sm:w-8`

---

## Offene Punkte (Stand 2026-03-04, Session 21)

### ✅ Erledigt (Sessions 1–21)
- Foto-Upload für Journal-Einträge (Session 15)
- SEO: JSON-LD, Sitemap, Metadata (Session 16)
- Öffentliche Grows: Discovery-Feed + Detailseite + Visibility-Toggle (Session 17)
- Likes & Kommentare für öffentliche Grows (Session 18)
- Strain-Reviews UI (Session 18 — bereits in strain-detail-client.tsx vorhanden)
- Preisalarm-Worker (Session 18 — bereits in price-service/index.ts stündlich aktiv)
- Username in Grow-Kommentaren (Session 19)
- Notifications bei Grow-Kommentaren (Session 19)
- Feed-Filter (Status/Environment), Sort-Tabs, Following-Feed, Pagination (Session 20)
- Reply-Formular für Kommentare (Session 20)
- Like-Benachrichtigung (erstes Like → Owner-Notification) (Session 20)
- Grow-Owner Link auf Detailseite (Session 20)
- **Grows auf Profil-Seite (Session 21)** — Tab "Grows" auf `/profile/:username`, userId-Filter im Feed
- **Grow-Suche in Meilisearch (Session 21)** — GROWS-Index aktiv, Tabs (Alle/Strains/Threads/Grows) auf `/search`, Grows-Transform gefixt
- **Strain-Verknüpfung beim Grow erstellen (Session 21)** — Autocomplete in `/journal/new` (Meilisearch suggest), `strainId` wird gespeichert; Grow-Berichte Tab auf Strain-Detailseite
- **Forum-Verbesserungen (Session 21)** — Voting funktional (Thread + Reply, korrekter `/api/community/vote` Endpoint), Thread-Suche auf `/community`, Reply-auf-Reply mit Inline-Form + parentId

---

### Session 18 - Likes & Kommentare für öffentliche Grows (2026-03-03)

**Backend (journal-service) — bereits vorhanden, nur Middleware-Fix:**
- `apps/journal-service/src/routes/social.routes.ts` — `optionalAuthMiddleware` zu `GET /:growId/reactions` + `GET /:growId/comments` hinzugefügt
  - `userReaction` Feld (z.B. `'fire'` = geliked) funktioniert jetzt korrekt für eingeloggte User

**Bestehende Backend-Endpunkte (unter `/api/journal/grows`):**
- `POST /:growId/react` — Toggle Reaction (type: `fire|frosty|jealous|helpful|impressive`)
- `DELETE /:growId/react` — Reaction entfernen
- `GET /:growId/reactions` — Reactions + userReaction (jetzt mit optionalAuth)
- `POST /:growId/comment` — Kommentar erstellen
- `GET /:growId/comments` — Kommentare laden (mit Replies, jetzt mit optionalAuth)
- `PATCH /comments/:id` — Kommentar bearbeiten
- `DELETE /comments/:id` — Kommentar löschen (soft delete)

**Frontend:**
- `apps/web-app/src/hooks/use-journal.ts` — Neue Hooks:
  - `useGrowReactions(growId)` — Reactions + userReaction laden
  - `useLikeGrow(growId)` — Toggle Like (`type: 'fire'` als Standard-Like)
  - `useGrowComments(growId)` — Kommentare laden
  - `useAddGrowComment(growId)` — Kommentar erstellen
  - `useDeleteGrowComment(growId)` — Kommentar löschen
- `apps/web-app/src/app/grows/page.tsx` — `GrowCard` Komponente extrahiert
  - Heart-Button interaktiv (rot = geliked, klick = toggle), `e.stopPropagation()` verhindert Navigation
  - `useGrowReactions` für Live-Like-Count pro Card
- `apps/web-app/src/app/grows/[id]/page.tsx` — Like-Button + Kommentar-Sektion
  - Like-Button im Grow-Header (gefüllt/leer je nach Status, 24h Anti-Spam im Backend)
  - Kommentar-Formular (nur eingeloggte User), Textarea + "Kommentieren" Button
  - Kommentar-Liste mit Replies, Delete-Button für eigene Kommentare
  - Grower-Label: `"{strainName} Grower"` für Owner

**Architektur-Hinweis:**
- "Like" = `fire` Reaction (bestehende Collection)
- `likeCount` im Grow-Modell = Summe aller Reactions (nicht nur fire)
- `reactions.fire` = tatsächlicher Like-Count

---

### Session 19 - Username in Kommentaren + Notifications (2026-03-03)

**Auth-Service:**
- `apps/auth-service/src/routes/auth.routes.ts` — `GET /api/auth/users/by-id/:userId` Endpoint (public)
  - Gibt `{ id, username, avatar }` zurück via `userService.findById()`

**Journal-Service:**
- `apps/journal-service/src/services/social.service.ts` — Notifications nach Kommentar
  - Fire-and-forget HTTP-Request an `notification-service:3006/api/notifications/internal/create`
  - Nur wenn Kommentator ≠ Grow-Owner
  - Notification: `type: 'comment'`, Titel + Message + `/grows/:id` Link
- `docker-compose.yml` — `INTERNAL_SECRET` + `NOTIFICATION_SERVICE_URL` zu journal-service hinzugefügt

**Frontend:**
- `apps/web-app/src/hooks/use-journal.ts` — `useUserById(userId)` Hook
  - React Query, 10 Min Cache, deduplication verhindert N+1
- `apps/web-app/src/app/grows/[id]/page.tsx` — `CommentItem` Komponente
  - Zeigt echten Username (aus `useUserById`) + Initial-Avatar
  - "Grower"-Badge wenn Kommentator = Grow-Owner
  - Replies rekursiv gerendert mit `CommentItem`

**Architektur-Hinweis:**
- `useUserById` gecached per userId → bei 50 Kommentaren von 3 Usern = 3 API-Calls (nicht 50)

---

### Session 20 - Feed-Filter, Following-Feed, Grow-Owner-Link (2026-03-04)

**Backend (journal-service):**
- `apps/journal-service/src/services/feed.service.ts`
  - `getPublicFeed()` — `status` + `environment` Filter (Cache wird bei Filtern bypassed)
  - `getFollowingFeed()` — HTTP-Call zu `community-service:3005/api/community/follows/following/:userId`
  - Status-Filter: `'active'` → `$in: [germination, vegetative, flowering, drying, curing]`
- `apps/journal-service/src/routes/feed.routes.ts` — `status` + `environment` Query-Params, limit=12
- `apps/journal-service/src/services/social.service.ts`
  - Like-Notification: `sendNotification()` wenn `likeCount === 0` (erste Like → Owner benachrichtigen)

**Frontend (web-app):**
- `apps/web-app/src/hooks/use-journal.ts`
  - `usePublicFeed` → `useInfiniteQuery` mit sortBy/status/environment/limit
  - `useFollowingFeed(enabled)` → `useInfiniteQuery` `/api/journal/feed/following`
  - `useAddGrowComment` — `{ content, parentId? }` für Replies
- `apps/web-app/src/app/grows/page.tsx` — Komplett neu:
  - Sort-Tabs: Neueste / Trending / Top / Folge ich
  - Filter-Chips: Status + Environment (hidden auf Following-Tab)
  - "Mehr laden" Button (hasNextPage + fetchNextPage)
  - Following-Tab: Leerer Zustand mit Login-Link oder "User entdecken" Button
- `apps/web-app/src/app/grows/[id]/page.tsx`
  - `CommentItem` — Reply-Formular (parentId übergeben)
  - Grow-Owner Link: `useUserById(grow.userId)` → `von @username` → `/profile/:username`

---

### Session 21 - Notification-Center, Werbeanzeigen-Buchungssystem (2026-03-04/05)
- Notification-Center komplett überarbeitet (WebSocket, Badge, Dropdown, Preferences)
- Quiet-Hours implementiert
- WebSocket-Auth-Fix
- Werbeanzeigen-Buchungssystem (Impressionen, Klicks, CTR, Budget, Kundeninfos)

### Session 22 - Seedbanks (2026-03-05)
- Seedbank-Übersichtsseite mit Bewertungen, Preisen, Filter
- `/admin/seedbanks` Verwaltungsseite

### Session 23 - Landing Page + Auto-Logout + Werbe-Zonen-Editor (2026-03-05)
- Landing Page mit SEO-optimierten Inhalten
- Auto-Logout nach Inaktivität (30 Min)
- Werbe-Zonen-Editor (4 Slots: content-top/bottom, sidebar-top/bottom)
- `AdZoneConfig` Model in MongoDB (community-service)

### Session 24 - Notification-Center Upgrade (2026-03-05)
- Notification-Dropdown komplett überarbeitet
- Einstellungen für Notification-Typen
- Quiet-Hours UI

### Session 25-28 - Diverse Fixes & Erweiterungen (2026-03-05)
- Booking-System für Werbeanzeigen
- Affiliate-Click-Tracking (`/admin/clicks`)
- Achievements-Admin (`/admin/achievements`)
- AI-Service Monitoring (`/admin/ai`)

### Session 29 - Backup-Automatisierung (2026-03-05)
- Neuer `backup-service` (Port 3011, Container: sf1-backup, IP: 172.28.0.24)
- MongoDB (`mongodump`) + PostgreSQL (`pg_dump`) täglich 02:00
- 7 Backups Retention, `.tar.gz` in `/root/SF-1-Ultimate-/backups/`
- REST-API: GET /status, GET /backups, POST /trigger, DELETE /:name
- Admin-UI: `/admin/backup`
- Dockerfile: node:20-slim + mongodb-database-tools + postgresql-client

### Session 30 - Forum-Moderations-Workflow (2026-03-06)
- **Bug-Fix:** `moderatorMiddleware` ohne `authMiddleware` → req.user war nie gesetzt
- **Bug-Fix:** Frontend rief `/resolve` auf, Backend hatte `/review` — Action-Mapping-Mismatch
- `POST /api/community/moderation/reports/:id/resolve` Endpoint (Frontend-Actions → Backend-Actions)
- `getReports()` enriched mit Thread/Reply-Content + contentUrl
- `ReportButton`-Komponente (inline, Flag-Icon, Grund-Auswahl)
- ReportButton in Thread-Detail-Seite (für Threads und Replies)
- `useReportContent`, `useModerationStats` Hooks
- Admin-Moderation-Seite: Stats-Karten (Offene Meldungen, Aktive Sperren, Heute)

### Session 31 - SMTP / E-Mail-System (2026-03-06)
- Brevo SMTP bereits konfiguriert (`smtp-relay.brevo.com:2525`)
- 5 HTML-Templates vorhanden: welcome, password-reset, digest, comment-reply, price-alert
- Willkommens-E-Mail bei Registrierung (fire-and-forget in auth-service)
- `POST /api/notifications/admin/test-email` Endpoint (JWT Admin)
- Admin-Settings: E-Mail-Status-Info + Test-Formular (Empfänger + Template-Auswahl)
- Passwort-Reset-Flow vollständig (forgot-password + reset-password Frontend + Backend)

### Session 32 - Hetzner Object Storage (2026-03-06)
- **Ergebnis: Bereits vollständig implementiert**
- S3Client mit `forcePathStyle:true` für Hetzner
- Photo-Upload: sharp → 3 Größen (original 2048px / medium 800px / thumb 300px) → S3
- S3 getestet: `fsn1.your-objectstorage.com/sf1-uploads` erreichbar, Upload + Delete funktioniert
- Avatar-Upload für auth-service ebenfalls auf S3
- Lokaler `/app/uploads` leer — alle Fotos auf S3

---

## Nächste Schritte (Session 33+)

| Session | Feature |
|---------|---------|
| 33 | Grow-Kalender & Erinnerungen |
| 34 | Ernte-Statistiken & Auswertungen |
| 35 | AI-Service Monitoring |
| 36 | UptimeRobot & Monitoring |
| 37 | Polish & Performance |

**Externe Dienste: alle konfiguriert ✅**
- SMTP: Brevo (`smtp-relay.brevo.com:2525`) ✅
- S3: Hetzner (`fsn1.your-objectstorage.com`) ✅
- Backup: Täglich 02:00 automatisch ✅
- UptimeRobot: noch nicht eingerichtet

**Vollständige Dokumentation aller Sessions:** `DOKUMENTATION.md` im Projekt-Root

---

**Kopiere diesen Text beim nächsten Session-Start einfach in den Chat!**

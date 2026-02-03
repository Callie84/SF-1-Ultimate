# SF-1 Ultimate - Claude Code Kontext

**Letzte Aktualisierung:** 2026-02-04 (Session 5 - Feature 4)
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
| `/admin/analytics` | **NEU** Analytics Dashboard (User, Content, Trends) |
| `/admin/users` | Benutzer verwalten, Rollen, Bannen |
| `/admin/moderation` | Gemeldete Inhalte prüfen |
| `/admin/categories` | Forum-Kategorien |
| `/admin/strains` | Strain-Datenbank (184 Einträge) |

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
6. **Grow-Kalender/Erinnerungen** - Termine und Tasks
7. **Ernte-Statistiken** - Detaillierte Auswertungen
8. **Seedbank-Verwaltung** - Preise, Scraper-Status
9. **AI-Service Monitoring** - Token-Verbrauch, Kosten
10. **System-Logs** - Fehler, API-Calls, Security

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

## Nächste Schritte

Beim Fortsetzen kannst du sagen:
- "Füge Seedbank-Verwaltung hinzu"
- "Implementiere System-Logs Seite"
- "AI-Service Monitoring Dashboard"
- "Content-Management für Banner/FAQ"
- "Backup & Wartungs-Tools"
- "Zeige mir den aktuellen Status"

---

**Kopiere diesen Text beim nächsten Session-Start einfach in den Chat!**

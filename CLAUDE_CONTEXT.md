# SF-1 Ultimate - Claude Code Kontext

**Letzte Aktualisierung:** 2026-02-03 (Session 4)
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

1. **Analytics Dashboard** - Besucher-Stats, beliebte Inhalte
2. **Seedbank-Verwaltung** - Preise, Scraper-Status
3. **AI-Service Monitoring** - Token-Verbrauch, Kosten
4. **System-Logs** - Fehler, API-Calls, Security
5. **Content-Management** - Banner, FAQ, Guides
6. **Backup & Wartung** - DB-Backup, Cache, Reindex

---

## Wichtige Dateien

```
/root/SF-1-Ultimate-/
├── docker-compose.yml          # Alle Services definiert
├── .env                        # Credentials (NICHT committen!)
├── CLAUDE_CONTEXT.md           # Diese Datei - Session-Kontext
├── scripts/
│   ├── import-strains.js       # MongoDB Strain-Import
│   └── sync-strains-to-meilisearch.js
├── apps/
│   ├── web-app/                        # Next.js Frontend
│   │   └── src/app/
│   │       ├── layout.tsx              # Root Layout + Metadata
│   │       ├── icon.svg                # Favicon (NEU Session 4)
│   │       ├── admin/                  # Admin-Seiten
│   │       ├── ai/page.tsx             # AI Tools Index (NEU Session 4)
│   │       └── search/page.tsx         # Suche (gefixt Session 4)
│   ├── auth-service/                   # JWT Auth
│   ├── community-service/
│   │   └── src/routes/
│   │       └── threads.routes.ts       # inkl. /replies Route (gefixt Session 4)
│   ├── ai-service/                     # OpenAI Integration
│   └── search-service/
│       └── src/routes/
│           └── search.routes.ts        # Route-Reihenfolge (gefixt Session 4)
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
- "Erstelle Analytics Dashboard für Admin"
- "Füge Seedbank-Verwaltung hinzu"
- "Implementiere System-Logs Seite"
- "Zeige mir den aktuellen Status"

---

**Kopiere diesen Text beim nächsten Session-Start einfach in den Chat!**

# SF-1 Ultimate — Vollständige Entwicklungsdokumentation

**Projekt:** seedfinderpro.de — Cannabis Growing Community Platform
**Stand:** 2026-03-04 (Session 20)
**Stack:** Next.js 14, Express Microservices, MongoDB, PostgreSQL, Redis, Meilisearch, Docker Compose, Traefik

---

## Inhaltsverzeichnis

1. [Projektübersicht](#1-projektübersicht)
2. [Session 1–2: Grundinfrastruktur](#2-session-12-grundinfrastruktur)
3. [Session 3: Auth, Strains, AI, Admin-Erweiterung](#3-session-3-auth-strains-ai-admin-erweiterung)
4. [Session 4: Bug-Fixes & Such-Fixes](#4-session-4-bug-fixes--such-fixes)
5. [Session 5: Feature-Sprint (Notifications, Messages, Follow, Strains, Analytics, Scraper)](#5-session-5-feature-sprint)
6. [Session 6: AI-Service Komplett-Fix](#6-session-6-ai-service-komplett-fix)
7. [Session 7: Admin-Seiten, Statische Seiten, HTTPS-Redirect](#7-session-7-admin-seiten-statische-seiten-https-redirect)
8. [Session 8: Bug-Fixes, IP-Lock, Ad-Karussell, Scraper-Dashboard](#8-session-8-bug-fixes-ip-lock-ad-karussell-scraper-dashboard)
9. [Session 10: Journal, Passwort-Reset, Preisalarme, 404](#9-session-10-journal-passwort-reset-preisalarme-404)
10. [Session 11: Meilisearch-Fix, Notification-Pipeline, Backup](#10-session-11-meilisearch-fix-notification-pipeline-backup)
11. [Session 12: Seedbank-Admin, Kalender, Gamification, Leaderboard](#11-session-12-seedbank-admin-kalender-gamification-leaderboard)
12. [Session 13: Dashboard-Widget, Kalender-Filter, Seedbank-Toggle, Achievements, Harvest-Stats](#12-session-13-dashboard-widget-kalender-filter-seedbank-toggle-achievements-harvest-stats)
13. [Session 14: AI-Service Monitoring](#13-session-14-ai-service-monitoring)
14. [Session 15a: Foto-Upload für Journal](#14-session-15a-foto-upload-für-journal)
15. [Session 15b: Mobile Responsive Fixes](#15-session-15b-mobile-responsive-fixes)
16. [Session 16: SEO (JSON-LD, Sitemap, Metadata)](#16-session-16-seo-json-ld-sitemap-metadata)
17. [Session 17: Öffentliche Grows](#17-session-17-öffentliche-grows)
18. [Session 18: Likes & Kommentare für öffentliche Grows](#18-session-18-likes--kommentare-für-öffentliche-grows)
19. [Session 19: Usernames in Kommentaren + Benachrichtigungen](#19-session-19-usernames-in-kommentaren--benachrichtigungen)
20. [Session 20: Feed-Filter, Following-Feed, Grow-Owner-Link](#20-session-20-feed-filter-following-feed-grow-owner-link)
21. [Architektur-Entscheidungen](#21-architektur-entscheidungen)
22. [Bekannte Patterns & Fallstricke](#22-bekannte-patterns--fallstricke)
23. [Session 21: Grows auf Profil, Grow-Suche, Strain-Verknüpfung, Forum-Verbesserungen](#23-session-21)
24. [Session 22: Seedbank-Reviews, Notification-Events, Forum Edit/Delete, Grows-Reindex, Profil-Avatar, S3-Integration](#24-session-22)
25. [Offene Punkte & Nächste Schritte](#25-offene-punkte--nächste-schritte)

---

## 1. Projektübersicht

SF-1 Ultimate ist eine Cannabis-Growing-Community-Plattform mit folgenden Hauptbereichen:

| Bereich | Beschreibung |
|---------|-------------|
| **Grow-Journal** | Persönliche Wachstumstagebücher mit Fotos, Messwerten, Erinnerungen |
| **Community** | Forum mit Threads, Replies, Reaktionen, Moderations-System |
| **Strain-Datenbank** | 184 importierte Strains mit Vergleich, Reviews, SEO-optimierten Detailseiten |
| **Preisvergleich** | 11 Seedbank-Feeds (Affiliate), Preisalarme, Click-Tracking |
| **AI-Assistent** | Chat, Pflanzen-Diagnose, Grow-Berater (GPT-4o) |
| **Gamification** | XP, Level, Achievements, Leaderboard |
| **Öffentliche Grows** | Discovery-Feed für veröffentlichte Grows |
| **Admin-Panel** | Vollständiges Backend für alle Plattform-Bereiche |

### Microservices-Architektur

```
Traefik (HTTPS, Let's Encrypt)
├── frontend          :3000  (Next.js 14 — production build)
├── auth-service      :3001  (JWT, PostgreSQL/Prisma, User-Management)
├── price-service     :3002  (MongoDB, Affiliate-Feeds, BullMQ)
├── journal-service   :3003  (MongoDB, Grows, Entries, Reminders, Photos)
├── tools-service     :3004  (VPD/EC/DLI/CO2/PPFD/Power-Rechner)
├── community-service :3005  (MongoDB, Threads, Replies, Follow, Messages, Ads)
├── notification-service :3006 (E-Mail/In-App Benachrichtigungen)
├── search-service    :3007  (Meilisearch Wrapper, Indexierung)
├── media-service     :3008  (Placeholder — S3 noch nicht konfiguriert)
├── gamification-service :3009 (XP, Achievements, Badges)
└── ai-service        :3010  (OpenAI GPT-4o/GPT-4o-mini)
```

**Wichtig:** Frontend läuft als **production build** (kein Hot-Reload). Jede Änderung erfordert `docker-compose restart frontend` (~5–10 min Rebuild).

---

## 2. Session 1–2: Grundinfrastruktur

### Was wurde gemacht

Die initiale Plattform-Infrastruktur wurde aufgebaut:

- **Docker Compose Setup** mit allen 11 Services + Traefik + MongoDB + PostgreSQL + Redis + Meilisearch
- **Traefik Routing** mit HTTPS (Let's Encrypt) und Docker-Labels für Service-Discovery
- **Auth-Service** mit JWT-Token-System (Prisma/PostgreSQL)
- **Community-Service** mit MongoDB-basierten Threads und Replies

### Warum so

Docker Compose bietet eine einfache Möglichkeit, alle Services lokal und auf dem Server identisch zu betreiben. Traefik wurde gewählt, weil es automatisch SSL-Zertifikate über Let's Encrypt ausstellt und Docker-Services per Label-Konfiguration erkennt — kein manuelles Nginx-Config-Management nötig.

---

## 3. Session 3: Auth, Strains, AI, Admin-Erweiterung

### Was wurde gemacht

1. **Auth-Pfade korrigiert** — `/auth/*` → `/api/auth/*` (Traefik-Routing-Konvention)
2. **Admin-Zugang** — User-Rolle auf ADMIN gesetzt
3. **Kategorien-Erstellung gefixt** — `authMiddleware` musste vor `moderatorMiddleware` stehen (Middleware-Reihenfolge)
4. **AI-Service** — JWT-Auth statt nur `X-User-Id` Header
5. **OpenAI** — API-Key in `.env` integriert
6. **Strains-Import** — 184 Strains von Cannlytics API importiert (Script: `scripts/import-strains.js`)
7. **Meilisearch-Sync** — Strains in Suchindex synchronisiert
8. **Health-Endpoints** — `/api/{service}/health` für alle Services
9. **Admin-Panel erweitert** — Strain-Verwaltung (`/admin/strains`), neue UI-Komponenten (Badge, Table, Select, Dialog)

### Warum so

Der `/api/`-Prefix ist notwendig, damit Traefik Backend-Requests von Frontend-Requests unterscheiden kann. Health-Endpoints sind für Monitoring (UptimeRobot) und Docker-Healthchecks erforderlich.

---

## 4. Session 4: Bug-Fixes & Such-Fixes

### Was wurde gemacht

1. **Frontend-Crash bei Suche** — `results.total.toLocaleString()` auf `undefined` — defensive Checks hinzugefügt
2. **Express Router-Reihenfolge** — `/api/search/popular` und `/api/search/history/recent` gaben 404, weil `/:index` Route davor stand → spezifische Routen vor parametrisierte verschoben
3. **Thread-Replies** — `/api/community/threads/:id/replies` gab 404 → Route zu `threads.routes.ts` hinzugefügt
4. **Favicon** — `apps/web-app/src/app/icon.svg` erstellt (Cannabis-Blatt SVG)
5. **AI-Seite** — `/ai` gab 404 → `apps/web-app/src/app/ai/page.tsx` erstellt
6. **Search API Response Transform** — API gab `{ strains: { hits: [...] }, threads: {...} }` zurück, Frontend erwartete `{ results: [], total, query, took }` → `transformApiResponse()` Funktion hinzugefügt

### Warum so

Express verarbeitet Routen in der Reihenfolge ihrer Definition. `/:id` matched auch Strings wie "popular" oder "search" — daher müssen spezifische Routen immer VOR parametrisierten definiert werden. Dies ist eines der häufigsten Express-Probleme in diesem Projekt.

---

## 5. Session 5: Feature-Sprint

### Feature 1: Benachrichtigungen

**Warum:** User brauchen Feedback zu Aktivitäten (Kommentare, Likes, Follows, Preisalarme).

- Notification-Service erhält JWT-Auth-Support
- `notification-dropdown.tsx` im Header-Menü
- Bell-Icon mit Unread-Badge
- 9 Notification-Typen: comment, reply, reaction, follow, mention, price_alert, milestone, badge, system
- Vollständige `/notifications` Seite

### Feature 2: Private Nachrichten

**Warum:** Community-Feature für direkten User-Austausch.

- `Conversation.model.ts` + `Message.model.ts` (MongoDB)
- Chat-Interface mit Konversations-Liste + Nachrichten-Ansicht
- Soft-Delete (User kann Konversation verstecken, Daten bleiben erhalten)
- Unread-Counter im Header

### Feature 3: Follow-System

**Warum:** Sociale Komponente — User können Growern folgen und deren Updates sehen.

- `Follow.model.ts` in community-service
- Öffentliche Profilseiten unter `/profile/[username]`
- Follow/Unfollow-Button mit Hover-State
- Follower/Following-Stats auf Profil
- User-Vorschläge

### Feature 4: Strain-Vergleich

**Warum:** Hauptnutzungsmuster — verschiedene Strains vergleichen vor dem Kauf.

- `/strains` — Datenbank mit Suche + Typ-Filter
- `/strains/compare` — Side-by-Side-Vergleich bis zu 4 Strains
- THC/CBD, Genetik, Effekte, Aromen in Vergleichstabelle
- Deep-Links via URL-Parameter

### Feature 5: Analytics Dashboard

**Warum:** Admin muss Plattform-Aktivität überwachen können.

- Backend-Aggregationen in allen Services (Prisma/MongoDB parallel)
- KPI-Karten (30-Tage-Trends)
- Traffic-Charts (recharts)
- Top-Content-Tabellen

### Feature 6: Feed-Importer / Scraper Dashboard

**Warum:** 11 Affiliate-Feeds müssen verwaltet und getriggert werden können.

- BullMQ-Queue für asynchrone Imports
- Admin-Dashboard mit Queue-Stats
- Manueller Import ("Sofort" oder "In Queue")
- Tier-Klassifizierung nach Provision

---

## 6. Session 6: AI-Service Komplett-Fix

### Was wurde gemacht und warum

Der AI-Service hatte Format-Mismatches zwischen Frontend und Backend — klassisches Problem wenn Frontend und Backend unabhängig entwickelt wurden.

1. **OpenAI Modell-Namen aktualisiert** — `gpt-4-vision-preview` → `gpt-4o`, `gpt-4-turbo-preview` → `gpt-4o-mini`
   *Warum:* Alte Modellnamen funktionierten nicht mehr, OpenAI hat die API-Namen geändert.

2. **Diagnose-Endpoint gefixt** — Frontend sendet `description`, Backend akzeptiert jetzt beides (`description` + `symptoms`)
   *Warum:* Frontend und Backend hatten unterschiedliche Feldnamen.

3. **Structured Output** — Regex-Parsing durch `response_format: { type: 'json_object' }` ersetzt
   *Warum:* Regex auf AI-Output ist fragil. OpenAI's JSON-Mode ist zuverlässiger.

4. **Chat-Response-Format** — `{ response, sessionId }` → `{ content, messageId, timestamp, sessionId }`
   *Warum:* Frontend erwartete anderes Format.

5. **Advisor-Service** — Komplett überarbeitet mit `getGrowPlan()` für Frontend-Format
   *Warum:* Keine der vorhandenen Methoden matched das Frontend-Format.

6. **Rate-Limiting** — Redis-basiertes Sliding-Window (10 Requests/Minute)
   *Warum:* OpenAI-Kosten schützen, DoS-Prävention.

---

## 7. Session 7: Admin-Seiten, Statische Seiten, HTTPS-Redirect

### Was wurde gemacht

1. **3 fehlende Admin-Seiten** — `/admin/threads`, `/admin/grows`, `/admin/logs` (alle gaben 404)
2. **4 statische Seiten** — `/about`, `/privacy`, `/terms`, `/contact` (aus Footer/Register verlinkt)
3. **HTTP→HTTPS-Redirect** — Traefik `entrypoints.web.http.redirections` in `docker-compose.yml`

### System-Benchmark (2026-02-07)
- 16/16 Docker Container: ✅
- 10/10 Backend Services: ✅
- 42/42 Frontend-Routen: ✅ (keine 404s mehr)
- SSL/HTTPS + HTTP-Redirect: ✅
- Response Times: 27–54 ms

---

## 8. Session 8: Bug-Fixes, IP-Lock, Ad-Karussell, Scraper-Dashboard

### Was wurde gemacht und warum

1. **Analytics DashboardLayout** — Sidebar fehlte auf `/admin/analytics`
   *Warum:* Seite hatte keinen `DashboardLayout`-Wrapper.

2. **AI-Chat Sessions persistent** — Beim Öffnen werden bestehende Sessions aus Redis geladen
   *Warum:* User wollten ihre Chat-Geschichte nach Re-Login wiedersehen.

3. **Auth-Redirect für eingeloggte User** — `/`, `/landing`, `/auth/login` → `/dashboard`
   *Warum:* Eingeloggte User sollten nicht die Landing Page sehen.

4. **1 Account pro IP (Redis-basiert)**
   *Warum:* Spam-/Multi-Account-Prävention. Redis-Key `ip:login:{ip}` mit 7-Tage-TTL.

5. **Kategorien Edit/Delete** — PUT + DELETE Endpoints in community-service
   *Warum:* Admin-Buttons funktionieren nicht ohne Backend-Endpoints.

6. **Admin-Backend-Endpoints** — `GET/PATCH/POST /api/auth/admin/users`, `GET /api/auth/admin/logs`
   *Warum:* Frontend-Hooks zeigten auf falsche `/api/admin/*` Pfade.

7. **Ad-Karussell-System**
   *Warum:* Monetarisierung durch Werbung. Zwei Formate: Rechteck (728×90) im Header-Bereich, Quadrat (300×300) in der Sidebar.
   - MongoDB `Ad` Model (type, title, imageUrl, link, isActive, order)
   - Auto-Play mit Pause bei Hover
   - Admin-Verwaltung unter `/admin/ads`

8. **Analytics-Karten klickbar** — `StatCard` mit `href` prop
   *Warum:* UX-Verbesserung für schnelleren Admin-Workflow.

---

## 9. Session 10: Journal, Passwort-Reset, Preisalarme, 404

### Was wurde gemacht und warum

1. **Loki Log-Aggregation** — `path_prefix: /tmp/loki` → `/loki` (Write-Permission-Problem)

2. **Admin Click-Stats Seite** — `/admin/clicks` für Affiliate-Klick-Statistiken
   *Warum:* Admin braucht Übersicht über Affiliate-Performance.

3. **Passwort-Reset E-Mail**
   *Warum:* Nutzer müssen ihr Passwort zurücksetzen können.
   - Handlebars-Template in notification-service
   - `POST /internal/email` Endpoint
   - auth-service ruft notification-service bei `forgot-password` auf (fire-and-forget)

4. **Change-Password Endpoint** — `POST /api/auth/change-password`
   *Warum:* Fehlte komplett.

5. **Preise-Seite Click-Tracking** — Shop-Links durch `/api/prices/click?url=...` ersetzt
   *Warum:* Affiliate-Klicks müssen getrackt werden für Statistiken.

6. **Preisalarme Frontend + JWT-Auth**
   *Warum:* `/alerts` Seite existierte, aber Backend hatte Header-Auth statt JWT → nach Login nicht nutzbar.
   - `authMiddleware()` statt Header-Auth in alerts.routes.ts
   - `populate('seedId')` für bessere Response-Daten

7. **Custom 404-Seite** — `apps/web-app/src/app/not-found.tsx`
   *Warum:* Bessere UX bei toten Links.

8. **Journal Edit-Seiten & Harvest-Feature**
   *Warum:* User konnten Grows und Einträge nicht bearbeiten.
   - `/journal/[id]/edit` — Grow bearbeiten
   - `/journal/[id]/entry/[entryId]/edit` — Eintrag bearbeiten
   - Harvest-Button + Form (Trockengewicht, Qualität)

---

## 10. Session 11: Meilisearch-Fix, Notification-Pipeline, Backup

### Was wurde gemacht und warum

1. **Meilisearch OverwriteModelError gefixt**
   *Problem:* `reindexAll()` mit `Promise.all()` führte zu Mongoose-Session-Konflikten (eine Connection wurde vorzeitig geschlossen).
   *Lösung:* Sequentiell (nicht parallel) ausgeführt + `mongoose.models['X'] || mongoose.model(...)` Pattern für alle Models.
   *Ergebnis:* 2802 Strains, 3 Threads, 1 Grow erfolgreich indexiert.

2. **Auth Internal Endpoint** — `GET /api/auth/users/:userId/email` (X-Internal-Secret Auth)
   *Warum:* notification-service braucht User-E-Mail-Adressen für E-Mail-Versand, darf aber nicht die volle User-Datenbank haben.

3. **Queue Worker für Notification-Pipeline**
   *Warum:* price-service sendet `price_alert` Messages in Redis-Liste, aber niemand verarbeitete sie.
   - `queue.worker.ts` liest aus `queue:notifications` Redis-Liste
   - `startQueueWorker()` in notification-service gestartet

4. **Docker Healthcheck Fix** — `wget` → `node -e "require('http').get(...)"` in node:20-slim Images
   *Warum:* `wget` ist in slim-Images nicht vorhanden.

5. **Vollständiges Backup** — `/root/SF-1-Ultimate-/backups/20260303-001647/`
   *Warum:* Sicherungspunkt vor größeren Feature-Sprints.

---

## 11. Session 12: Seedbank-Admin, Kalender, Gamification, Leaderboard

### Feature 1: Seedbank-Admin-Verwaltung

**Warum:** Admin braucht Übersicht welche Seedbanks aktive Daten haben und wann der letzte Import war.

- `GET /api/prices/admin/seedbanks` — Aggregiert Seeds+Prices aus MongoDB
- `/admin/seedbanks` — Seite mit Tier-Klassifizierung, Stats, Import-Link

### Feature 2: Grow-Kalender mit Reminder-System

**Warum:** Grower müssen regelmäßige Aufgaben (Gießen, Düngen, Ernten) tracken und daran erinnert werden.

- 9 API-Endpoints in `reminders.routes.ts` (Calendar, Upcoming, Overdue, Stats, CRUD)
- Monats-Kalenderansicht mit Reminder-Badges auf Tagen
- 6 Typen: Gießen, Düngen, Umtopfen, Ernte, Kontrolle, Sonstiges
- Wiederholungs-Unterstützung (täglich/wöchentlich/monatlich)

### Feature 3: Gamification auf Profil + Leaderboard

**Warum:** Engagement durch Gamification — User werden für Aktivität belohnt.

- Profil-Seite: Level/XP-Progressbar, Achievement-Badges mit Rarity-Farben
- Öffentliches Profil: echte XP-Daten statt Platzhalter
- `/leaderboard` — Podium für Top 3, vollständige Rangliste

---

## 12. Session 13: Dashboard-Widget, Kalender-Filter, Seedbank-Toggle, Achievements, Harvest-Stats

### Was wurde gemacht und warum

1. **Dashboard "Bevorstehende Erinnerungen" Widget**
   *Warum:* User sollen beim Dashboard-Öffnen sofort sehen, was ansteht.
   - Überfällige Erinnerungen (rot hervorgehoben)
   - Nächste 3 Tage
   - Quick-Actions (Erledigt/Überspringen ohne Navigation)

2. **Kalender growId-Filter**
   *Warum:* User mit mehreren Grows wollten Kalender auf einen Grow filtern.
   - `?growId=` URL-Parameter
   - Grow-Dropdown im Header
   - "Filter aktiv"-Banner mit Reset-Button
   - Journal-Seite hat "Kalender"-Button → `/calendar?growId={id}`

3. **Seedbank Deaktivieren Toggle**
   *Warum:* Manche Seedbanks liefern keine Provision mehr oder haben schlechte Daten — Admin soll sie ausblenden können ohne zu löschen.
   - Redis Set `set:inactive:seedbanks`
   - Price-Service filtert inaktive Seedbanks bei Preisabfragen (`$nin`)

4. **Achievements Admin-Verwaltung**
   *Warum:* Einzelne Achievements können zu leicht oder schwer sein — Admin soll sie deaktivieren können.
   - `/api/gamification/admin/achievements` + toggle-Endpoint
   - Admin-Seite mit Kategorie-Gruppierung, Rarity-Farben, unlockedCount

5. **Ernte-Statistiken**
   *Warum:* User wollen ihre persönliche Ernte-Bilanz sehen (Durchschnittsertrag, beste Strains etc.)
   - `GET /api/journal/grows/stats` — MongoDB-Aggregation (muss VOR `/:id` Route stehen!)
   - `/journal/stats` — Persönliche Statistik-Seite mit Balken, Top-Yields, Lieblings-Strains

6. **Reminder Worker + Notification Integration**
   *Warum:* Erinnerungen müssen automatisch als In-App-Notifications erscheinen.
   - `reminder.worker.ts` in journal-service läuft alle 30 Minuten
   - Sendet via `POST /api/notifications/internal/create` an notification-service
   - Vorab-Benachrichtigung konfigurierbar (`notifyBefore` Minuten)

7. **Next.js 14 Fix: `useSearchParams()` → `window.location.search`**
   *Warum:* `useSearchParams()` in Client-Komponenten ohne `<Suspense>`-Wrapper verursacht Prerender-Fehler in Next.js 14. `window.location.search` in `useEffect([], [])` umgeht dies.

---

## 13. Session 14: AI-Service Monitoring

### Was wurde gemacht und warum

**Warum:** OpenAI-API kostet Geld. Admin muss Token-Verbrauch und Kosten überwachen können.

- `token-tracker.ts` — Redis-basiertes Token-Tracking (fail-silent, async)
- Täglich + monatlich in Redis gespeichert (90 Tage TTL)
- Kosten-Berechnung: gpt-4o ($0.0025/$0.01), gpt-4o-mini ($0.00015/$0.0006)
- Tracking in allen 3 AI-Services: Chat, Diagnose, Advisor
- `GET /api/ai/admin/stats` — Heute, letzte 7 Tage, letzter Monat
- `/admin/ai` — Dashboard mit KPIs, Endpoint-Breakdown, Modell-Split, 7-Tage-Chart

---

## 14. Session 15a: Foto-Upload für Journal

### Was wurde gemacht und warum

**Warum:** Das wichtigste fehlende Feature im Journal — User wollen Fotos ihrer Pflanzen hochladen. Bisher war nur ein Platzhalter ("Foto-Upload kommt bald...") vorhanden.

**Design-Entscheidung:** S3/MinIO war noch nicht konfiguriert, daher **lokaler Disk-Storage** im journal-service Container (`/app/uploads/`). Da das Volume `./apps/journal-service:/app` gemountet ist, liegen die Dateien auch auf dem Host unter `./apps/journal-service/uploads/`.

#### Backend (journal-service)

**`photo.service.ts`** — Komplett neu geschrieben:
- Multer für multipart/form-data Upload
- Sharp für Bild-Prozessing: Original (2048px max), Thumbnail (300px), Medium (800px)
- EXIF-Stripping (Datenschutz)
- URL-Format: `${CORS_ORIGIN}/api/journal/uploads/{userId}/{fileId}.jpg`
- `delete()` löscht alle 3 Größen via `fs.promises.unlink()`
- `getByEntry(entryId, userId)` für GET-Endpoint

**`index.ts`**:
```typescript
// CORS-Policy für Bilder (Cross-Origin erlaubt)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// Static files VOR json-Middleware (sonst parsed Express JSON zuerst)
app.use('/api/journal/uploads', express.static(UPLOADS_DIR));
```

**`photos.routes.ts`**:
- `GET /:entryId/photos` hinzugefügt (VOR POST-Routen, Router-Reihenfolge!)

#### Frontend (web-app)

**`use-journal.ts`**:
- `useUploadPhoto(entryId, growId)` — FormData multipart POST, invalidiert entries-Cache
- `useDeletePhoto(growId)` — DELETE + Cache-Invalidierung

**`photo-upload.tsx`** — Neue Komponente:
- Drag-and-Drop oder Klick-Upload
- Lokale Vorschau via `URL.createObjectURL` (sofort, ohne Netzwerk)
- Bestehende Fotos (aus DB) mit Hover-Delete
- Upload-Progress-Spinner pro Foto
- Validierung: JPEG/PNG/WebP, max 10 MB
- Sequentielles Hochladen (nicht parallel)

**Seiten-Integration:**
- `entry/new/page.tsx` — Photo-Upload erscheint inline nach Entry-Erstellung
- `entry/[entryId]/edit/page.tsx` — Photo-Verwaltung unten in eigener Card
- `journal/[id]/page.tsx` — Timeline nutzt `photo.thumbnailUrl || photo.url` statt string-Check

---

## 15. Session 15b: Mobile Responsive Fixes

### Was wurde gemacht und warum

**Warum:** Platform wurde primär Desktop-first entwickelt. Mobile-Ansicht war auf vielen Seiten kaputt (Overflow, zu große Texte, zu viele Spalten).

**Betroffene Seiten:** Dashboard, Journal, Community, Admin, Strains, Prices, Profile, Calendar, Leaderboard, Journal-Stats, AI-Index, Dashboard-Layout

**Mobile-Prinzipien für zukünftige Implementierungen:**
```
Stats-Grids:    grid-cols-2 als Basis (nicht md:grid-cols-N)
Page-Header:    flex flex-wrap items-start justify-between gap-3
Überschriften:  text-2xl sm:text-3xl
Buttons:        size="sm", Icon-only auf Mobile (hidden sm:inline)
Ad-Banner:      hidden sm:block (ausgeblendet auf Mobile)
```

---

## 16. Session 16: SEO (JSON-LD, Sitemap, Metadata)

### Was wurde gemacht und warum

**Warum:** Strain-Seiten sind der primäre organische Traffic-Kanal. Ohne structured Data und optimierte Metadata werden sie von Google nicht als Rich Results angezeigt.

#### JSON-LD Structured Data (`/strains/[slug]/page.tsx`)

Schema.org `@graph` mit zwei Typen:
1. **BreadcrumbList** — Navigations-Pfad für Google
2. **Product** — Strain als Produkt mit:
   - `brand`: Breeder als Organization
   - `additionalProperty`: THC/CBD/Typ als PropertyValue
   - `aggregateRating`: Nur wenn Reviews vorhanden (sonst Schema-Fehler)
   - `AggregateOffer` mit EUR-Währung (verlinkt zu Preisvergleich)

Beide Fetches (Strain + Reviews) mit `{ next: { revalidate: 3600 } }` gecacht.

#### Sitemap

`apps/web-app/src/app/sitemap.ts` erweitert:
- `/search` (0.7, weekly) + `/leaderboard` (0.6, daily)
- 6 Tool-Unterseiten (0.5, monthly)
- Gesamt: **199 URLs** (16 statisch + 183 Strain-Seiten)

#### Metadata-Layouts

**Problem:** Client-Komponenten (`'use client'`) können kein `export const metadata` haben.
**Lösung:** Parent `layout.tsx` als Server-Komponente für section-weite Defaults:
- `apps/web-app/src/app/strains/layout.tsx` — NEU (Strain-Liste ist Client-Komponente)
- `apps/web-app/src/app/prices/layout.tsx` — `'use client'` entfernt
- `apps/web-app/src/app/search/layout.tsx` — `'use client'` entfernt

---

## 17. Session 17: Öffentliche Grows

### Was wurde gemacht und warum

**Warum:** Grows sollten nicht nur privat sein. User wollen ihre Grows mit der Community teilen und andere Grows zur Inspiration entdecken. Feature war noch nicht implementiert — nur ein Toggle existierte im Backend, aber kein Frontend-Discovery.

#### Backend (journal-service)

**`grows.routes.ts`**: `GET /:id` von `authMiddleware` → `optionalAuthMiddleware`
*Warum:* Nicht-eingeloggte User müssen öffentliche Grows sehen können.

**`entries.routes.ts`**: `GET /:growId/entries` → `optionalAuthMiddleware`
*Warum:* Einträge müssen ohne Login sichtbar sein (für Detail-Timeline).

**`feed.service.ts`**: `.select('-userId')` entfernt
*Warum:* War aus Datenschutz-Überlegungen entfernt worden, aber `userId` wird für den Owner-Check im Frontend benötigt (`grow.userId === user.id`).

#### Frontend (web-app)

**`use-journal.ts`** — 3 neue Hooks:
- `usePublicFeed(options?)` — `sortBy: recent|trending|top`, 2 min staleTime (häufig abgerufen)
- `usePublicEntries(growId)` — Entries ohne Auth
- `useToggleVisibility(id)` — PATCH `grows/:id` mit `{isPublic: boolean}`

**`apps/web-app/src/app/grows/page.tsx`** — NEU: Discovery-Feed:
- 3 Sortier-Tabs: Neueste / Trending (Views) / Top (Likes)
- Grow-Cards mit: Strain-Name, Breeder, Typ, Environment, Status-Badge, Harvest-Ergebnis
- Leerer Zustand mit CTA zum Journal

**`apps/web-app/src/app/grows/[id]/page.tsx`** — NEU: Öffentliche Detailansicht:
- Timeline identisch zu persönlichem Journal
- Fotos, Messwerte, Reactions/Kommentare-Counts
- "Bearbeiten"-Button nur für Owner: `user && grow && grow.userId === user.id`

**`apps/web-app/src/app/journal/[id]/page.tsx`**:
- Globe/Lock-Toggle-Button (grün wenn public)
- "Öffentlich ansehen" → `/grows/:id` wenn public

**`sidebar.tsx`**: "Öffentliche Grows" (Sprout-Icon) zwischen Journal und Community eingefügt

#### TypeScript-Bug gefixt

`Property 'userId' does not exist on type 'User'` — Die `User` Type in `src/types/auth.ts` hat `id: string`, nicht `userId`. Fix: `grow.userId === user.id` (nicht `user.userId`).

---

## 18. Session 18: Likes & Kommentare für öffentliche Grows

### Was wurde gemacht

Das Social-System für öffentliche Grows wurde aktiviert. Die Backend-Endpoints existierten bereits vollständig — es fehlte nur die richtige Middleware und das Frontend.

**Backend (journal-service):**

- `apps/journal-service/src/routes/social.routes.ts`
  - `GET /:growId/reactions` — `optionalAuthMiddleware` hinzugefügt (vorher: anonym, `userReaction` immer null)
  - `GET /:growId/comments` — `optionalAuthMiddleware` hinzugefügt

**Bestehende Backend-Endpunkte (unter `/api/journal/grows`):**

| Endpoint | Beschreibung |
|----------|-------------|
| `POST /:growId/react` | Toggle Reaction (`fire`, `frosty`, `jealous`, `helpful`, `impressive`) |
| `DELETE /:growId/react` | Reaction entfernen |
| `GET /:growId/reactions` | Reactions + `userReaction` (jetzt mit optionalAuth) |
| `POST /:growId/comment` | Kommentar erstellen (mit optionalem `parentId` für Replies) |
| `GET /:growId/comments` | Kommentare laden inkl. Replies (jetzt mit optionalAuth) |
| `PATCH /comments/:id` | Kommentar bearbeiten |
| `DELETE /comments/:id` | Kommentar löschen (soft delete, `isDeleted: true`) |

**Frontend:**

- `apps/web-app/src/hooks/use-journal.ts` — Neue Hooks:
  - `useGrowReactions(growId)` — Reactions + `userReaction` laden
  - `useLikeGrow(growId)` — Toggle Like (`type: 'fire'` als Standard-Like)
  - `useGrowComments(growId)` — Kommentare laden
  - `useAddGrowComment(growId)` — `{ content, parentId? }` für Kommentare + Replies
  - `useDeleteGrowComment(growId)` — Kommentar löschen

- `apps/web-app/src/app/grows/page.tsx` — `GrowCard` Komponente extrahiert:
  - Heart-Button interaktiv (rot = geliked, klick = toggle)
  - `e.stopPropagation()` verhindert Navigation beim Like-Klick
  - `useGrowReactions` für Live-Like-Count pro Card

- `apps/web-app/src/app/grows/[id]/page.tsx` — Like + Kommentar-Sektion:
  - Like-Button im Grow-Header (Heart, gefüllt/leer je nach `userReaction === 'fire'`)
  - Kommentar-Formular (Textarea + Button, nur für eingeloggte User)
  - `CommentItem`-Komponente: Delete-Button für eigene Kommentare, Replies rekursiv gerendert
  - "Grower"-Badge wenn Kommentator = Grow-Owner

### Warum so

**"Like" = `fire` Reaction:** Die bestehende `Reaction`-Collection unterstützt bereits mehrere Typen. `fire` wird als Standard-Like verwendet, um Erweiterungen (weitere Reaktionstypen) ohne Schema-Änderung zu ermöglichen.

**`likeCount` vs. `reactions.fire`:** `likeCount` im Grow-Modell zählt alle Reactions (für Sortierung). Der tatsächliche Like-Count wird aus `reactions.fire` gelesen (aggregierte Zählung pro Typ).

---

## 19. Session 19: Usernames in Kommentaren + Benachrichtigungen

### Was wurde gemacht

Kommentare zeigen jetzt echte Usernamen statt Platzhalter, und der Grow-Owner wird benachrichtigt wenn jemand seinen Grow kommentiert oder zum ersten Mal liked.

**Auth-Service:**

- `apps/auth-service/src/routes/auth.routes.ts` — Neuer öffentlicher Endpoint:
  ```
  GET /api/auth/users/by-id/:userId
  Response: { id, username, avatar }
  ```
  Gibt `username` aus `userService.findById()` zurück (kein Auth erforderlich).

**Journal-Service — Benachrichtigungen:**

- `apps/journal-service/src/services/social.service.ts`
  - `sendNotification(payload)` — Fire-and-forget HTTP POST an `notification-service:3006/api/notifications/internal/create` mit `X-Internal-Secret` Header
  - **Kommentar-Notification:** Wird ausgelöst wenn `commenter !== owner`
  - **Like-Notification:** Wird ausgelöst beim ersten Like (`grow.likeCount === 0`)

- `docker-compose.yml` — journal-service bekommt:
  ```yaml
  INTERNAL_SECRET: ${INTERNAL_SECRET}
  NOTIFICATION_SERVICE_URL: http://notification-service:3006
  ```

**Frontend:**

- `apps/web-app/src/hooks/use-journal.ts` — `useUserById(userId)`:
  - React Query, 10 Min `staleTime`
  - React Query deduplication: bei 50 Kommentaren von 3 Usern → nur 3 API-Calls

- `apps/web-app/src/app/grows/[id]/page.tsx` — `CommentItem`:
  - Zeigt echten Username via `useUserById(comment.userId)`
  - Avatar-Initial aus Username (erstem Buchstaben)
  - "Grower"-Badge wenn `comment.userId === grow.userId`
  - Reply-Formular: "Antworten"-Button öffnet Textarea, `parentId` wird mitgesendet

### Warum so

**N+1-Vermeidung:** React Query cached `useUserById` per `userId` als Query Key. Wenn 50 Kommentare von 3 verschiedenen Usern kommen, dedupliciert React Query auf 3 API-Calls automatisch — ohne eigene Batch-Logik.

**Fire-and-Forget Notifications:** Notifications blockieren den API-Response nicht. Bei Notification-Service-Ausfall gibt es keinen Fehler für den User — nur ein `logger.warn`.

---

## 20. Session 20: Feed-Filter, Following-Feed, Grow-Owner-Link

### Was wurde gemacht

Der öffentliche Grows-Feed wurde deutlich verbessert: Pagination, Filter, Following-Tab und ein Link zum Grow-Owner auf der Detailseite.

**Backend (journal-service):**

`apps/journal-service/src/services/feed.service.ts`:

- `getPublicFeed()` — `status` + `environment` Filter:
  - `status: 'active'` → `$in: ['germination', 'vegetative', 'flowering', 'drying', 'curing']`
  - Alle anderen Status: direkter Vergleich
  - **Cache-Bypass** bei aktiven Filtern (nur ungefilterte Anfragen landen im Redis-Cache)

- `getFollowingFeed()` — HTTP-Call zu community-service:
  ```typescript
  GET community-service:3005/api/community/follows/following/:userId?limit=500
  Response: { following: string[] }  // Array von userId-Strings
  ```
  Gibt Grows von gefolgten Usern zurück, sortiert nach `createdAt: -1`.

`apps/journal-service/src/routes/feed.routes.ts`:
- Default limit: 12 (war zuvor unbegrenzt)
- Neue Query-Parameter: `status`, `environment`

**Frontend:**

`apps/web-app/src/hooks/use-journal.ts`:
- `usePublicFeed` → `useInfiniteQuery` mit `sortBy`, `status`, `environment`, `limit: 12`
- `useFollowingFeed(enabled)` → `useInfiniteQuery` auf `/api/journal/feed/following`
- `getNextPageParam`: `loaded < total ? loaded : undefined` (offset-basierte Pagination)

`apps/web-app/src/app/grows/page.tsx` — Komplett neu:

| Feature | Details |
|---------|---------|
| Sort-Tabs | Neueste / Trending / Top / Folge ich |
| Status-Filter | Alle / Aktiv / Blüte / Geerntet |
| Umgebungs-Filter | Alle / Indoor / Outdoor / Greenhouse |
| Pagination | "Mehr laden" Button (`hasNextPage + fetchNextPage`) |
| Filter-Reset | Button erscheint wenn Filter aktiv |
| Following-Tab | Filter ausgeblendet, eigener Feed, Leerer Zustand mit Login-Link |

`apps/web-app/src/app/grows/[id]/page.tsx`:
- `const { data: growOwner } = useUserById(grow?.userId)` nach Grow-Load
- CardDescription ergänzt um: `von @username` → Link zu `/profile/:username`

### Warum so

**Offset-basierte Pagination statt Cursor:** Einfacher mit Filtern kombinierbar. Die `skip`-basierte MongoDB-Abfrage ist bei den aktuellen Datenmengen performant genug.

**Following-Feed als separater Hook:** Trennung ermöglicht unterschiedliche Cache-Strategien — public feed wird 2 Min gecacht, following feed ist immer frisch (kein eigener Cache, da personalisiert).

---

## 21. Architektur-Entscheidungen

### Auth-Pattern

Alle Services verwenden JWT-Verifikation direkt (gleicher `JWT_SECRET` in `.env`). Traefik ForwardAuth wurde **nicht** aktiviert (Config-Files nicht im Container gemountet). Das bedeutet: Jeder Service hat seinen eigenen `authMiddleware`.

### `optionalAuthMiddleware`

Für öffentliche Endpunkte die optional eingeloggt sein können:
```typescript
// Setzt req.user wenn Token vorhanden, sonst req.user = undefined
// Gibt keinen 401 zurück wenn kein Token
```

### React Query Patterns

```typescript
// Cache-Keys immer über journalKeys/etc. Objekte
const journalKeys = {
  grows: () => ['grows'],
  grow: (id: string) => ['grows', id],
  entries: (growId: string) => ['grows', growId, 'entries'],
};
// invalidateQueries nach Mutations
queryClient.invalidateQueries({ queryKey: journalKeys.entries(growId) });
```

### `apiClient` Axios-Interceptor

```typescript
// apiClient gibt response.data direkt zurück — KEIN response.data.data wrapping!
// API gibt zurück: { grow: {...} }
// Nach apiClient.get(): { grow: {...} }  ← direkt nutzbar
```

### Next.js 14 Metadata

```typescript
// Server-Komponenten: export const metadata = {...}
// Dynamisch: export async function generateMetadata({ params }) {...}
// Client-Komponenten: parent layout.tsx als Server-Komponente nutzen
```

---

## 22. Bekannte Patterns & Fallstricke

### Express Router-Reihenfolge (häufigster Bug)
```typescript
// RICHTIG — spezifisch vor parametrisiert:
router.get('/search', handler);
router.get('/popular', handler);
router.get('/:id', handler);  // zuletzt!

// FALSCH:
router.get('/:id', handler);  // fängt 'search' und 'popular' ab!
```

### Mongoose Model-Registrierung
```typescript
// RICHTIG — verhindert OverwriteModelError:
const Model = mongoose.models['Name'] || mongoose.model('Name', schema);
```

### `reindexAll()` in search-service
```typescript
// FALSCH — mongoose-Session-Konflikte:
await Promise.all([indexStrains(), indexThreads(), indexGrows()]);

// RICHTIG — sequentiell:
await indexStrains();
await indexThreads();
await indexGrows();
```

### Foto-URLs in Timeline
```typescript
// Fotos können String (alt) oder Photo-Objekt (neu) sein:
const url = typeof photo === 'string' ? photo : (photo.thumbnailUrl || photo.url);
```

### `!` in Shell-Passwörtern
```bash
# Passwort mit ! in curl führt zu Escape-Problemen
# → Python oder Node für API-Tests nutzen, nicht curl mit single quotes
```

---

## 23. Session 21: Grows auf Profil, Grow-Suche, Strain-Verknüpfung, Forum-Verbesserungen

### Grows auf Profil-Seite

**Problem:** Öffentliche Grows eines Users waren nur im globalen Feed sichtbar, nicht auf seinem Profil.

**Backend (`apps/journal-service/src/services/feed.service.ts`):**
```typescript
// filterUserId Option in getPublicFeed()
if (options.filterUserId) {
  filter.userId = options.filterUserId;
  // Cache bypass weil personalisierter Filter
}
```
`apps/journal-service/src/routes/feed.routes.ts`: `filterUserId` aus `req.query.userId` übergeben.

**Frontend (`apps/web-app/src/app/profile/[username]/page.tsx`):**
- Tab-Navigation: "Übersicht" / "Grows"
- `usePublicFeed({ userId: profile?.id })` → GrowCard-Grid
- Inline `GrowCard`-Komponente (identisch zu `/grows`)
- "Mehr laden"-Button mit `hasNextPage + fetchNextPage`

**Hook (`apps/web-app/src/hooks/use-journal.ts`):**
```typescript
// usePublicFeed nimmt jetzt userId option
export function usePublicFeed(options?: { userId?: string; ... })
// userId wird in queryKey und URLSearchParams eingebaut
```

---

### Grow-Suche in Meilisearch

**Backend war bereits vollständig implementiert:**
- GROWS-Index in `meilisearch.ts` konfiguriert
- `reindexGrows()` in `indexing.service.ts` vorhanden
- `searchAll()` enthielt bereits grows
- Route `GET /api/search/grows` via `/:index`-Handler verfügbar

**Reindex auslösen** (JWT muss aus Container generiert werden):
```bash
docker exec sf1-search-service node -e "
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({userId:'x',role:'ADMIN'}, process.env.JWT_SECRET);
  console.log(token);
"
# Dann POST /api/search/reindex/grows mit Bearer-Token
```

**Frontend-Fix (`apps/web-app/src/app/search/page.tsx`):**
```typescript
// Grows transform korrigiert:
title: hit.strainName || hit.name || 'Grow',   // war: hit.title
description: hit.notes?.substring(0, 200),       // war: hit.description
url: `/grows/${hit.id}`,                         // war: /journal/${hit.id}
metadata: { status, environment, yieldDry }      // war: { strain }
```
- `activeTab`-State: `'all' | 'strains' | 'threads' | 'grows'`
- Tab-Navigation mit Zählern aus `results.facets.types`

**`apps/web-app/src/components/search/search-results.tsx`:** GROW-Metadaten zeigen jetzt `status` (Badge), `environment`, `yieldDry`.

---

### Strain-Verknüpfung beim Grow erstellen

**`apps/search-service/src/routes/search.routes.ts`:**
Neuer Route `GET /strains/suggest` VOR `/:index/suggest` — gibt vollständige Objekte zurück:
```typescript
router.get('/strains/suggest', async (req, res, next) => {
  const results = await searchService.search({
    query: q, index: 'STRAINS', limit: 6,
    attributesToRetrieve: ['id', 'name', 'breeder', 'type', 'slug'],
  });
  res.json({ suggestions: results.hits.map(h => ({
    id: h.id, name: h.name, breeder: h.breeder, type: h.type, slug: h.slug
  }))});
});
// WICHTIG: muss VOR /:index/suggest stehen (Express route order)
// /:index/suggest gibt nur Strings zurück — nicht ausreichend für Verknüpfung
```

**`apps/web-app/src/app/journal/new/page.tsx`** (Komplett-Rewrite):
- `StrainAutocomplete`-Komponente mit 300ms Debounce
- Ruft `GET /api/search/strains/suggest?q=...&limit=6` auf
- Dropdown mit `{id, name, breeder, type}` Objekten
- Bei Auswahl: `setValue('strainId', s.id)`, `setValue('strainName', s.name)`, `setValue('breeder', s.breeder)` (Controller aus react-hook-form nötig)
- Grüne "Aus Datenbank verknüpft" Bestätigung + X-Button zum Zurücksetzen
- `strainId: z.string().optional()` in Zod-Schema ergänzt

**`apps/web-app/src/hooks/use-journal.ts`:**
```typescript
export function useStrainFeed(strainId: string | undefined) {
  return useInfiniteQuery({
    queryKey: [...journalKeys.all, 'feed', 'strain', strainId],
    queryFn: async ({ pageParam = 0 }) =>
      api.get(`/api/journal/feed/strain/${strainId}?limit=12&skip=${pageParam}`),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.flatMap(p => p.grows).length;
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled: !!strainId,
    initialPageParam: 0,
  });
}
```

**`apps/web-app/src/app/strains/[slug]/strain-detail-client.tsx`:**
- `useStrainFeed(strain?._id)` am Bottom der Detailseite
- "Grow-Berichte"-Card: Liste mit Status-Badge, Environment, yieldDry, Statistiken
- "Mehr laden"-Button, Leer-Zustand mit "Grow starten"-Link

---

### Forum-Verbesserungen

**Problem:** Voting-Hooks riefen falsche Endpoints auf (`threads/:id/vote` existiert nicht). Real: `POST /api/community/vote`.

**Hook-Fixes (`apps/web-app/src/hooks/use-community.ts`):**
```typescript
// VORHER (falsch):
api.post(`/api/community/threads/${threadId}/vote`, { type: 'UPVOTE' })

// NACHHER (korrekt):
api.post('/api/community/vote', {
  targetId: threadId,
  targetType: 'thread',  // oder 'reply'
  type: 'upvote',        // lowercase! Backend-Zod erwartet lowercase
})
```

Neue Hooks:
```typescript
// Batch-Vote-Status für alle sichtbaren Items auf einmal laden (N+1 Prevention)
useUserVotesBatch(ids: string[])  // POST /api/community/votes/batch

// Live-Suche im Forum
useSearchThreads(query: string)  // GET /api/community/threads/search?q=...
```

**`apps/web-app/src/app/community/thread/[id]/page.tsx`** (Komplett-Rewrite):
- `VoteButtons`-Komponente: Pfeil-Buttons mit Farb-Highlighting (primary=upgevoted, destructive=downgevoted)
- `ReplyCard`-Komponente: eigener `useVoteReply`-Hook pro Reply
- Batch-Load aller Vote-States: `useUserVotesBatch([threadId, ...replyIds])`
- Reply-auf-Reply: `replyingTo: {id, username} | null` State
  - Formular-Header: "Antwort an @username (abbrechen)"
  - Submit übergibt `parentId: replyingTo?.id`
  - Nested Replies: `ml-8 border-l-2 border-l-primary/20`
- Share-Button kopiert URL via `navigator.clipboard`
- Username → `/profile/:username`

**`apps/web-app/src/app/community/page.tsx`:**
- Suchfeld mit Echtzeit-Suche (ab 2 Zeichen, `useSearchThreads`)
- `isSearching = searchQuery.length >= 2`
- Suchergebnisse ersetzen Kategorien/Stats/Pinned während Suche aktiv
- X-Button zum Leeren

---

## 24. Session 22: Seedbank-Reviews, Notification-Events, Forum Edit/Delete, Grows-Reindex, Profil-Avatar, S3-Integration

### 24.1 Seedbank-Reviews

**Ziel:** User können Seedbanks bewerten (1–5 Sterne + Kommentar).

**Backend** (`community-service`):
- Neues Mongoose-Modell `SeedbankReview` mit uniquem Index `{ seedbankSlug, userId }`
- `GET /api/community/seedbank-reviews` — alle aggregierten Ratings
- `GET /api/community/seedbank-reviews/:slug` — Reviews einer Seedbank
- `POST /api/community/seedbank-reviews/:slug` — Review erstellen/updaten (Auth)
- `DELETE /api/community/seedbank-reviews/:slug/my` — eigenen Review löschen

**Backend** (`price-service`):
- `GET /api/prices/seedbanks` — öffentliche Liste aller 11 Seedbanks (slug + name)

**Frontend** (`/seedbanks`):
- `SeedbankCard` mit lazy-loaded Reviews, interaktiver `StarRating`-Komponente
- Eigenen Review schreiben, bearbeiten, löschen
- Sidebar-Link "Seedbanks" (Leaf-Icon)

---

### 24.2 Notification-Center: Echte Events verdrahtet

**Ziel:** Echte Benachrichtigungen bei Forum-Aktivität (statt nur UI-Shell).

**Neues File:** `apps/community-service/src/services/notification-client.ts`
- Fire-and-forget HTTP-Client → `POST /api/notifications/internal/create`
- `X-Internal-Secret`-Header zur Authentifizierung
- `AbortSignal.timeout(3000)` — blockiert nie den Hauptflow
- `.env`: `NOTIFICATION_SERVICE_URL=http://sf1-notification-service:3006`

**Verdrahtung:**
| Trigger | Empfänger | Typ |
|---------|-----------|-----|
| Reply auf Thread | Thread-Autor | `reply` |
| Nested Reply | Parent-Reply-Autor | `reply` |
| @mention in Reply | Genannter User | `mention` |
| Follow | Gefolgter User | `follow` |
| Upvote auf Thread/Reply | Content-Autor | `reaction` |

**Bug gefixt:** `notification-service` verwendete Redis v4-API falsch (`redis.lpush` → `redis.lPush`).

---

### 24.3 Forum: Eigene Threads und Replies bearbeiten/löschen

**Ziel:** User können ihre eigenen Beiträge im Thread inline editieren und löschen.

**Frontend** (`/community/thread/[id]/page.tsx`, vollständige Überarbeitung):
- Thread-Owner-Check: `thread.userId === user.id`
- **Thread bearbeiten:** Inline-Edit für Titel (Input) + Content (Textarea), Speichern/Abbrechen
- **Thread löschen:** Bestätigungsdialog inline → Redirect zu `/community`
- **Reply bearbeiten:** Inline-Edit per ReplyCard, `(bearbeitet)`-Badge nach Speichern
- **Reply löschen:** Inline-Bestätigung
- Nur sichtbar für den jeweiligen Autor (keine Mod-Actions im Frontend)

---

### 24.4 Grows-Reindex automatisieren (Meilisearch)

**Ziel:** Meilisearch-GROWS-Index wird automatisch aktuell gehalten.

**search-service** — Neuer interner Endpunkt:
```
POST /api/search/internal/grows
Header: X-Internal-Secret
Body: { action: 'index'|'delete', document?: {...}, id?: string }
```
Kein Admin-JWT nötig, nur INTERNAL_SECRET.

**journal-service** — Neues File `src/services/search-client.ts`:
- `indexGrow(grow)` — fire-and-forget nach create/update/harvest
- `deleteGrowFromIndex(growId)` — fire-and-forget nach delete
- `SEARCH_SERVICE_URL=http://sf1-search-service:3007` in `.env` + docker-compose

**Grow-Dokument-Format für Meilisearch:**
```typescript
{ id, strainName, breeder, userId, status, environment, type,
  isPublic, tags, yieldDry, notes, viewCount, createdAt }
```

---

### 24.5 Profil-Bio und Avatar

**Ziel:** User können Bio, Anzeigename und Profilbild bearbeiten.

**auth-service** — Neue Endpoints:
- `PATCH /api/auth/profile` — Bio + Anzeigename speichern
- `POST /api/auth/profile/avatar` — Bild-Upload (max 5 MB, JPEG/PNG/WebP/GIF)
- `GET /api/auth/me` — gibt jetzt auch `bio` und `avatar` zurück
- Neue Methode `userService.updateProfile(userId, { bio, displayName, avatar })`

**Auth-Service + S3:** Avatar wird zu S3 hochgeladen (`avatars/{userId}.jpg`), URL in DB gespeichert.

**Frontend** (`/profile`):
- Camera-Button triggert verstecktes `<input type="file">`
- `handleAvatarUpload` → `api.post('/api/auth/profile/avatar', formData)` → `refreshUser()`
- Spinner während Upload

---

### 24.6 Hetzner Object Storage (S3) Integration

**Ziel:** Foto-Uploads dauerhaft auf Hetzner S3 statt lokalem Dateisystem.

**Credentials:**
```
S3_ENDPOINT=https://fsn1.your-objectstorage.com
S3_BUCKET=sf1-uploads
S3_REGION=eu-central
S3_ACCESS_KEY=XBUF44JOISI3EC73YZCB
```
*(Secret Key in .env)*

**Bucket-Policy:** `s3:GetObject` für `*` → alle Objekte öffentlich lesbar ohne Presigned URLs.

**journal-service** — `src/config/s3.ts`:
- `uploadToS3(key, buffer, contentType)` → gibt öffentliche URL zurück
- `deleteFromS3(key)` → fire-and-forget
- `keyFromUrl(url)` → URL → S3-Key

**photo.service.ts** — vollständig auf S3 umgestellt:
- 3 Varianten (original 2048px / medium 800px / thumb 300px) → S3-Pfad `photos/{userId}/{fileId}[_medium|_thumb].jpg`
- Löschen: alle 3 Keys aus S3 entfernt
- Keine lokalen Dateien mehr

**auth-service** — `src/config/s3.ts`:
- `uploadAvatarToS3(userId, buffer, ext)` → S3-Pfad `avatars/{userId}.jpg`

**docker-compose.yml** — S3-Vars bei journal-service + auth-service ergänzt.

---

## 25. Offene Punkte & Nächste Schritte

### Braucht externe Accounts (User muss liefern)

| Feature | Status | Was wird gebraucht |
|---------|--------|-------------------|
| S3 Medien-Storage | ✅ **FERTIG** | Hetzner Object Storage eingerichtet |
| E-Mail-Versand | ⏳ Offen | SMTP_HOST, SMTP_USER, SMTP_PASS (z.B. Brevo) |
| UptimeRobot | ⏳ Offen | Account auf uptimerobot.com anlegen |
| Hetzner Storage Box | ⏳ Offen | Storage Box buchen + BACKUP_HOST, BACKUP_USER, BACKUP_PASS |

### Langfristig

- Mobile App (React Native / Capacitor)
- WebSockets für Echtzeit-Chat
- OAuth2 (Google/GitHub Login)

---

## Alle Frontend-Routen (Stand Session 20)

| Route | Seite | Seit |
|-------|-------|------|
| `/` | Redirect → `/landing` oder `/dashboard` | Session 8 |
| `/landing` | Landing Page | Session 1 |
| `/auth/login` | Login | Session 1 |
| `/auth/register` | Registrierung | Session 1 |
| `/dashboard` | User Dashboard | Session 1 |
| `/profile` | Eigenes Profil | Session 5 |
| `/profile/[username]` | Öffentliches Profil | Session 5 |
| `/settings` | Einstellungen | Session 1 |
| `/community` | Forum-Übersicht | Session 1 |
| `/community/new` | Neuer Thread | Session 1 |
| `/community/[slug]` | Kategorie | Session 1 |
| `/community/thread/[id]` | Thread-Ansicht | Session 1 |
| `/journal` | Journal-Übersicht | Session 1 |
| `/journal/new` | Neues Journal | Session 1 |
| `/journal/[id]` | Journal-Detail | Session 1 |
| `/journal/[id]/edit` | Grow bearbeiten | Session 10 |
| `/journal/[id]/entry/new` | Neuer Eintrag | Session 1 |
| `/journal/[id]/entry/[entryId]/edit` | Eintrag bearbeiten | Session 10 |
| `/journal/stats` | Ernte-Statistiken | Session 13 |
| `/grows` | Öffentliche Grows Discovery | Session 17 |
| `/grows/[id]` | Öffentliche Grow-Detailansicht | Session 17 |
| `/messages` | Private Nachrichten | Session 5 |
| `/notifications` | Benachrichtigungen | Session 5 |
| `/search` | Volltextsuche | Session 3 |
| `/prices` | Preisvergleich | Session 1 |
| `/alerts` | Preisalarme | Session 10 |
| `/strains` | Strain-Datenbank | Session 5 |
| `/strains/[slug]` | Strain-Detailseite | Session 12 |
| `/strains/compare` | Strain-Vergleich | Session 5 |
| `/calendar` | Grow-Kalender | Session 12 |
| `/leaderboard` | Bestenliste | Session 12 |
| `/tools` | Rechner-Übersicht | Session 1 |
| `/tools/vpd` | VPD-Rechner | Session 1 |
| `/tools/co2` | CO2-Rechner | Session 1 |
| `/tools/dli` | DLI-Rechner | Session 1 |
| `/tools/ec` | EC-Rechner | Session 1 |
| `/tools/power` | Stromkosten-Rechner | Session 1 |
| `/tools/ppfd` | PPFD-Rechner | Session 1 |
| `/ai` | AI-Assistent Übersicht | Session 4 |
| `/ai/chat` | AI-Chat | Session 1 |
| `/ai/advisor` | Grow-Berater | Session 1 |
| `/ai/diagnose` | Pflanzen-Diagnose | Session 1 |
| `/admin` | Admin-Dashboard | Session 3 |
| `/admin/users` | Benutzer-Verwaltung | Session 3 |
| `/admin/categories` | Kategorien-Verwaltung | Session 3 |
| `/admin/settings` | Admin-Einstellungen | Session 3 |
| `/admin/analytics` | Analytics Dashboard | Session 5 |
| `/admin/threads` | Thread-Verwaltung | Session 7 |
| `/admin/grows` | Grow-Verwaltung | Session 7 |
| `/admin/logs` | System-Logs | Session 7 |
| `/admin/moderation` | Meldungen/Reports | Session 3 |
| `/admin/strains` | Strain-Verwaltung | Session 3 |
| `/admin/ads` | Werbeanzeigen | Session 8 |
| `/admin/scraper` | Feed-Importer | Session 8 |
| `/admin/seedbanks` | Seedbank-Verwaltung | Session 12 |
| `/admin/achievements` | Achievement-Verwaltung | Session 13 |
| `/admin/ai` | AI-Monitoring | Session 14 |
| `/admin/clicks` | Affiliate-Click-Stats | Session 10 |
| `/seedbanks` | Seedbank-Bewertungen | Session 22 |
| `/about` | Über uns | Session 7 |
| `/privacy` | Datenschutz | Session 7 |
| `/terms` | Nutzungsbedingungen | Session 7 |
| `/contact` | Kontakt | Session 7 |

---

## Session 23 — Landing Page Sicherheit + Auto-Logout + Werbe-Zonen-Editor

### 1. Landing Page: Nur Login & Register anklickbar

**Problem:** Auf der Landing Page waren alle Links (Preisvergleich, Strain-Datenbank, Tools etc.) für nicht angemeldete User klickbar.

**Lösung:** `/apps/web-app/src/app/landing/page.tsx` überarbeitet:

- **Hero-Buttons** → nur noch "Kostenlos registrieren" (`/auth/register`) und "Anmelden" (`/auth/login`)
- **Tools-Raster** → Links entfernt, Kästen als `<div>` mit `opacity-60 cursor-not-allowed` (visuell erkennbar, nicht klickbar)
- **Preisvergleich-CTA** → Link auf `/auth/register` umgeleitet
- **CTA-Section** → Register + Login Buttons
- **`LogIn`-Icon** aus Lucide importiert, überall verwendet

---

### 2. Auto-Logout bei inaktivem Tab (Heartbeat-System)

**Datei:** `apps/web-app/src/components/providers/auth-provider.tsx`

**Funktionsweise:**
- Jeder **sichtbare** SF1-Tab schreibt alle **10 Sekunden** einen Timestamp in `localStorage` (`sf1_last_active`)
- Wenn ein Tab **versteckt** wird (`visibilitychange`), startet ein Timer (5 min + 10 s Puffer)
- Nach dem Timer: Timestamp wird geprüft — wenn **kein Tab** den Heartbeat in den letzten 5 Minuten erneuert hat → automatischer Logout
- Wird der Tab **wieder sichtbar** → Timer abgebrochen, kein Logout
- Tab wieder öffnen → Heartbeat läuft weiter

**Tab-übergreifend:** Da alle Tabs denselben `localStorage` teilen, erkennt das System ob irgendein SF1-Tab noch aktiv ist — nicht nur der aktuelle.

```typescript
// Konstanten
const TIMEOUT = 5 * 60 * 1000;   // 5 Minuten Inaktivität
const HEARTBEAT = 10_000;         // Heartbeat alle 10 Sekunden
const LS_KEY = 'sf1_last_active'; // localStorage Key
```

**Logout-Ablauf:**
1. Cookies `sf1_access_token` + `sf1_refresh_token` löschen
2. `setUser(null)`
3. `router.push('/auth/login')`

---

### 3. Werbe-Zonen-Editor (Drag & Drop)

**Ziel:** Admin kann Werbebanner per Maus auf andere Positionen im Seitenlayout schieben, Größen ändern und speichern.

#### Backend

**Neues Modell:** `apps/community-service/src/models/AdZoneConfig.model.ts`

```typescript
interface IZone {
  id: string;        // 'content-top' | 'content-bottom' | 'sidebar-top' | 'sidebar-bottom'
  adType: 'rectangle' | 'square';
  width: number;     // 0 = 100% Containerbreite
  height: number;    // in px
  isActive: boolean;
}
```

Gespeichert als einzelnes MongoDB-Dokument (Upsert-Pattern).

**Neue Routen** in `apps/community-service/src/routes/ads.routes.ts`:

| Methode | Pfad | Auth | Beschreibung |
|---------|------|------|--------------|
| `GET` | `/api/community/ads/zones` | Öffentlich | Aktuelle Zonen-Config laden |
| `PUT` | `/api/community/ads/zones` | Admin | Zonen-Config speichern |

> **Wichtig:** `/zones` muss VOR `/:id` in der Routen-Reihenfolge stehen.

**Default-Config** (wenn noch nichts gespeichert):
```json
[
  { "id": "content-top",    "adType": "rectangle", "width": 0, "height": 90,  "isActive": true },
  { "id": "sidebar-bottom", "adType": "square",    "width": 0, "height": 250, "isActive": true }
]
```

#### Frontend Hook

**`apps/web-app/src/hooks/use-ad-zones.ts`**

```typescript
export function useAdZones()       // Zonen laden (10min Cache, Placeholder = Default)
export function useSaveAdZones()   // Zonen speichern (Admin)
```

#### Layout-Komponenten — dynamisch statt hardcoded

**`apps/web-app/src/components/layout/dashboard-layout.tsx`:**
- Lädt Zonen via `useAdZones()`
- Rendert `content-top` Banner (wenn aktiv) über dem Seiteninhalt
- Rendert `content-bottom` Banner (wenn aktiv) unter dem Seiteninhalt
- Breite und Höhe kommen aus der Zone-Config

**`apps/web-app/src/components/layout/sidebar.tsx`:**
- Rendert `sidebar-top` Zone (wenn aktiv) über der Navigation
- Rendert `sidebar-bottom` Zone (wenn aktiv) unter der Navigation
- Beide dynamisch aus `useAdZones()` statt hardcoded

#### Visueller Zone-Editor

**`apps/web-app/src/components/admin/AdZoneEditor.tsx`**

Zeigt eine **miniaturisierte Seitenvorschau** mit 4 Drop-Zonen:

```
┌──────────────┬─────────────────────────────────────┐
│   SIDEBAR    │   [sidebar-top]  [content-top]       │
│              │                                     │
│ [sidebar-    │        Seiteninhalt                 │
│  bottom]     │                                     │
│              │   [content-bottom]                  │
└──────────────┴─────────────────────────────────────┘
```

**Drag & Drop Verhalten:**
- **Palette → leerer Slot:** Neue Zone mit Standard-Dimensionen platzieren
- **Slot → Slot:** Zone verschieben; wenn Zielslot belegt → tauschen
- **X-Button:** Zone entfernen

**Größen-Editor** (erscheint nach Klick auf platzierten Banner):
- Breite (px, 0 = 100% automatisch) — Eingabefeld + Slider
- Höhe (px) — Eingabefeld + Slider
- Checkbox: Zone aktiv/inaktiv

#### Integration Admin-Seite

**`apps/web-app/src/app/admin/ads/page.tsx`**

Zwei Haupt-Tabs hinzugefügt:
- **"Anzeigen verwalten"** — bestehende Funktionalität (Erstellen/Bearbeiten/Löschen)
- **"Zonen-Layout"** — neuer visueller Drag & Drop Editor

Ungespeicherte Änderungen werden mit `● Ungespeicherte Änderungen` angezeigt. "Zurücksetzen" verwirft lokale Änderungen. "Layout speichern & anwenden" schreibt in DB → sofort für alle User aktiv.

#### Verfügbare Zonen-IDs

| ID | Position | Standard Anzeigentyp |
|----|----------|---------------------|
| `content-top` | Über dem Seiteninhalt (Hauptbereich) | Rechteck |
| `content-bottom` | Unter dem Seiteninhalt (Hauptbereich) | beliebig |
| `sidebar-top` | Ganz oben in der Sidebar | beliebig |
| `sidebar-bottom` | Ganz unten in der Sidebar | Quadrat |

---

---

## Session 23 (Nachtrag) — Bugfix: `/profile/undefined`

### Ursache
Beim Auto-Logout setzt `setUser(null)` den User-State auf null. In diesem kurzen Moment war `user?.username` bereits `undefined`. Der Header baute daraus die URL `/profile/undefined`. Der String `"undefined"` ist in JavaScript truthy, daher lief die Profil-Seite die API-Anfrage `/api/auth/users/undefined` durch → "Benutzer nicht gefunden".

### Fix 1 — `apps/web-app/src/components/layout/header.tsx`

```tsx
// vorher (kaputt wenn user null):
onClick={() => router.push(`/profile/${user?.username}`)}

// nachher (sicher):
onClick={() => router.push(user?.username ? `/profile/${user.username}` : '/profile')}
```

### Fix 2 — `apps/web-app/src/app/profile/[username]/page.tsx`

```tsx
// vorher:
if (username) { fetchProfile(); }

// nachher — fängt den String "undefined" explizit ab:
if (username && username !== 'undefined') {
  fetchProfile();
} else {
  router.push('/profile'); // weiterleiten zum eigenen Profil
}
```

---

*Dokumentation zuletzt aktualisiert: 2026-03-05, Session 23*
*Nächste geplante Features: Grow-Edit mit Strain-Verknüpfung, Seedbank-Reviews, Notification-Center*

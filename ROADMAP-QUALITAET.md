# SF-1 Ultimate — Qualitäts-Roadmap
# Erstellt: 2026-03-11 nach Session 50
# Thema: Stabilität, Sicherheit, Performance, Monetarisierung
# Reihenfolge: Kritisch → Wichtig → Nice-to-have
#
# STATUS: ✅ ALLE 11 SESSIONS ABGESCHLOSSEN (2026-03-14)

---

## Übersicht

| Session | Thema | Priorität | Aufwand | Status |
|---------|-------|-----------|---------|--------|
| 51 | Sentry Error Tracking | 🔴 Kritisch | ~2h | ✅ |
| 52 | Datenbank-Indizes + Query-Audit | 🔴 Kritisch | ~2h | ✅ |
| 53 | API Rate Limiting (global) | 🔴 Kritisch | ~2h | ✅ |
| 54 | Auth-Härtung (Token Rotation + Sessions) | 🔴 Kritisch | ~3h | ✅ |
| 55 | SEO (JSON-LD, OpenGraph, dynamische Sitemap) | 🟡 Wichtig | ~3h | ✅ |
| 56 | CI/CD Pipeline (GitHub Actions) | 🟡 Wichtig | ~3h | ✅ |
| 57 | TypeScript Strict + Shared Types | 🟡 Wichtig | ~4h | ✅ |
| 58 | Stripe Integration (Premium-Mitgliedschaft) | 🟡 Wichtig | ~5h | ✅ |
| 59 | Affiliate-Tracking Dashboard | 🟢 Nice-to-have | ~3h | ✅ |
| 60 | CDN + Image Optimization | 🟢 Nice-to-have | ~2h | ✅ |
| 61 | .env.example + Developer Docs | 🟢 Nice-to-have | ~1h | ✅ |

---

## 🔴 SESSION 51 — Sentry Error Tracking

### Problem
JS-Fehler im Frontend und unbehandelte Exceptions im Backend gehen unbemerkt unter.
Wenn ein User auf einen Fehler trifft, erfährt der Betreiber es nur wenn der User ihn meldet.

### Ziel
Jeder Fehler (Frontend + alle Backend-Services) wird automatisch erfasst, gruppiert und
mit Stack-Trace + User-Kontext gespeichert. Alerting per E-Mail bei neuen Fehlern.

### Was gebaut wird

**Sentry Account + Projekte:**
- 1 Projekt: `sf1-frontend` (Next.js)
- 1 Projekt: `sf1-backend` (alle Express-Services zusammen)
- Free Tier: 5.000 Errors/Monat — ausreichend für Beta

**Frontend (Next.js):**
- `@sentry/nextjs` installieren
- `sentry.client.config.ts` + `sentry.server.config.ts` konfigurieren
- `next.config.js` um Sentry Webpack-Plugin erweitern
- Source Maps hochladen → lesbare Stack-Traces
- User-Kontext: `Sentry.setUser({ id, username })` nach Login setzen
- Performance Monitoring: 10% Sample Rate (Tracing)

**Backend (alle Services):**
- `@sentry/node` in jeden Service installieren
- Express Error Handler Middleware: `Sentry.setupExpressErrorHandler(app)`
- Unhandled Promise Rejections abfangen
- Environment-Tag: `environment: 'production'`

**Alerting:**
- E-Mail-Alert bei: neuem Fehler-Typ, > 10 gleiche Fehler/Stunde
- Weekly Digest: Zusammenfassung aller Fehler der Woche

**SENTRY_DSN** für jeden Service als `.env` Variable

### Warum zuerst
Ohne Error Tracking tappen wir blind. Alle anderen Verbesserungen bauen darauf auf —
nur mit Sentry weiß man ob ein Fix wirklich geholfen hat.

### Geschätzter Aufwand: ~2h

---

## 🔴 SESSION 52 — Datenbank-Indizes + Query-Audit

### Problem
MongoDB und PostgreSQL haben möglicherweise fehlende oder falsch gesetzte Indizes.
Bei wachsender Datenmenge werden häufige Queries (Feed, Suche, Preise) langsam.
Aktuell: kein Monitoring welche Queries langsam sind.

### Ziel
Alle häufigen Queries sind mit passenden Indizes abgedeckt.
Slow-Query-Logging ist aktiviert — langsame Queries fallen sofort auf.

### Was gebaut wird

**MongoDB — Audit aller Collections:**
Queries analysieren und fehlende Indizes identifizieren:
```
grows:        userId, isPublic, strain, status, createdAt
posts:        authorId, category, createdAt, isPinned
prices:       seedbankName, strainId, updatedAt
strains:      slug, name, tags
feedingPlans: userId, growId
```

**MongoDB Slow Query Logging:**
- `db.setProfilingLevel(1, { slowms: 100 })` aktivieren
- Profiling-Collection täglich auswerten

**PostgreSQL (Auth-Service):**
- Index auf `User.email` (für Login-Lookup) prüfen — Prisma setzt ihn bei `@unique`, aber bestätigen
- Index auf `User.oauthId` für OAuth-Login

**Mongoose-Schema Review:**
- Alle Modelle auf fehlende `index: true` Annotationen prüfen
- Compound Indizes für häufige Filter-Kombinationen (z.B. `{ userId: 1, createdAt: -1 }`)

**Ergebnis-Dokument:**
- Liste aller gesetzten Indizes
- Vorher/Nachher Abfragezeiten (explain())

### Geschätzter Aufwand: ~2h

---

## 🔴 SESSION 53 — API Rate Limiting (global)

### Problem
Derzeit hat nur der Login-Endpoint Rate Limiting (10 Versuche / 15 Min).
Alle anderen API-Endpunkte sind unbegrenzt aufrufbar:
- AI-Assistent kann beliebig oft aufgerufen werden (OpenAI-Kosten!)
- Foto-Upload kann geflutet werden
- Community-Posts können automatisiert gespammt werden

### Ziel
Jeder API-Endpunkt hat sinnvolle Limits. Missbrauch kostet kein Geld mehr.

### Was gebaut wird

**Global Rate Limiting (alle Services):**
- Redis-basiertes Rate Limiting (`rate-limiter-flexible`)
- Basis-Limit: 100 Requests / Minute / IP (unauthentifiziert)
- Auth-Limit: 300 Requests / Minute / User-ID (eingeloggt)

**Spezifische strenge Limits:**

| Endpoint | Limit | Zeitraum |
|----------|-------|----------|
| POST /api/ai/* | 20 | pro Stunde pro User |
| POST /api/media/upload | 30 | pro Stunde pro User |
| POST /api/community/posts | 10 | pro Stunde pro User |
| POST /api/community/comments | 30 | pro Stunde pro User |
| POST /api/auth/register | 5 | pro Stunde pro IP |
| GET /api/prices/scrape | 1 | pro Stunde (Admin only) |

**HTTP Response bei Überschreitung:**
- HTTP 429 mit Header: `Retry-After: <seconds>`
- JSON: `{ error: 'Too many requests', retryAfter: 60 }`

**Frontend:**
- Toast-Meldung bei HTTP 429: "Zu viele Anfragen. Bitte warte X Sekunden."

**Monitoring:**
- Redis-Key `rate_limit:*` Nutzung in Grafana sichtbar machen

### Geschätzter Aufwand: ~2h

---

## 🔴 SESSION 54 — Auth-Härtung

### Problem 1: Refresh Token Rotation fehlt
Aktuell: `sf1_refresh_token` ist 30 Tage gültig und rotiert nicht.
Wird er gestohlen (XSS, Man-in-the-Middle), ist der Account 30 Tage kompromittiert.

### Problem 2: Kein Session-Management
Ein User kann sich nicht "auf allen Geräten abmelden".
Gestohlener Access Token bleibt bis zum Ablauf (7 Tage) gültig.

### Was gebaut wird

**Refresh Token Rotation:**
- Bei jedem `/api/auth/refresh` wird der alte Token invalidiert + neuer ausgegeben
- Invalidierte Tokens werden in Redis gespeichert (Blacklist, TTL = ursprüngliche Laufzeit)
- Wird ein alter (invalidierter) Token verwendet → Account sofort sperren + E-Mail senden

**Session-Tabelle (PostgreSQL):**
```prisma
model Session {
  id          String   @id @default(cuid())
  userId      String
  refreshToken String  @unique
  deviceInfo  String?  // User-Agent
  ipAddress   String?
  lastUsedAt  DateTime @default(now())
  expiresAt   DateTime
  createdAt   DateTime @default(now())
}
```

**Neue Endpoints:**
- `GET /api/auth/sessions` — alle aktiven Sessions des Users
- `DELETE /api/auth/sessions/:id` — einzelne Session beenden
- `DELETE /api/auth/sessions` — alle Sessions beenden ("überall abmelden")

**Frontend Settings-Seite:**
- Neuer Tab "Aktive Geräte/Sessions"
- Liste: Gerät (User-Agent), IP, Letzte Aktivität
- Button "Abmelden" pro Session + "Überall abmelden"

**Access Token Lebensdauer:**
- Von 7 Tage auf **15 Minuten** reduzieren
- Refresh Token: bleibt 30 Tage, aber rotiert bei jeder Nutzung

### Geschätzter Aufwand: ~3h

---

## 🟡 SESSION 55 — SEO (JSON-LD, OpenGraph, dynamische Sitemap)

### Problem
- Geteilte Strain-Seiten und öffentliche Grows zeigen kein Vorschaubild / Titel in WhatsApp, Discord, Twitter
- Google indexiert Seiten, aber ohne strukturierte Daten (kein Rich Result möglich)
- Sitemap ist statisch — neue Strains und öffentliche Grows fehlen darin

### Was gebaut wird

**OpenGraph Meta-Tags (alle wichtigen Seiten):**
- Strain-Detail: OG-Title = Sortenname, OG-Image = Strain-Foto, OG-Description
- Öffentlicher Grow: OG-Title = Grow-Name + Username, OG-Image = erstes Grow-Foto
- Community-Post: OG-Title = Post-Titel, OG-Description = erste 160 Zeichen
- Fallback: SF1-Logo für alle anderen Seiten

**JSON-LD Strukturierte Daten:**
- Strain-Seite: `schema.org/Product` (Name, Beschreibung, Rating)
- Grow-Seite: `schema.org/Article` (Autor, Datum, Kategorie)
- Forum-Post: `schema.org/DiscussionForumPosting`
- Bewertungen: `schema.org/Review`

**Dynamische Sitemap:**
- `sitemap.ts` erweitern: alle öffentlichen Grows aus journal-service abrufen
- Alle Strains aus price-service abrufen
- Alle öffentlichen Community-Posts
- Priority und changefreq korrekt setzen

**robots.ts:**
- `/admin/*` explizit disallowen
- `/api/*` disallowen
- Sitemap-URL eintragen

### Geschätzter Aufwand: ~3h

---

## 🟡 SESSION 56 — CI/CD Pipeline (GitHub Actions)

### Problem
Aktuell: Änderungen werden manuell auf dem Server deployed.
Kein automatischer Test-Lauf vor dem Deploy → Fehler werden erst in Produktion entdeckt.

### Was gebaut wird

**GitHub Actions Workflow `.github/workflows/deploy.yml`:**

```
Push auf main:
  1. Lint (ESLint) aller Services
  2. TypeScript Type-Check (tsc --noEmit)
  3. Unit Tests (wenn vorhanden)
  4. SSH auf Server → git pull → docker-compose restart
```

**Workflow-Schritte:**
- `lint`: ESLint für alle Apps parallel
- `typecheck`: tsc für Frontend + alle Services
- `deploy`: nur wenn lint + typecheck erfolgreich
  - SSH zum Hetzner-Server
  - `git pull origin main`
  - `docker-compose restart <geänderte services>` (smart: nur geänderte Services)

**Branch-Strategie:**
- `main` → direkt zu Produktion (aktuell eh nur 1 Person)
- Feature-Branches optional für größere Änderungen

**Secrets in GitHub:**
- `HETZNER_SSH_KEY` — SSH-Key für Server-Zugriff
- `HETZNER_HOST` — Server-IP
- `DEPLOY_USER` — SSH-User

**Status-Badge in README:**
- CI-Status-Badge anzeigen

### Geschätzter Aufwand: ~3h

---

## 🟡 SESSION 57 — TypeScript Strict Mode + Shared Types

### Problem
- Frontend und Backend können auseinanderdriften (API gibt anderes zurück als Frontend erwartet)
- `any`-Types überall — TypeScript hilft nicht wirklich
- Kein `shared`-Package für gemeinsame Typen (User, Grow, Strain etc.)

### Was gebaut wird

**Shared Types Package:**
- Neues Package `packages/types/` im Monorepo
- Definiert: `User`, `Grow`, `Strain`, `Post`, `FeedingPlan`, `Price`, etc.
- Alle API Response-Typen: `ApiResponse<T>`, `PaginatedResponse<T>`
- Frontend und alle Services importieren aus `@sf1/types`

**TypeScript Strict Mode:**
- `tsconfig.json` in allen Services: `"strict": true`
- Fehler beheben (hauptsächlich fehlende null-checks)

**API-Typen-Safety:**
- Response-Typen auf Backend und Frontend synchronisieren
- Zod-Schemas für Request-Validierung (statt manueller Checks)

### Warum wertvoll
Bei der nächsten API-Änderung zeigt TypeScript sofort wo das Frontend angepasst werden muss —
statt Runtime-Fehler in Produktion.

### Geschätzter Aufwand: ~4h

---

## 🟡 SESSION 58 — Stripe Integration (Premium-Mitgliedschaft)

### Ziel
Monetarisierung der Plattform durch eine optionale Premium-Mitgliedschaft.
Free-Tier bleibt vollständig — Premium bietet Zusatzfeatures.

### Premium-Features (Vorschlag)
| Feature | Free | Premium |
|---------|------|---------|
| Grows | 3 aktive | unbegrenzt |
| Fotos pro Grow | 20 | unbegrenzt |
| KI-Assistent | 5/Tag | 50/Tag |
| Preisalarme | 3 | unbegrenzt |
| Profilbadge | — | Premium-Badge |
| Statistiken | Basis | Erweitert |

**Preis:** ~4,99€/Monat oder 39,99€/Jahr

### Was gebaut wird

**Backend (auth-service):**
- Prisma Schema: `User.subscriptionStatus` (free/premium/cancelled)
- Prisma Schema: `User.stripeCustomerId`, `User.stripePriceId`
- Neue Routen:
  - `POST /api/auth/billing/checkout` → Stripe Checkout Session
  - `POST /api/auth/billing/portal` → Stripe Customer Portal
  - `POST /api/auth/billing/webhook` → Stripe Webhook Handler

**Stripe Webhook Events:**
- `checkout.session.completed` → Premium aktivieren
- `invoice.payment_succeeded` → Verlängerung bestätigen
- `customer.subscription.deleted` → Premium deaktivieren

**Feature-Gating Middleware:**
- `requirePremium()` Middleware für geschützte Endpoints
- Gibt HTTP 402 mit `{ error: 'Premium required', upgradeUrl: '/premium' }` zurück

**Frontend:**
- Neue Seite `/premium` — Pricing-Seite mit Features-Vergleich
- Checkout-Flow: Klick → Stripe Checkout → Erfolgsseite
- Settings: Abonnement-Status, Kündigungsoption (Stripe Portal)
- Premium-Badge auf Profilseiten

### Geschätzter Aufwand: ~5h

---

## 🟢 SESSION 59 — Affiliate-Tracking Dashboard

### Problem
Affiliate-Links sind vorhanden aber es gibt kein Tracking.
Wie viele Klicks? Über welche Strains? Welche Seedbank konvertiert am besten?
Aktuell: völlig blind was Einnahmen angeht.

### Was gebaut wird

**Backend (price-service):**
- Neues Mongoose-Modell `AffiliateClick`:
  ```js
  { seedbankName, strainId, userId (optional), ip, userAgent, createdAt }
  ```
- Redirect-Endpoint: `GET /api/prices/affiliate/redirect?to=<url>&seedbank=<name>&strain=<id>`
  - Klick speichern → dann redirect zur Seedbank
- Stats-Endpoint (Admin): `GET /api/prices/affiliate/stats?period=30d`

**Alle Affiliate-Links auf Redirect-Endpoint umstellen**

**Admin-Dashboard `/admin/affiliate`:**
- Klicks pro Tag (Line-Chart)
- Top 5 Seedbanks (nach Klicks)
- Top 5 Strains (die zu Klicks führen)
- Klicks nach Zeitraum filtern (7d / 30d / 90d)

### Geschätzter Aufwand: ~3h

---

## 🟢 SESSION 60 — CDN + Image Optimization

### Problem
- Alle Bilder liegen auf Hetzner S3 — kein CDN davor
- Bilder werden nicht lazy-loaded und nicht für Viewport-Größe optimiert
- Große Bilder verlangsamen mobile Nutzung

### Was gebaut wird

**Cloudflare CDN (kostenlos):**
- Domain `seedfinderpro.de` über Cloudflare routen
- Automatisches Caching statischer Assets (JS, CSS, Bilder)
- S3-Bucket-URL mit Cloudflare-Proxy: `cdn.seedfinderpro.de/...`
- Cache-Rules: Bilder = 30 Tage, API = kein Cache

**Next.js Image Optimization:**
- Alle `<img>` Tags durch `<Image>` (next/image) ersetzen
- Automatische WebP-Konvertierung
- Lazy Loading by default
- Blur-Placeholder für Fotos

**Hetzner S3 CORS:**
- CORS-Config für `cdn.seedfinderpro.de` setzen

**Erwartete Verbesserung:**
- Lighthouse Performance Score: von ~60 auf ~85+
- Ladezeit für Bilder: ~60% schneller

### Geschätzter Aufwand: ~2h

---

## 🟢 SESSION 61 — Developer Experience

### Was gebaut wird

**`.env.example` Datei:**
- Alle benötigten Environment-Variablen mit Beschreibung und Beispielwerten
- Sensible Werte als Platzhalter: `JWT_SECRET=your-secret-here`

**`README.md` (Projekt-Root):**
- Setup-Anleitung (Docker Compose)
- Service-Übersicht mit Ports
- Wichtige Befehle (Backup, Logs, Restart)
- Lokales Entwickeln ohne Docker (für einzelne Services)

**Datenbank-Seeding:**
- Script `scripts/seed-dev.ts` — legt Test-Daten an (5 User, 10 Grows, 20 Posts)
- Nützlich für frisches Dev-Setup ohne echte Produktionsdaten

**Makefile / npm scripts:**
```bash
make logs          # docker-compose logs -f
make restart       # alle Services neu starten
make backup        # Backup manuell triggern
make shell-mongo   # MongoDB Shell öffnen
```

### Geschätzter Aufwand: ~1h

---

## Empfohlene Reihenfolge

```
Sofort (Beta läuft noch):
  Session 51 → Sentry Error Tracking        [2h]
  Session 52 → DB-Indizes                   [2h]
  Session 53 → API Rate Limiting            [2h]
  Session 54 → Auth-Härtung                 [3h]

Nach Beta-Ende (07.04.2026):
  Session 55 → SEO                          [3h]
  Session 56 → CI/CD                        [3h]
  Session 57 → TypeScript Strict            [4h]
  Session 58 → Stripe Premium               [5h]

Wenn Nutzerzahlen wachsen:
  Session 59 → Affiliate Dashboard          [3h]
  Session 60 → CDN + Images                 [2h]
  Session 61 → Developer Docs               [1h]
```

**Gesamtaufwand:** ~30 Stunden über 11 Sessions

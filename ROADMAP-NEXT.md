# SF-1 Ultimate — Roadmap Sessions 70–79
# Erstellt: 2026-03-16 nach Session 69
# Nächste Session: einfach "todo" sagen

---

## 📋 NÄCHSTE SESSION → Session 70

---

## Session 70 — Altersverifikation + Security Headers
**Priorität:** 🔴 Rechtlich wichtig
**Aufwand:** ~2–3h

### Was gebaut wird:
**Altersverifikation (18+):**
- Registrierungsformular: Checkbox "Ich bestätige, dass ich 18 Jahre oder älter bin" (Pflichtfeld)
- Optional: Geburtsdatum-Feld (Tag/Monat/Jahr) mit serverseitiger Prüfung
- Ohne Haken → Registrierung blockiert, klare Fehlermeldung
- Backend: `ageVerified: true` im User-Model speichern

**HTTP Security Headers via Traefik:**
- `X-Frame-Options: DENY` (kein Clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Basis `Content-Security-Policy`
- Test: https://securityheaders.com → Ziel: A oder B Rating

**Cookie-Consent-Banner:**
- Einfaches Banner beim ersten Besuch: "Wir nutzen technisch notwendige Cookies"
- Kein Opt-in nötig für notwendige Cookies (DSGVO-konform)
- Sentry + Google OAuth als "funktionale Cookies" kennzeichnen
- localStorage-Flag damit Banner nicht bei jedem Besuch kommt

---

## Session 71 — DSGVO: Datenexport & vollständige Löschung
**Priorität:** 🔴 Rechtlich (EU-Pflicht)
**Aufwand:** ~3–4h

### Was gebaut wird:
**Datenexport (Recht auf Datenmitnahme):**
- Neuer Endpoint: `POST /api/auth/export-data`
- Sammelt aus ALLEN Services: Profil, Grows + Tagebücher, Community-Posts + Kommentare, Berechnungs-Verlauf, Gamification-Punkte
- Packt alles als JSON in eine ZIP-Datei
- Wird per E-Mail als Download-Link zugestellt (24h gültig)
- Frontend: Button in Profil-Einstellungen "Meine Daten exportieren"

**Vollständige Account-Löschung:**
- Prüfen ob bestehende Löschung wirklich ALLE Services abdeckt (Journal, Community, Gamification, Media/S3-Bilder)
- "Löschbestätigung" E-Mail nach Abschluss
- Anonymisierung statt hartem Löschen für Posts (Autor → "Gelöschter Nutzer")

**Datenschutz-Seite:**
- `/datenschutz` Seite aktualisieren mit konkreten Angaben was gespeichert wird
- Kontaktadresse für DSGVO-Anfragen

---

## Session 72 — OpenGraph & Social Sharing
**Priorität:** 🟡 Produkt-Qualität
**Aufwand:** ~2h

### Was gebaut wird:
**Dynamische OG-Tags per Seite:**
- Grows: Foto + Strain-Name + "X Tage alt" als Preview
- Community-Threads: Titel + erste 100 Zeichen + Kategorie
- Strain-Seiten (Preise): Strain-Name + Durchschnittspreis + Foto
- Default-Fallback: SF-1 Logo + Slogan

**Technisch:**
- Next.js `generateMetadata()` in allen relevanten `page.tsx`
- OG-Image via Next.js `/api/og` Route (dynamisch generiert mit `@vercel/og` oder `satori`)
- Twitter Card (`summary_large_image`)

**Share-Buttons:**
- "Teilen" Button auf Grow-Seiten und Posts
- Copy-Link + WhatsApp + Telegram

---

## Session 73 — PWA (Progressive Web App)
**Priorität:** 🟡 Mobile UX
**Aufwand:** ~2–3h

### Was gebaut wird:
**manifest.json:**
- App-Name, Icons (verschiedene Größen), Theme-Color, Background-Color
- `display: "standalone"` → sieht wie native App aus
- `start_url`, `scope` korrekt setzen

**Service Worker:**
- Next.js `next-pwa` Package
- Offline-Fallback-Seite ("Keine Verbindung")
- Statische Assets cachen (CSS, JS, Icons)
- API-Requests: Network-first Strategie

**Install-Prompt:**
- Banner auf Mobile: "SF-1 zum Homescreen hinzufügen"
- Nur einmal zeigen, dann ausblenden
- iOS-Anleitung (Safari hat kein automatisches Prompt)

**Push Notifications (Vorbereitung):**
- Web Push API setup
- Notification-Service erweitern für Web-Push
- Nutzer können Web-Push in Einstellungen aktivieren

---

## Session 74 — Onboarding-Flow für neue Nutzer
**Priorität:** 🟡 Retention / Engagement
**Aufwand:** ~3–4h

### Was gebaut wird:
**Schritt-für-Schritt Onboarding nach Registrierung:**
1. "Willkommen! Vervollständige dein Profil" (Avatar, Bio, Standort)
2. "Dein erster Grow" — direkt Grow anlegen oder überspringen
3. "Entdecke die Community" — 3 aktive Threads anzeigen, einem beitreten
4. "Fertig! Hier ist dein Dashboard"

**"Erste Schritte" Checklist im Dashboard:**
- Kleines Widget: "3/5 Schritte erledigt"
- Profil vervollständigt ✓, Erster Grow ✓, Erster Post ✗ ...
- Verschwindet wenn alle Schritte erledigt

**Technisch:**
- `onboardingCompleted: boolean` + `onboardingStep: number` im User-Profil
- Onboarding-Modal-Flow in Frontend
- Kann jederzeit übersprungen werden

---

## Session 75 — 2FA (Zwei-Faktor-Authentifizierung)
**Priorität:** 🟡 Sicherheit
**Aufwand:** ~3–4h

### Was gebaut wird:
**TOTP (Authenticator-App):**
- Package: `otpauth` + `qrcode`
- `POST /api/auth/2fa/setup` → QR-Code generieren
- `POST /api/auth/2fa/verify` → Code bestätigen + 2FA aktivieren
- `POST /api/auth/2fa/disable` → mit Passwort + aktuellem Code
- Login-Flow: nach Passwort → 2FA-Code abfragen wenn aktiviert

**Backup-Codes:**
- 8 einmalige Codes generieren bei 2FA-Aktivierung
- Einmal anzeigen + Download als TXT
- Verbrauchte Codes werden ungültig

**Frontend:**
- Einstellungen → Sicherheit → "2FA aktivieren"
- QR-Code anzeigen mit Anleitung
- Backup-Codes anzeigen und drucken/speichern

---

## Session 76 — Redis Query-Caching
**Priorität:** 🟢 Performance
**Aufwand:** ~2–3h

### Was gebaut wird:
**Cache-Wrapper Utility:**
- `cacheOrFetch(key, ttl, fetchFn)` Helper in jedem Service
- Redis als Cache-Layer vor teuren DB-Queries

**Was gecacht wird:**
| Query | TTL |
|---|---|
| Gamification Leaderboard | 5 Min |
| Community Feed (anonym) | 2 Min |
| Trending Strains (Preise) | 10 Min |
| Strain-Detail (Community) | 15 Min |
| Kategorie-Liste | 30 Min |
| Badge-Liste | 60 Min |

**Cache-Invalidierung:**
- Bei neuem Post → Feed-Cache leeren
- Bei neuem Grow → ggf. Leaderboard-Cache leeren
- Admin: "Cache leeren" Button in Admin-Panel

**Cache-Stats:**
- Grafana Dashboard: Cache Hit Rate
- Redis Memory-Verbrauch überwachen

---

## Session 77 — Plausible Analytics (selbst gehostet)
**Priorität:** 🟢 Business Intelligence
**Aufwand:** ~2h

### Was gebaut wird:
**Plausible selbst hosten:**
- Neuer Docker Container `sf1-plausible` + PostgreSQL DB
- Traefik Route: `analytics.seedfinderpro.de`
- DSGVO-konform: keine Cookies, keine persönlichen Daten

**Integration:**
- Plausible Script-Tag in Next.js `layout.tsx`
- Custom Events: "grow_created", "post_created", "calculator_used", "strain_viewed"
- Goal-Tracking: Registrierung, erster Grow, erster Post

**Dashboard zeigt:**
- Seitenaufrufe, Unique Visitors, Bounce Rate
- Top Seiten, Top Referrer
- Custom Goals (Funnels)
- Gerät / Browser / Land

---

## Session 78 — Zero-Downtime Deployment
**Priorität:** 🟢 DevOps
**Aufwand:** ~2h

### Was gebaut wird:
**Rolling Update Script** `/root/scripts/rolling-update.sh`:
```bash
# Prinzip:
# 1. Neuen Container bauen
# 2. Warten bis healthy
# 3. Traffic umschalten
# 4. Alten stoppen
```
- Für jeden Service einzeln: build → health-check → swap → cleanup
- Frontend: bleibt erreichbar während neues Image gebaut wird
- Automatisches Rollback wenn neuer Container nicht healthy wird

**Deployment-Checklist automatisieren:**
- Pre-Deploy: Backup triggern, Health-Check
- Deploy: Rolling Update
- Post-Deploy: Smoke-Test (health-check.mjs), Telegram-Benachrichtigung

---

## Session 79 — Feature Flags (Unleash)
**Priorität:** 🟢 DevOps / Risiko-Reduzierung
**Aufwand:** ~2–3h

### Was gebaut wird:
**Unleash selbst hosten:**
- Docker Container `sf1-unleash`
- Admin-UI: `flags.seedfinderpro.de`

**Integration:**
- `unleash-client` in Frontend + Backend Services
- Fallback: Feature ist ON wenn Unleash nicht erreichbar

**Erste Feature Flags:**
- `new_onboarding_flow` — schrittweise ausrollen
- `push_notifications` — erst für 10% testen
- `ai_chat_v2` — neue AI-Version testen
- `premium_features` — Stripe-Features wenn bereit

---

## 📊 Übersicht

| Session | Thema | Priorität | Aufwand |
|---|---|---|---|
| **70** | Altersverifikation + Security Headers + Cookie-Banner | 🔴 Rechtlich | ~2–3h |
| **71** | DSGVO Datenexport + vollständige Account-Löschung | 🔴 Rechtlich | ~3–4h |
| **72** | OpenGraph + Social Sharing | 🟡 Produkt | ~2h |
| **73** | PWA + Service Worker + Install-Prompt | 🟡 Mobile | ~2–3h |
| **74** | Onboarding-Flow für neue Nutzer | 🟡 Retention | ~3–4h |
| **75** | 2FA (TOTP + Backup-Codes) | 🟡 Sicherheit | ~3–4h |
| **76** | Redis Query-Caching | 🟢 Performance | ~2–3h |
| **77** | Plausible Analytics (selbst gehostet) | 🟢 Analytics | ~2h |
| **78** | Zero-Downtime Deployment | 🟢 DevOps | ~2h |
| **79** | Feature Flags (Unleash) | 🟢 DevOps | ~2–3h |

**Gesamtaufwand:** ~25–33h über 10 Sessions

---

## ⏸️ Bewusst verschoben (warten auf Wachstum)

- Stripe Premium-Mitgliedschaft (warten auf Alpha-Ende)
- Cloudflare CDN (warten auf mehr Traffic)
- Hetzner Storage Box Remote-Backup (lokal reicht für Alpha)
- GitHub Actions CI/CD (manueller Deploy reicht)
- Android/iOS App (erst nach Alpha)
- Monatliche Contests (erst wenn mehr Nutzer)
- YouTube Video-Einbettung
- Erweiterte Ernte-Statistiken + Charts

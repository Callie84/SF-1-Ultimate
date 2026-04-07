# SF-1 Ultimate — TODO (nächste Sessions)
# Zuletzt aktualisiert: 2026-04-04 nach Session 93
#
# ➡️  Nächste Session: Session 94
# ➡️  Vollständige Roadmap: ROADMAP-NEXT.md
# ➡️  Vault-Dokumentation: /root/SF-Brain/SF-1 Projekt/Status & Roadmap.md
#
# BEI SESSION-START: immer CLAUDE_CONTEXT.md lesen + Backup + Container prüfen

---

## ✅ SESSION 70 — Altersverifikation + Security Headers + Cookie-Banner
*(abgeschlossen 2026-03-16)*

**Altersverifikation:**
- [x] Registrierungsformular: Pflicht-Checkbox "Ich bin 18 Jahre oder älter"
- [x] Backend: ageVerified: boolean im User-Model gespeichert (Prisma)
- [x] Ohne Bestätigung → Registrierung blockiert (400-Error)

**HTTP Security Headers (Traefik):**
- [x] X-Frame-Options: DENY (bereits vorhanden)
- [x] X-Content-Type-Options: nosniff (bereits vorhanden)
- [x] Referrer-Policy: strict-origin-when-cross-origin (bereits vorhanden)
- [x] Permissions-Policy: camera=(), microphone=(), geolocation=()
- [x] Basis Content-Security-Policy

**Cookie-Consent-Banner:**
- [x] Banner beim ersten Besuch (bereits vollständig implementiert)
- [x] localStorage-Flag (sf1_cookies_accepted)
- [x] DSGVO-konform

---

## ✅ SESSION 71 — DSGVO: Datenexport & vollständige Löschung
*(abgeschlossen 2026-03-16)*

**Datenexport:**
- [x] GET /api/auth/export-data — alle User-Daten aus allen Services als JSON-Download
- [x] Enthält: Profil, Grows, Entries, FeedingPlans, Forum-Beiträge, Gamification
- [x] Frontend: Tab "Meine Daten" in Einstellungen mit Download-Button

**Vollständige Account-Löschung:**
- [x] DELETE /api/auth/account — Passwort-Bestätigung, Löschung in allen Services
- [x] Anonymisierung für Threads/Replies (Autor → "Gelöschter Nutzer"), Follows + DMs gelöscht
- [x] Bestätigungs-E-Mail nach Löschung (account-deleted.hbs Template)

**Interne Service-Routen:**
- [x] journal-service: internal.routes.ts (GET/DELETE user-data)
- [x] community-service: internal.routes.ts (GET user-data, POST anonymize-user)
- [x] gamification-service: internal.routes.ts (GET/DELETE user-data)
- [x] notification-service: internal.routes.ts (DELETE user-data)

**Datenschutz-Seite:**
- [x] /privacy mit konkreten Datenangaben aktualisiert (Tabelle aller Felder + Speicherorte, Self-Service-Links, Sofort-Löschung)

---

## ✅ SESSION 72 — OpenGraph & Social Sharing
*(abgeschlossen 2026-03-16)*

- [x] generateMetadata() in Grows, Threads, Strains (war bereits vorhanden)
- [x] Dynamisches OG-Image via /api/og Route (next/og, Edge Runtime, 1200×630)
- [x] Twitter Card summary_large_image für Grows + Threads (vorher summary)
- [x] Share-Buttons Komponente (Copy-Link, WhatsApp, Telegram) in allen 3 Seiten

---

## ✅ SESSION 73 — PWA (Progressive Web App)
*(abgeschlossen 2026-03-16)*

- [x] manifest.json mit Icons, Theme-Color, start_url (manifest.ts, Next.js 14 native)
- [x] Service Worker via @ducanh2912/next-pwa (Offline-Fallback, Asset-Caching, Workbox)
- [x] Install-Prompt auf Mobile (einmalig) — AndroidPrompt + localStorage-Flag
- [x] iOS-Anleitung für Homescreen (3-Schritt IosGuide Komponente)
- [ ] Web Push API Grundstruktur (verschoben auf später)

---

## ✅ SESSION 74 — Onboarding-Flow für neue Nutzer
*(abgeschlossen 2026-03-16)*

- [x] 4-Schritt Onboarding-Modal nach Registrierung
- [x] "Erste Schritte" Checklist-Widget im Dashboard
- [x] onboardingCompleted + onboardingStep im User-Profil (Prisma)
- [x] Überspringen-Option jederzeit

---

## ✅ SESSION 75 — 2FA (Zwei-Faktor-Authentifizierung)
*(abgeschlossen 2026-03-16)*

- [x] TOTP Setup (QR-Code generieren, verifizieren, aktivieren) — bereits vorhanden
- [x] Login-Flow mit 2FA-Code Abfrage (mfa_required + mfa_token, Login-Seite erweitert)
- [x] 8 Backup-Codes (einmalig anzeigen + Download als .txt)
- [x] 2FA deaktivieren (TOTP-Code erforderlich) — bereits vorhanden
- [x] Frontend: Einstellungen → Sicherheit — bereits vorhanden

---

## ✅ SESSION 76 — Redis Query-Caching
*(abgeschlossen 2026-03-16)*

- [x] cacheOrFetch() Utility (gamification, community, journal — je utils/cache.ts)
- [x] Cache: Leaderboard (5min), Feed (2min), Trending (10min), Kategorien (30min), Badges (60min)
- [x] Cache-Invalidierung: Kategorien bei CRUD, Threads bei neuem Thread, Feed bei neuem Grow
- [x] Admin: "Cache leeren" Button + Hit-Rate-Anzeige im Admin-Dashboard
- [ ] Grafana: Cache Hit Rate Dashboard (verschoben — Metriken via /cache/stats API abrufbar)

---

## ✅ SESSION 77 — Plausible Analytics (selbst gehostet)
*(abgeschlossen 2026-03-16)*

- [x] sf1-plausible + sf1-plausible-db + sf1-plausible-clickhouse Docker Container
- [x] Traefik Route: analytics.seedfinderpro.de → Port 8000
- [x] Script-Tag in layout.tsx (next/script, afterInteractive)
- [x] Custom Events: grow_created, post_created, calculator_used, strain_viewed
- [x] Goal-Tracking: signup, first_grow, first_post (via analytics.ts utility)

---

## ✅ SESSION 78 — Zero-Downtime Deployment
*(abgeschlossen 2026-03-25)*

- [x] rolling-update.sh Script: Restart → health-check → retry → rollback
- [x] Automatisches Rollback wenn Container nicht healthy (2 Versuche, dann Abbruch)
- [x] Pre/Post-Deploy Hooks: Backup + Smoke-Test + Telegram-Benachrichtigung

---

## ✅ SESSION 79 — Feature Flags (Unleash)
*(abgeschlossen 2026-03-25)*

- [x] sf1-unleash Docker Container, Admin-UI: flags.seedfinderpro.de
- [x] unleash-client im Frontend (API-Route /api/flags + useFeatureFlag Hook)
- [x] Erste Flags: new_onboarding_flow (an), push_notifications (aus), ai_chat_v2 (aus), premium_features (aus)
- [x] Flags in Komponenten: OnboardingModal, AI Chat, Dashboard Premium-Banner

---

## ✅ SESSION 80 — Öffentliche Profil-Seiten `/u/[username]`
*(abgeschlossen 2026-03-26)*

- [x] Server Component mit generateMetadata (OG-Tags, Twitter Card, canonical)
- [x] Öffentlich ohne Login erreichbar (optionalAuthMiddleware)
- [x] Redirect /profile/:username → /u/:username (301, SEO)
- [x] Avatar als OG-Image, PublicProfileClient mit Gamification + Grows + Follow

---

## ✅ SESSION 81 — Font-Fix, Mobile-Optimierung, Theme-System, 2FA-Admin-Only
*(abgeschlossen 2026-03-30)*

- [x] Decorative Fonts entfernt, Inter durchgängig
- [x] Mobile-Breakpoints in globals.css (14px Basis, kompaktere H1–H3)
- [x] 6 Themes: light, dark, theme-nature, theme-midnight, theme-earth, theme-neon
- [x] Theme-Picker Dropdown im Header + Settings-Seite
- [x] 2FA nur für ADMIN (Backend + Frontend)
- [x] TypeScript-Fixes: worker/index.ts + use-push-notifications.ts → Build erfolgreich

---

## ✅ SESSION 82 — Web Push Notifications: Backend + Frontend
*(abgeschlossen 2026-03-30)*

- [x] Device.model.ts mit webPushSubscription (MongoDB)
- [x] PushService mit VAPID via web-push npm Paket
- [x] 3 API-Routen: GET /push/vapid-key, POST /push/subscribe, DELETE /push/subscribe
- [x] usePushNotifications Hook (React)
- [x] Service Worker (worker/index.ts): push → showNotification, click → navigate
- [x] Settings-Seite: Push-Sektion via Feature Flag push_notifications
- [x] Push-Queue-Bug behoben (BullMQ ↔ Redis-List Mismatch → vereinheitlicht auf Plain Redis)
- [x] VAPID Keys in .env gesetzt
- [x] flags.seedfinderpro.de — DNS + SSL aktiv
- [x] analytics.seedfinderpro.de — DNS + SSL aktiv
- [x] Feature Flag push_notifications in Unleash auf EIN (beide Environments)

---

---

## ✅ SESSION 83 — Bug-Fixes + Quick-Wins
*(abgeschlossen 2026-03-30)*

- [x] 2FA Step-Up: `mfa_required` aus Login entfernt, AdminGuard mit Auto-Unlock wenn kein 2FA
- [x] Plausible Analytics Script: war bereits korrekt eingebunden
- [x] E-Mail Zusammenfassung: Default auf `never` geändert (Preference.model.ts)
- [x] Rechner-Formeln verifiziert: VPD-Status-Labels korrigiert (Setzlinge/Veg/Blüte), Rest korrekt

---

## ✅ SESSION 84 — Bild-Uploads überall
*(abgeschlossen 2026-03-30)*

- [x] **Journal-Einträge**: bereits vollständig vorhanden (new/edit-Seiten)
- [x] **Öffentliche Grows**: Galerie-Sektion mit Foto-Upload für Besitzer (grows.routes.ts + grow-detail-client.tsx)
- [x] **Community Threads**: `imageUrls` Feld in Thread/Reply-Modell, ImageUploadWidget in Formular + Anzeige
- [x] Community-Replies: imageUrls im Reply-Formular, Bildanzeige in ReplyCard
- [x] Upload via Media-Service (S3), Drag & Drop + Klick, Vorschau

---

## ✅ SESSION 85 — Werbeflächen-Redesign (vollständig maus-steuerbar)
*(abgeschlossen 2026-03-30)*

### Obere Werbefläche
- [x] Höhe um 1/4 vergrößern (90 → 112px)
- [x] In **3 gleichgroße Slots** aufteilen mit kleinem Trenner dazwischen (slotCount: 1|3)
- [x] Werbe-Admin-Seite: Slot-Count Toggle (1 Slot / 3 Slots)

### Linke Werbefläche / Sidebar
- [x] Dynamische Auto-Breite (sidebarWidth === 0 → fit-content, passt sich Navigation an)

### Drag & Drop Werbe-Editor
- [x] Auf `/admin/ads`: Zonen im Preview frei verschiebbar mit der Maus
- [x] Snap-to-Grid (5%-Schritte) beim Loslassen
- [x] Höhe per Drag-Handle am Unterrand anpassbar
- [x] Slot-Count und Sidebar-Auto direkt im Admin konfigurierbar

---

## ✅ SESSION 86 — Preisverlauf-Charts
*(abgeschlossen 2026-03-31)*

### Seedbank-Preise über Zeit als Grafik
- [x] Preishistorie bereits im Price-Modell (scrapedAt-Feld) — kein neues Model nötig
- [x] Backend-Route: `GET /api/prices/history/:seedSlug?days=7|30|90|all&packSize=...`
- [x] Frontend: Recharts LineChart — eine Linie pro Seedbank, Farben automatisch zugewiesen
- [x] Integration in Preisvergleich-Seite (expanded Seed-Karte) + Strain-Detailseite
- [x] Zeitraum-Filter: 7T / 30T / 3M / Gesamt
- [x] Pack-Größen-Filter (wenn mehrere vorhanden)

---

## ✅ SESSION 87 — Zeitraffer-Generator
*(abgeschlossen 2026-03-31)*

### Grow-Fotos automatisch zu Zeitraffer
- [x] Backend: `GET /api/journal/grows/:id/timelapse` — alle Fotos (Entries + Galerie) nach Datum sortiert
- [x] Browser-Slideshow: Play/Pause, Geschwindigkeit 0.5×/1×/2×/4×, Filmstreifen, Fortschrittsbalken
- [x] Export: WebM-Video via Canvas + MediaRecorder API (kein Server-Side ffmpeg nötig)
- [x] "Zeitraffer"-Button in Grow-Detailseite (neben Share-Buttons)
- [x] Privater Grow: nur für Besitzer zugänglich

---

## Verschoben auf später

- Stripe Premium (nach Alpha-Ende)
- Cloudflare CDN (ab mehr Traffic)
- Hetzner Remote-Backup (lokal reicht)
- GitHub Actions CI/CD
- Android/iOS App
- Contests, Videos, erweiterte Statistiken

---

## Abgeschlossen (Sessions 1-69)

Vollständige Doku in DOKUMENTATION.md
Roadmap Sessions 51-61: ROADMAP-QUALITAET.md (alle abgeschlossen)

# SF-1 — Offene Aufgaben für den User
# Hier landen alle Dinge die NUR der User erledigen kann
# oder die bewusst auf später verschoben wurden.
# Zuletzt aktualisiert: 2026-03-15

---

## 🔴 Dringend (blockiert laufende Features)

*(Keine offenen Punkte)*

---

## 🟡 Wichtig (sollte bald erledigt werden)

*(Keine offenen Punkte)*

---

## 🟢 Optional / Irgendwann

*(Alles auf unbestimmte Zeit verschoben — siehe unten)*

---

## 📋 Auf später verschoben (mit Begründung)

### Stripe Keys einrichten (Premium-Mitgliedschaft)
**Verschoben am:** 2026-03-15
**Begründung:** Alpha-Test läuft auf unbestimmte Zeit — Monetarisierung erst wenn bereit.
**Was nötig:** Stripe Account anlegen → Keys + Webhook in `.env` → `docker-compose restart auth-service`

### Beta-Ende / Alpha-Test
**Verschoben am:** 2026-03-15
**Begründung:** Beta umbenannt zu Alpha-Test, läuft auf unbestimmte Zeit (BETA_END_DATE=2099-12-31).
**Reaktivieren wenn:** Plattform bereit für öffentlichen Launch.

### GitHub Actions Secrets für CI/CD Deploy
**Verschoben am:** 2026-03-15
**Begründung:** Manueller Deploy reicht aktuell.
**Was nötig:** GitHub Repo → Settings → Secrets → SSH_HOST, SSH_USER, SSH_PRIVATE_KEY

### Hetzner Storage Box (Remote-Backup)
**Verschoben am:** 2026-03-15
**Begründung:** Lokale Backups reichen für Alpha-Phase.

### Cloudflare CDN (optionale Bildoptimierung)
**Verschoben am:** 2026-03-15
**Begründung:** Optional, kein Blocker.

### Android Studio / Play Store / Apple Developer Account
**Verschoben am:** 2026-03-15
**Begründung:** App erst nach Alpha-Phase relevant.

### Sessions 47–49 (Contests, Videos, Statistiken)
**Verschoben am:** 2026-03-11
**Begründung:** Erst wenn Nutzerzahlen wachsen.

---

## ✅ Erledigt

| Aufgabe | Erledigt am |
|---------|-------------|
| Google OAuth App anlegen (GOOGLE_CLIENT_ID/SECRET) | Session 39 |
| Impressum-Daten liefern | 2026-03-10 |
| Anthropic API Key in .env eingetragen | 2026-03-15 |
| Sentry Webhook konfiguriert (SeedfinderPRO Webhook) | 2026-03-15 |
| Auto-Fix auf Telegram umgestellt | 2026-03-15 |

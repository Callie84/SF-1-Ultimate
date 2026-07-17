# Plan 04 — Dismiss-Vorfall klären (ZUERST, vor allen Fixes)

> **Warum zuerst:** Am 2026-07-17 wurden 25 Alerts (1 critical + 23 high + 1 moderate) auf `dismissed` / `auto_dismissed` mit Grund **`fix_started`** gesetzt. Kalle hatte sie „noch nicht angeschaut". `fix_started` = „ein Fix wurde angestoßen" — **nicht** „behoben". Wenn kein echter Fix-PR dahintersteht, sind die Lücken weiter im Code und tauchen beim nächsten Rescan wieder auf (oder bleiben verdeckt).

## Fragen zu beantworten
1. **Wer** hat dismissed — Mensch (welcher GitHub-User) oder Automatik (Dependabot-Auto-Trigger)?
2. Existiert zu jedem `fix_started` ein **echter offener/gemergter Dependabot-PR**? Wenn nein → Alert manuell wieder öffnen (`reopen`), damit er nicht verloren geht.
3. Ist der verwendete Token/Workflow so konfiguriert, dass er Alerts auto-dismissen kann? (Scopes prüfen.)

## Befehle (nur lesen — nichts ändern)

```bash
REPO=Callie84/SF-1-Ultimate

# a) Wer/wann/warum je Alert (dismissed_by = User oder null=Automatik)
gh api "/repos/$REPO/dependabot/alerts?state=dismissed&per_page=100" \
  --jq '.[] | {num:.number, sev:.security_advisory.severity, pkg:.security_vulnerability.package.name, at:.dismissed_at, by:.dismissed_by.login, reason:.dismissed_reason}'

# b) Gibt es zugehörige Dependabot-PRs?
gh pr list --repo $REPO --author "app/dependabot" --state all --limit 50

# c) Security-relevante Events im Audit-Log (nur mit Org/Enterprise-Rechten)
#    Sonst: GitHub UI -> Security -> Dependabot alerts -> je Alert "Activity"-Timeline ansehen.
```

## Bewertung / Aktion
- **`dismissed_by` = echter User + zugehöriger PR existiert** → legitim, Fixe laufen über PRs. Dann Pläne 01–03 ggf. mit den PRs abgleichen statt manuell doppelt.
- **`dismissed_by` = null / Automatik ohne PR** → verdächtig. Betroffene Alerts über die GitHub-UI (oder API `PATCH .../alerts/{n}` mit `{"state":"open"}`) **wieder öffnen** und regulär über Pläne 01–03 fixen. **Kein `--force`, keine Massen-Aktion ohne Kalles OK.**
- Ergebnis in `DOKUMENTATION.md` + ggf. Vault (Regeln & Protokolle) festhalten.

## Referenz: die 25 heute dismissed'en Alerts
- critical: websocket-driver (notification-service)
- high: axios×5, form-data (tests) · undici×3, ws, js-cookie, @babel/plugin-transform-modules-systemjs, fast-uri×2, picomatch×2, serialize-javascript, minimatch×2, glob (web-app)
- moderate: dompurify (web-app)
- (zusätzlich am 2026-07-06 auto-dismissed: minimatch×2, ajv — separat, älter)

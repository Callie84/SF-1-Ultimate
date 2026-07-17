# Plan 01 — web-app (apps/web-app)

> **Alles in EINEN Rebuild bündeln** (Regel 6, Frontend-Build ~10 min). Nicht stückeln.
> Deploy-Reihenfolge einhalten: erst lokal bauen+testen → GitHub → Server.
> `npm` (kein Workspace) → alle Befehle in `apps/web-app/` ausführen.

## Zu behebende Pakete

**high:**
| Paket | jetzt → Ziel | Art |
|---|---|---|
| js-cookie | 3.0.5 → **3.0.7** | **DIREKT** (`^3.0.5` in package.json) — trivial |
| undici | 7.x → 7.28.0 | transitiv (via next@16) — evtl. `overrides` nötig |
| ws | 8.x → 8.21.0 | transitiv (via next@16) — evtl. `overrides` nötig |
| fast-uri | ≤3.1.1 → 3.1.2 | transitiv |
| picomatch | <2.3.2 / <4.0.4 → 2.3.2 / 4.0.4 | transitiv (Build) |
| minimatch | <3.1.4 / <9.0.7 → 3.1.4 / 9.0.7 | transitiv (Build/dev) |
| glob | <10.5.0 → 10.5.0 | transitiv (dev) |
| serialize-javascript | ≤7.0.2 → 7.0.3 | transitiv |
| @babel/plugin-transform-modules-systemjs | ≤7.29.3 → 7.29.4 | transitiv (Build) |

**moderate/low (im selben Durchgang mitnehmen):**
dompurify (→3.4.11, ⚠️ siehe unten), brace-expansion (→5.0.6/2.0.3/1.1.13), undici (→7.28.0), picomatch (→2.3.2/4.0.4), serialize-javascript (→7.0.5), ws (→8.20.1, durch high-Ziel 8.21.0 abgedeckt), postcss (→8.5.10), @opentelemetry/core (→2.8.0), @babel/core (→7.29.6).

### ⚠️ dompurify zuerst prüfen (9 Alerts, XSS-Sanitizer)
```bash
cd apps/web-app
grep -rn "dompurify\|DOMPurify" src/ 2>/dev/null   # wird es DIREKT genutzt?
```
- Wird es genutzt (User-Content-Rendering: Reviews, Grow-Tagebuch) → **hoch priorisieren**, auf 3.4.11 ziehen.
- Ein Alert (GHSA-x4vx-rjvf-j5p4) hat **noch keine** Patch-Version → bleibt ggf. offen, das ist ok.

## Schritte (lokal, Lenovo)

```bash
cd apps/web-app

# 0) Snapshot vorher
npm audit --omit=dev > ../../reports/dependabot-2026-07-17/web-app-audit-BEFORE.txt 2>&1
cp package.json package.json.bak && cp package-lock.json package-lock.json.bak

# 1) Direkter Fix
npm install js-cookie@^3.0.7

# 2) Transitive Easy-Wins (flexible Ranges)
npm update

# 3) Was bleibt? -> gepinnte Transitive (v.a. undici/ws via next)
npm audit

# 4) Für verbleibende gepinnte Pakete: overrides in package.json ergänzen
#    (KEINE overrides bisher vorhanden). Beispiel-Block:
#    "overrides": {
#      "undici": "7.28.0",
#      "ws": "8.21.0",
#      "fast-uri": "3.1.2",
#      "serialize-javascript": "7.0.5",
#      "picomatch": "4.0.4",
#      "brace-expansion": "5.0.6",
#      "postcss": "8.5.10"
#    }
#    danach:
npm install

# 5) Verifizieren: Build MUSS grün sein (kein --force!)
npm run type-check
npm run build     # ~10 min — der eine Rebuild
npm audit         # Rest-Alerts kontrollieren
```

## Verifikation
- `npm run build` fehlerfrei durch.
- `npm audit` zeigt die behobenen Alerts weg; verbleibende notieren (z. B. dompurify-No-Fix).
- Smoke-Test lokal: `npm start`, Login (js-cookie!) + eine User-Content-Seite (dompurify) prüfen.

## Deploy (erst nach grünem lokalem Build)
1. **Lenovo:** Build grün, Smoke-Test ok.
2. **GitHub:** committen (nur `apps/web-app/package.json` + `package-lock.json` + `DOKUMENTATION.md`), pushen, CI/Actions grün verifizieren.
3. **Server:** erst danach Rebuild+Deploy des web-app-Containers (docker-compose.production). Nur web-app, nicht alle Services (Regel 10).

## Rollback
`package.json.bak` / `package-lock.json.bak` zurückkopieren, `npm install`, rebuild. Kein `git push --force`.

## Aufräumen
`.bak`-Dateien nach erfolgreichem Deploy löschen (nicht committen).

# Dependabot-Sanierung — Arbeitspläne (Stand 2026-07-17)

> Erstellt in Analyse-Session 2026-07-17. **Nichts wurde gefixt/committed** — reine Analyse + Pläne.
> Jeder Plan ist eigenständig in einer nächsten Session abarbeitbar.
> **Guardrails für ALLE Pläne:** kein `--force`; Deploy-Reihenfolge **1. Lenovo lokal → 2. GitHub push+verifizieren → 3. Server**; vor Änderungen Backup (Session-Protokoll); nie alle Services gleichzeitig restarten (Regel 10); `DOKUMENTATION.md` nach jeder Änderung updaten (Regel 2).

## Ausgangslage (per `gh api` verifiziert)

| Zustand | Zahl |
|---|---|
| Beim Push aa57072 | 55 open (1 critical + 23 high + 24 moderate + 7 low) |
| **Heute 2026-07-17 dismissed (`fix_started`)** | 25 (1 critical + 23 high + 1 moderate dompurify) |
| **Jetzt tatsächlich open** | 30 (23 moderate + 7 low) — 0 critical, 0 high |

⚠️ **Die critical + alle high sind seit heute im Status `dismissed / fix_started` — NICHT nachweislich gefixt.** `fix_started` = „ein Fix wurde angestoßen", nicht „behoben". Wer das ausgelöst hat, ist ungeklärt → **zuerst Plan 04.**

## Betroffene Manifeste (nur diese)

| Manifest | Alerts |
|---|---|
| `apps/web-app/package-lock.json` | Löwenanteil (high + moderate + low) |
| `apps/notification-service/package-lock.json` | 1 critical + 1 med (websocket-driver), 1 med (uuid) |
| `tests/package-lock.json` | 7 high (axios/form-data) + med/low |
| `services/content-service/package-lock.json` | 22 Alerts, **alle `fixed`** — kein Handlungsbedarf (Regel-22a-Check: sauber) |

## Empfohlene Reihenfolge

| Reihenfolge | Plan | Warum |
|---|---|---|
| **0 (zuerst!)** | [04-dismiss-investigation](04-dismiss-investigation.md) | Klären, wer die 25 Alerts heute dismissed hat — sonst verfälscht das alles |
| 1 | [01-web-app](01-web-app.md) | Größter Hebel, runtime-exponiertes Frontend, ein Sammel-Rebuild (~10 min, Regel 6) |
| 2 | [02-notification-service](02-notification-service.md) | Label „critical", real aber toter Code-Pfad; kein Frontend-Rebuild |
| 3 | [03-tests](03-tests.md) | Nicht ausgeliefert → niedrigstes reales Risiko, zuletzt |

**Gute Nachricht: kein einziger Major-Sprung nötig — alles Patch/Minor.**

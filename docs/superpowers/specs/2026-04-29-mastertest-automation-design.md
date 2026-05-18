# Design: Mastertest-Automatisierung

**Datum:** 2026-04-29
**Status:** approved

## Ziel

Automatische Ausführung der SF-1 Mastertest-Suite:
- Schneller Smoke-Test vor jedem Git-Commit (blockiert kaputte Commits)
- Volle 42-Test-Suite täglich um 06:00 Uhr
- Sofortige Dokumentation nach jedem Lauf

## Architektur

### 1. Pre-Commit-Hook

**Datei:** `.git/hooks/pre-commit` (Shell-Script, executable)

**Tests:**
- `npm run test:auth` — kritischster Service
- `npm run test:search` — zweithäufigster Fehler-Kandidat

**Verhalten:**
- Beide Tests müssen grün sein — sonst Commit blockiert
- Klare Fehlermeldung mit Hinweis welcher Test fehlgeschlagen ist
- Kein Husky — direktes Git-Hook-Script

**Geschwindigkeit:** ~5–15s (akzeptabel vor jedem Commit)

### 2. Täglicher Cron-Job

**Trigger:** Täglich 06:00 via `/schedule`-Skill (Remote-Agent)

**Ablauf:**
1. `npm run mastertest` ausführen (volle 42-Test-Suite)
2. Report nach `/root/SF-Brain/Logs/mastertest-reports/YYYY-MM-DD.md` schreiben
3. `DOKUMENTATION.md` aktualisieren (Abschnitt Mastertest-Runs)
4. Vault-Log `SF-Brain/Logs/sf1-v1.md` mit Ergebnis ergänzen

### 3. Dokumentations-Pflicht

Beide Trigger dokumentieren sofort und automatisch:
- `DOKUMENTATION.md` — Lauf-Eintrag mit Datum, Ergebnis, fehlgeschlagene Tests
- Vault-Log — Kurzeintrag mit Status (✅/❌) und Commit-Referenz (bei Pre-Commit)

## Fehlverhalten

| Situation | Verhalten |
|-----------|-----------|
| Pre-Commit: Auth-Test schlägt fehl | Commit blockiert, Meldung: "Auth-Test fehlgeschlagen — commit abgebrochen" |
| Pre-Commit: Search-Test schlägt fehl | Commit blockiert, Meldung: "Search-Test fehlgeschlagen — commit abgebrochen" |
| Cron: Mastertest schlägt fehl | Report mit ❌ geschrieben, Vault + DOKUMENTATION.md aktualisiert |
| Cron: Service nicht erreichbar | Report mit Fehler-Detail, kein Crash des Agents |

## Betroffene Dateien

- `.git/hooks/pre-commit` — neu erstellen
- `DOKUMENTATION.md` — Abschnitt "Mastertest-Automation" hinzufügen
- `/root/SF-Brain/Logs/sf1-v1.md` — Vault-Log-Eintrag
- Schedule via `/schedule`-Skill — kein Datei-Artefakt

## Nicht im Scope

- Husky oder andere Hook-Manager
- Benachrichtigungen / Telegram-Alarme (separater Task)
- Änderungen an den Tests selbst

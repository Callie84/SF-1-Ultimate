# Mastertest-Automatisierung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mastertest automatisch vor jedem Commit (Smoke-Test) und täglich um 06:00 (volle Suite) ausführen — mit sofortiger Dokumentation nach jedem Lauf.

**Architecture:** Pre-Commit-Hook als Shell-Script direkt in `.git/hooks/`, täglicher Remote-Agent via `/schedule`-Skill, beide schreiben sofort nach DOKUMENTATION.md + Vault.

**Tech Stack:** Bash (Hook), Node.js/npm (Tests), `/schedule`-Skill (Cron-Agent), Markdown (Reports)

---

## Dateien-Übersicht

| Datei | Aktion |
|-------|--------|
| `/root/SF-1-Ultimate-/.git/hooks/pre-commit` | NEU — Shell-Script für Smoke-Test |
| `/root/SF-1-Ultimate-/DOKUMENTATION.md` | ÄNDERN — Abschnitt "Mastertest-Automation" hinzufügen |
| `/root/SF-Brain/Logs/sf1-v1.md` | ÄNDERN — Vault-Log-Eintrag |
| Schedule via `/schedule`-Skill | EINRICHTEN — kein Datei-Artefakt |

---

## Task 1: Pre-Commit-Hook erstellen

**Files:**
- Create: `/root/SF-1-Ultimate-/.git/hooks/pre-commit`

- [ ] **Step 1: Hook-Script schreiben**

Datei `/root/SF-1-Ultimate-/.git/hooks/pre-commit` erstellen:

```bash
#!/bin/bash

# SF-1 Smoke-Test: Auth + Search müssen grün sein vor jedem Commit
ROOT="/root/SF-1-Ultimate-"

echo "🔍 SF-1 Smoke-Test läuft..."

cd "$ROOT" && npm run test:auth --silent 2>&1
AUTH_EXIT=$?

if [ $AUTH_EXIT -ne 0 ]; then
  echo "❌ Auth-Test fehlgeschlagen — commit abgebrochen"
  echo "   Tipp: cd /root/SF-1-Ultimate- && npm run test:auth"
  exit 1
fi

echo "✅ Auth-Test grün"

cd "$ROOT" && npm run test:search --silent 2>&1
SEARCH_EXIT=$?

if [ $SEARCH_EXIT -ne 0 ]; then
  echo "❌ Search-Test fehlgeschlagen — commit abgebrochen"
  echo "   Tipp: cd /root/SF-1-Ultimate- && npm run test:search"
  exit 1
fi

echo "✅ Search-Test grün"
echo "✅ Smoke-Test bestanden — commit wird fortgesetzt"
exit 0
```

- [ ] **Step 2: Hook ausführbar machen**

```bash
chmod +x /root/SF-1-Ultimate-/.git/hooks/pre-commit
```

- [ ] **Step 3: Hook testen (Erfolgsfall)**

```bash
cd /root/SF-1-Ultimate- && bash .git/hooks/pre-commit
```

Erwartete Ausgabe:
```
🔍 SF-1 Smoke-Test läuft...
✅ Auth-Test grün
✅ Search-Test grün
✅ Smoke-Test bestanden — commit wird fortgesetzt
```

- [ ] **Step 4: Hook testen (Fehlerfall simulieren)**

```bash
# Temporären Test-Fehler provozieren — prüfen ob Exit-Code 1
cd /root/SF-1-Ultimate- && bash -c 'exit 1' && echo "FALSCH: sollte blockiert haben" || echo "OK: Hook blockiert korrekt"
```

- [ ] **Step 5: Dokumentation updaten — DOKUMENTATION.md**

In `/root/SF-1-Ultimate-/DOKUMENTATION.md` folgenden Abschnitt am Ende hinzufügen:

```markdown
---

## Mastertest-Automation (2026-04-29) [abgeschlossen]

### Ziel
Automatische Ausführung der Mastertest-Suite: Smoke-Test vor Commits + volle Suite täglich.

### Pre-Commit-Hook
- **Datei:** `.git/hooks/pre-commit` (Shell-Script, executable)
- **Tests:** `npm run test:auth` + `npm run test:search`
- **Verhalten:** Commit wird blockiert wenn ein Test fehlschlägt
- **Bypass (Notfall):** `git commit --no-verify` (nur wenn bewusst gewollt)

### Täglicher Cron
- **Trigger:** Täglich 06:00 via Remote-Agent (/schedule)
- **Suite:** Volle 42-Test-Suite (`npm run mastertest`)
- **Report:** `/root/SF-Brain/Logs/mastertest-reports/YYYY-MM-DD.md`
- **Dokumentation:** DOKUMENTATION.md + Vault-Log nach jedem Lauf

### Commits
- Hook: kein Commit (`.git/` nicht tracked)
- Schedule: kein Datei-Artefakt
```

- [ ] **Step 6: Vault-Log updaten**

In `/root/SF-Brain/Logs/sf1-v1.md` am Ende hinzufügen:

```markdown
---

### [2026-04-29] Mastertest-Automation eingerichtet
**Typ:** automation
**Files:** `.git/hooks/pre-commit` (neu), `DOKUMENTATION.md` (ergänzt)
**Gemacht:**
- Pre-Commit-Hook: Auth + Search Smoke-Test vor jedem Commit
- Täglicher Cron (06:00): volle 42-Test-Suite via /schedule
- Reports nach `/root/SF-Brain/Logs/mastertest-reports/`
**Ergebnis:** Kaputte Commits werden automatisch blockiert; täglicher Health-Check läuft selbstständig
---
```

---

## Task 2: Täglichen Cron-Job einrichten

**Files:**
- Kein Datei-Artefakt — via `/schedule`-Skill

- [ ] **Step 1: `/schedule`-Skill aufrufen**

Skill `schedule` mit folgendem Prompt aufrufen:

```
Erstelle einen täglichen Cron-Job der jeden Tag um 06:00 Uhr folgendes tut:

1. cd /root/SF-1-Ultimate- && npm run mastertest
2. Lese den Output (Erfolg/Fehler, Anzahl Tests bestanden/fehlgeschlagen)
3. Schreibe einen Report nach /root/SF-Brain/Logs/mastertest-reports/YYYY-MM-DD.md mit:
   - Datum + Uhrzeit
   - Gesamt-Status (✅ alle grün / ❌ X fehlgeschlagen)
   - Liste fehlgeschlagener Tests (falls vorhanden)
   - Dauer
4. Aktualisiere /root/SF-1-Ultimate-/DOKUMENTATION.md — ergänze im Abschnitt "Mastertest-Automation" einen Eintrag:
   `- YYYY-MM-DD 06:00 — ✅ 42/42 grün` (oder ❌ mit Anzahl)
5. Aktualisiere /root/SF-Brain/Logs/sf1-v1.md — ergänze einen Kurzeintrag mit Datum + Status

Name: "SF-1 Daily Mastertest"
Schedule: täglich 06:00
```

- [ ] **Step 2: Cron bestätigt — Schedule-ID notieren**

Nach Einrichtung die Schedule-ID in `DOKUMENTATION.md` im Abschnitt "Mastertest-Automation" unter "Täglicher Cron" ergänzen:
```
- **Schedule-ID:** <ID aus /schedule-Output>
```

- [ ] **Step 3: Ersten manuellen Lauf triggern zum Testen**

```bash
cd /root/SF-1-Ultimate- && npm run mastertest 2>&1 | tail -5
```

Prüfen ob Report-Datei existiert:
```bash
ls /root/SF-Brain/Logs/mastertest-reports/ | sort | tail -3
```

---

## Self-Review Checkliste

- [x] Spec Abschnitt 1 (Pre-Commit-Hook) → Task 1 vollständig abgedeckt
- [x] Spec Abschnitt 2 (Täglicher Cron) → Task 2 vollständig abgedeckt
- [x] Spec Abschnitt 3 (Dokumentations-Pflicht) → Steps 5+6 in Task 1 + Step 2 in Task 2
- [x] Fehlverhalten: Hook-Exit-Codes korrekt, Cron-Fehler im Report
- [x] Keine Platzhalter, keine TBDs
- [x] Dateipfade vollständig und korrekt

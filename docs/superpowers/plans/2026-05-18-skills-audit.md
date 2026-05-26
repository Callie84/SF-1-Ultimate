# Skills-Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 5 Shortcode-Skills (ss, se, plan, task-done, quickfix) von losen Memory-Notizen zu echten SKILL.md Dateien upgraden + Lernphase-Widerspruch in Memory bereinigen.

**Architecture:** Jeder Skill erhält ein `/root/.claude/skills/<name>/SKILL.md` mit 4–5 Pflicht-Schritten und Selbst-Check (identisches Muster wie `dk`). Memory-Dateien werden aktualisiert um auf den jeweiligen Skill zu verweisen. Kein Code, keine Tests — reine Konfigurationsdateien.

**Tech Stack:** Markdown, Claude Code Skills-System (`/root/.claude/skills/`), Memory-System (`/root/.claude/projects/-root/memory/`)

---

### Task 1: Skill `ss` (session-start) anlegen

**Files:**
- Create: `/root/.claude/skills/ss/SKILL.md`
- Modify: `/root/.claude/projects/-root/memory/feedback_ss_shortcode.md`

- [ ] **Schritt 1: Verzeichnis anlegen**

```bash
mkdir -p /root/.claude/skills/ss
```

- [ ] **Schritt 2: SKILL.md schreiben**

Inhalt von `/root/.claude/skills/ss/SKILL.md`:

```markdown
---
name: ss
description: SF-1 Session-Start — Pflicht-Checkliste vor jeder Arbeit (Backup, Container, Beta, LIVE-PROGRESS)
---

# SS — Session-Start

**Ziel:** Jede Session startet mit vollständigem System-Check. Kein Code anfassen bevor alle Checks grün sind.

---

## SCHRITT 1 — REMINDERS.md prüfen

```bash
cat /root/REMINDERS.md 2>/dev/null
```

Falls Einträge vorhanden: dem User anzeigen, dann Datei leeren:
```bash
> /root/REMINDERS.md
```

---

## SCHRITT 2 — Backup auslösen + prüfen

```bash
# JWT generieren
node -e "const jwt=require('./apps/auth-service/node_modules/jsonwebtoken'); const fs=require('fs'); const env=fs.readFileSync('.env','utf8'); const s=env.match(/JWT_SECRET=(.+)/)?.[1]?.trim(); console.log(jwt.sign({userId:'admin',role:'ADMIN'},s,{expiresIn:'1h'}));"

# Backup triggern
curl -X POST http://172.28.0.24:3011/api/backup/backups/trigger -H "Authorization: Bearer <JWT>"

# Neuestes Backup prüfen (muss < 24h alt sein)
ls -lt /root/SF-1-Ultimate-/backups/*.enc | head -1
```

**Akzeptiert:** Backup-Datei mit Timestamp < 24h.
**Blockiert:** Kein Backup vorhanden oder älter als 24h → User informieren, Ursache klären.

---

## SCHRITT 3 — Container-Status prüfen

```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep sf1
```

**Akzeptiert:** Alle kritischen Services (frontend, price-service, auth-service, community-service, mongodb, redis) laufen.
**Blockiert:** Kritischer Service `unhealthy` oder `Exited` → zuerst reparieren, dann weiter.

---

## SCHRITT 4 — Beta-Status prüfen

```bash
# Anzahl aktiver Beta-User
docker exec sf1-mongodb mongosh "mongodb://localhost:27017/sf1" --eval "db.users.countDocuments({isBeta: true})" --quiet
```

Ausgabe: `X von 50 Beta-Plätzen belegt` dem User anzeigen.

---

## SCHRITT 5 — LIVE-PROGRESS laden + NEXT ACTION anzeigen

```bash
cat /root/SF-1-Ultimate-/LIVE-PROGRESS.md
```

NEXT ACTION dem User explizit anzeigen. Falls `(kein aktiver Task)`: User fragen was als nächstes kommt.

---

## SELBST-CHECK vor Abschluss

- [ ] Backup existiert und ist < 24h alt?
- [ ] Alle kritischen Container healthy oder Probleme gemeldet?
- [ ] Beta-Status angezeigt?
- [ ] NEXT ACTION aus LIVE-PROGRESS gelesen und dem User präsentiert?

Mindestens ein "nein" → blockieren + User informieren. Erst wenn alle "ja" → Session-Start abgeschlossen.
```

- [ ] **Schritt 3: Memory-Datei aktualisieren**

Inhalt von `/root/.claude/projects/-root/memory/feedback_ss_shortcode.md`:

```markdown
---
name: ss = session-start
description: User-Shortcode 'ss' — ruft Skill ss auf (/root/.claude/skills/ss/SKILL.md)
type: feedback
---
Wenn der User `ss` schreibt: **sofort den `ss` Skill aufrufen** (Skill tool, name: `ss`).

Der Skill führt 5 Pflicht-Schritte aus: REMINDERS → Backup → Container → Beta → LIVE-PROGRESS.
Bei fehlgeschlagenem Check blockiert der Skill und informiert den User — nie einfach weitermachen.

**Why:** session-start war nur eine lose Memory-Notiz ohne erzwingbare Checkliste.
Skill angelegt 2026-05-18.
**How to apply:** Bei `ss` → Skill aufrufen, kein Abschnitt überspringen.
```

- [ ] **Schritt 4: Verifizieren**

```bash
cat /root/.claude/skills/ss/SKILL.md | grep "SCHRITT" | wc -l
# Erwartet: 5
```

- [ ] **Schritt 5: Commit**

```bash
cd /root/.claude
git add skills/ss/SKILL.md projects/-root/memory/feedback_ss_shortcode.md
git commit -m "feat(skills): add ss session-start SKILL.md mit 5-Schritte-Pflichtcheckliste"
```

---

### Task 2: Skill `se` (session-end) anlegen

**Files:**
- Create: `/root/.claude/skills/se/SKILL.md`
- Modify: `/root/.claude/projects/-root/memory/feedback_se_shortcode.md`

- [ ] **Schritt 1: Verzeichnis anlegen**

```bash
mkdir -p /root/.claude/skills/se
```

- [ ] **Schritt 2: SKILL.md schreiben**

Inhalt von `/root/.claude/skills/se/SKILL.md`:

```markdown
---
name: se
description: SF-1 Session-End — dk aufrufen, LIVE-PROGRESS finalisieren, Zusammenfassung ausgeben
---

# SE — Session-End

**Ziel:** Keine Session endet ohne vollständige Dokumentation und sauberem LIVE-PROGRESS. Nächste Session muss mit `ss` + `weiter` nahtlos fortsetzen können.

---

## SCHRITT 1 — dk aufrufen

Den `dk` Skill aufrufen (Skill tool, name: `dk`).

dk läuft vollständig durch alle 5 Schritte:
- Kontext sammeln
- DOKUMENTATION.md mit Pflicht-Template
- Vault-Log aktualisieren
- LIVE-PROGRESS aktualisieren
- Selbst-Check (alle 7 Fragen "ja")

dk gilt als abgeschlossen wenn der Selbst-Check vollständig "ja" ist.

---

## SCHRITT 2 — LIVE-PROGRESS finalisieren

```bash
# Prüfen ob Status und NEXT ACTION korrekt gesetzt sind
grep -E "Status:|NEXT ACTION" /root/SF-1-Ultimate-/LIVE-PROGRESS.md
```

Sicherstellen:
- `Status:` ist `✅ clean` (falls keine offenen Tasks) oder `⏸ paused` (falls Task unterbrochen)
- `NEXT ACTION` ist entweder ein konkreter Satz oder `(kein aktiver Task)`

---

## SCHRITT 3 — Offene Tasks + Blockaden benennen

Explizit aufzählen:
- Was ist offen für die nächste Session?
- Was ist blockiert und warum?
- Was muss der User selbst erledigen (außerhalb von Claude)?

---

## SCHRITT 4 — Zusammenfassung ausgeben

Format:
```
## Session-Zusammenfassung

**Erledigt:**
- [Task 1 — Commit-Hash]
- [Task 2 — Commit-Hash]

**Offen für nächste Session:**
- [Task X]

**User-Aktion nötig:**
- [Was der User selbst tun muss]
```

---

## SELBST-CHECK vor Abschluss

- [ ] dk vollständig durchgelaufen (alle 7 Fragen "ja")?
- [ ] LIVE-PROGRESS Status korrekt (✅ clean oder ⏸ paused)?
- [ ] NEXT ACTION eindeutig für kalten Claude formuliert?
- [ ] Zusammenfassung enthält offene Punkte und User-Aktionen?

Mindestens ein "nein" → nachholen. Erst dann ist se abgeschlossen.
```

- [ ] **Schritt 3: Memory-Datei aktualisieren**

Inhalt von `/root/.claude/projects/-root/memory/feedback_se_shortcode.md`:

```markdown
---
name: se = session-end
description: User-Shortcode 'se' — ruft Skill se auf (/root/.claude/skills/se/SKILL.md)
type: feedback
---
Wenn der User `se` schreibt: **sofort den `se` Skill aufrufen** (Skill tool, name: `se`).

Der Skill führt 4 Pflicht-Schritte aus: dk → LIVE-PROGRESS finalisieren → Offene Tasks benennen → Zusammenfassung.
se ruft dk explizit auf — beide müssen vollständig durchlaufen.

**Why:** session-end war nur eine lose Memory-Notiz. dk wurde oft vergessen.
Skill angelegt 2026-05-18.
**How to apply:** Bei `se` → Skill aufrufen, kein Schritt überspringen.
```

- [ ] **Schritt 4: Commit**

```bash
cd /root/.claude
git add skills/se/SKILL.md projects/-root/memory/feedback_se_shortcode.md
git commit -m "feat(skills): add se session-end SKILL.md — dk + LIVE-PROGRESS + Zusammenfassung"
```

---

### Task 3: Skill `plan` anlegen

**Files:**
- Create: `/root/.claude/skills/plan/SKILL.md`
- Modify: Memory (neue Datei `feedback_plan_shortcode.md`)

- [ ] **Schritt 1: Verzeichnis anlegen**

```bash
mkdir -p /root/.claude/skills/plan
```

- [ ] **Schritt 2: SKILL.md schreiben**

Inhalt von `/root/.claude/skills/plan/SKILL.md`:

```markdown
---
name: plan
description: Neuen Task planen — brainstorming + writing-plans + Dokumentation an beiden Orten
---

# PLAN — Neuen Task planen

**Ziel:** Jeder neue Task wird vollständig geplant bevor Code angefasst wird. Plan landet in Repo UND Vault. DOKUMENTATION.md bekommt [geplant]-Eintrag.

---

## SCHRITT 1 — brainstorming aufrufen

Skill aufrufen: `brainstorming` (Skill tool, name: `brainstorming`)

brainstorming läuft durch: Kontext → Klärungsfragen → Ansätze → Design → Spec schreiben.
Abgeschlossen wenn Spec-Datei existiert und User approved.

---

## SCHRITT 2 — writing-plans aufrufen

Skill aufrufen: `writing-plans` (Skill tool, name: `writing-plans`)

writing-plans erstellt den detaillierten Implementierungsplan mit Tasks, Schritten und Commits.
Plan wird gespeichert in: `docs/superpowers/plans/YYYY-MM-DD-<name>.md`

---

## SCHRITT 3 — Plan in Vault kopieren

```bash
# Neueste Plan-Datei ermitteln
PLAN=$(ls -t /root/SF-1-Ultimate-/docs/superpowers/plans/*.md | head -1)
FILENAME=$(basename "$PLAN")

# In Vault kopieren
cp "$PLAN" "/root/SF-Brain/SF-1 Projekt/Plans/$FILENAME"
echo "✅ Vault-Kopie: $FILENAME"
```

Verifizieren:
```bash
ls "/root/SF-Brain/SF-1 Projekt/Plans/$FILENAME"
```

---

## SCHRITT 4 — DOKUMENTATION.md [geplant]-Eintrag anlegen

In `/root/SF-1-Ultimate-/DOKUMENTATION.md` folgenden Abschnitt am Ende ergänzen:

```markdown
## [Task-Name] [geplant YYYY-MM-DD]

### Ziel
[Was soll erreicht werden — 1-2 Sätze]

### Betroffene Dateien (geplant)
- `pfad/zu/datei.ts`
- `pfad/zu/datei2.ts`

### Plan-Datei
`docs/superpowers/plans/YYYY-MM-DD-<name>.md`
```

---

## SCHRITT 5 — LIVE-PROGRESS aktualisieren

In LIVE-PROGRESS.md:
- `Aktueller Task` → Task-Name + Plan-Referenz eintragen
- `NEXT ACTION` → ersten konkreten Schritt aus dem Plan eintragen
- `Status` → `🔄 in-progress`

---

## SELBST-CHECK vor Abschluss

- [ ] Spec-Datei existiert und ist von User approved?
- [ ] Plan-Datei in `docs/superpowers/plans/` vorhanden?
- [ ] Plan-Kopie in `/root/SF-Brain/SF-1 Projekt/Plans/` vorhanden?
- [ ] DOKUMENTATION.md hat `[geplant]`-Eintrag mit Ziel + Dateien?
- [ ] LIVE-PROGRESS NEXT ACTION zeigt ersten Plan-Schritt?

Mindestens ein "nein" → nachholen.
```

- [ ] **Schritt 3: Memory-Datei anlegen**

Inhalt von `/root/.claude/projects/-root/memory/feedback_plan_shortcode.md`:

```markdown
---
name: plan = task planen
description: User-Shortcode 'plan' — ruft Skill plan auf (/root/.claude/skills/plan/SKILL.md)
type: feedback
---
Wenn der User `plan` oder `/plan` schreibt: **sofort den `plan` Skill aufrufen** (Skill tool, name: `plan`).

Der Skill führt 5 Pflicht-Schritte aus: brainstorming → writing-plans → Vault-Kopie → [geplant]-Eintrag → LIVE-PROGRESS.
Plan muss in BEIDEN Orten landen: Repo (docs/superpowers/plans/) UND Vault (SF-Brain/SF-1 Projekt/Plans/).

**Why:** plan war nur aus CLAUDE.md bekannt, kein erzwingbares Protokoll.
Skill angelegt 2026-05-18.
**How to apply:** Bei `plan` → Skill aufrufen, alle 5 Schritte durchlaufen.
```

- [ ] **Schritt 4: Commit**

```bash
cd /root/.claude
git add skills/plan/SKILL.md projects/-root/memory/feedback_plan_shortcode.md
git commit -m "feat(skills): add plan SKILL.md — brainstorming + writing-plans + Vault-Kopie + [geplant]-Eintrag"
```

---

### Task 4: Skill `task-done` anlegen

**Files:**
- Create: `/root/.claude/skills/task-done/SKILL.md`
- Modify: Memory (neue Datei `feedback_task_done_shortcode.md`)

- [ ] **Schritt 1: Verzeichnis anlegen**

```bash
mkdir -p /root/.claude/skills/task-done
```

- [ ] **Schritt 2: SKILL.md schreiben**

Inhalt von `/root/.claude/skills/task-done/SKILL.md`:

```markdown
---
name: task-done
description: Aktuellen Task abschließen — DOKUMENTATION.md [abgeschlossen], LIVE-PROGRESS aktualisieren, nächsten Task aktivieren
---

# TASK-DONE — Task abschließen

**Ziel:** Jeder abgeschlossene Task hinterlässt einen vollständigen Zustand: DOKUMENTATION.md finalisiert, LIVE-PROGRESS aktuell, nächster Task aktiviert.

---

## SCHRITT 1 — DOKUMENTATION.md [geplant] → [abgeschlossen]

Den `[geplant]`-Eintrag in DOKUMENTATION.md suchen und aktualisieren:

```markdown
## [Task-Name] [abgeschlossen YYYY-MM-DD]

### Commits
- `[hash]` — [vollständige Commit-Message]
- `[hash]` — [vollständige Commit-Message]

### Ergebnis
[Was tatsächlich umgesetzt wurde — Abweichungen vom Plan explizit nennen]
```

Anschließend Vault-Kopie:
```bash
cp /root/SF-1-Ultimate-/DOKUMENTATION.md "/root/SF-Brain/SF-1 Projekt/DOKUMENTATION.md"
```

---

## SCHRITT 2 — LIVE-PROGRESS "Diese Session erledigt" ergänzen

In LIVE-PROGRESS.md unter `## Diese Session erledigt` eine neue Zeile:

```
- [YYYY-MM-DD] [Task-Name] — [kurze Beschreibung] ([commit-hash])
```

---

## SCHRITT 3 — Offene Tasks aktualisieren

- Abgeschlossenen Task aus `## Offene Tasks` entfernen
- Nächsten Task als `## Aktueller Task` setzen (falls vorhanden)
- Falls keine Tasks mehr: `## Aktueller Task` → `—`

---

## SCHRITT 4 — QUICKFIX-ACTIVE löschen (falls gesetzt)

```bash
rm -f /root/.claude/QUICKFIX-ACTIVE
echo "QUICKFIX-ACTIVE gelöscht (falls vorhanden)"
```

---

## SCHRITT 5 — NEXT ACTION setzen

In LIVE-PROGRESS.md:
- Falls nächster Task vorhanden: `NEXT ACTION` → erster konkreter Schritt des nächsten Tasks
- Falls kein Task mehr: `NEXT ACTION` → `(kein aktiver Task)`
- `Status` → `✅ clean` (keine offenen Tasks) oder `🔄 in-progress` (nächster Task aktiv)

---

## SELBST-CHECK vor Abschluss

- [ ] DOKUMENTATION.md Eintrag auf `[abgeschlossen]` mit Commits und Ergebnis?
- [ ] Vault-Kopie aktualisiert?
- [ ] `Diese Session erledigt` hat neue Zeile mit Datum + Hash?
- [ ] Abgeschlossener Task aus `Offene Tasks` entfernt?
- [ ] QUICKFIX-ACTIVE gelöscht?
- [ ] NEXT ACTION eindeutig für kalten Claude formuliert?

Mindestens ein "nein" → nachholen.
```

- [ ] **Schritt 3: Memory-Datei anlegen**

Inhalt von `/root/.claude/projects/-root/memory/feedback_task_done_shortcode.md`:

```markdown
---
name: task-done = task abschließen
description: User-Shortcode 'task-done' — ruft Skill task-done auf (/root/.claude/skills/task-done/SKILL.md)
type: feedback
---
Wenn der User `task-done` schreibt oder ein Task abgeschlossen ist: **sofort den `task-done` Skill aufrufen**.

Der Skill führt 5 Pflicht-Schritte aus: DOKUMENTATION.md [abgeschlossen] → Erledigt-Zeile → Offene Tasks → QUICKFIX löschen → NEXT ACTION.

**Why:** task-done war nur in CLAUDE.md erwähnt, kein erzwingbares Protokoll.
Skill angelegt 2026-05-18.
**How to apply:** Nach JEDEM abgeschlossenen Task → Skill aufrufen, alle 5 Schritte.
```

- [ ] **Schritt 4: Commit**

```bash
cd /root/.claude
git add skills/task-done/SKILL.md projects/-root/memory/feedback_task_done_shortcode.md
git commit -m "feat(skills): add task-done SKILL.md — DOKUMENTATION [abgeschlossen] + LIVE-PROGRESS + NEXT ACTION"
```

---

### Task 5: Skill `quickfix` anlegen

**Files:**
- Create: `/root/.claude/skills/quickfix/SKILL.md`
- Modify: Memory (neue Datei `feedback_quickfix_shortcode.md`)

- [ ] **Schritt 1: Verzeichnis anlegen**

```bash
mkdir -p /root/.claude/skills/quickfix
```

- [ ] **Schritt 2: SKILL.md schreiben**

Inhalt von `/root/.claude/skills/quickfix/SKILL.md`:

```markdown
---
name: quickfix
description: Kleiner Fix ohne Brainstorming — QUICKFIX-ACTIVE setzen, direkt implementieren, task-done aufrufen
---

# QUICKFIX — Kleiner Fix ohne Brainstorming

**Ziel:** Plan-Guard umgehen für eindeutige Einzel-Fixes. Kein Overhead durch brainstorming/writing-plans — aber vollständiges Cleanup danach.

**ERLAUBT nur wenn ALLE drei Bedingungen erfüllt sind:**
1. Änderung betrifft maximal 1–2 Dateien
2. Ursache ist eindeutig bekannt (kein Debugging nötig)
3. Kein neues Pattern oder Design-Entscheidung nötig

Falls eine Bedingung nicht erfüllt → stattdessen `plan` aufrufen.

---

## SCHRITT 1 — QUICKFIX-ACTIVE Flag setzen

```bash
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > /root/.claude/QUICKFIX-ACTIVE
cat /root/.claude/QUICKFIX-ACTIVE
# Erwartet: ISO-Timestamp
```

---

## SCHRITT 2 — Fix direkt implementieren

Kein brainstorming, kein writing-plans. Direkt die Änderung vornehmen.

Fix in maximal 1–2 Dateien. Commit sofort nach dem Fix:
```bash
git add <datei>
git commit -m "fix: <kurze beschreibung>"
```

---

## SCHRITT 3 — task-done aufrufen

Skill aufrufen: `task-done` (Skill tool, name: `task-done`)

task-done läuft vollständig durch: DOKUMENTATION.md [abgeschlossen] → Erledigt-Zeile → LIVE-PROGRESS → NEXT ACTION.

---

## SCHRITT 4 — QUICKFIX-ACTIVE löschen

task-done löscht das Flag automatisch. Falls task-done es nicht gelöscht hat:
```bash
rm -f /root/.claude/QUICKFIX-ACTIVE
ls /root/.claude/QUICKFIX-ACTIVE 2>/dev/null && echo "FEHLER: Flag noch vorhanden!" || echo "✅ Flag gelöscht"
```

---

## SELBST-CHECK vor Abschluss

- [ ] Alle 3 Bedingungen für quickfix waren erfüllt (max 2 Dateien, Ursache klar, kein neues Pattern)?
- [ ] QUICKFIX-ACTIVE Flag wurde gesetzt UND danach gelöscht?
- [ ] task-done vollständig aufgerufen?
- [ ] Commit vorhanden mit aussagekräftiger Message?

Falls eine Bedingung war nicht erfüllt → in Session-Notizen dokumentieren warum quickfix trotzdem verwendet wurde.
```

- [ ] **Schritt 3: Memory-Datei anlegen**

Inhalt von `/root/.claude/projects/-root/memory/feedback_quickfix_shortcode.md`:

```markdown
---
name: quickfix = kleiner fix ohne brainstorming
description: User-Shortcode 'quickfix' — ruft Skill quickfix auf (/root/.claude/skills/quickfix/SKILL.md)
type: feedback
---
Wenn der User `quickfix` oder `/quickfix` schreibt: **sofort den `quickfix` Skill aufrufen**.

Nur erlaubt wenn: max. 2 Dateien + Ursache klar + kein neues Pattern.
Ablauf: QUICKFIX-ACTIVE setzen → fix → task-done → QUICKFIX-ACTIVE löschen.

**Why:** quickfix-Flag wurde nicht zuverlässig gesetzt/gelöscht, task-done nach Fix wurde oft vergessen.
Skill angelegt 2026-05-18.
**How to apply:** Bei `/quickfix` → Skill aufrufen, Bedingungen prüfen, alle 4 Schritte.
```

- [ ] **Schritt 4: Commit**

```bash
cd /root/.claude
git add skills/quickfix/SKILL.md projects/-root/memory/feedback_quickfix_shortcode.md
git commit -m "feat(skills): add quickfix SKILL.md — QUICKFIX-ACTIVE Flag + task-done Pflicht"
```

---

### Task 6: Lernphase-Widerspruch bereinigen

**Files:**
- Modify: `/root/.claude/projects/-root/memory/feedback_lernphase.md`
- Modify: `/root/.claude/projects/-root/memory/feedback_erkenntnisse_speichern.md`

- [ ] **Schritt 1: feedback_lernphase.md als superseded markieren**

Am Anfang der Datei (nach dem Frontmatter) einfügen:

```markdown
> ⚠️ SUPERSEDED — Diese Memory ist überholt. Es gilt ausschließlich `feedback_erkenntnisse_speichern.md`.
> Erkenntnisse werden sofort ohne AskUserQuestion gespeichert. Dieses Protokoll nicht mehr befolgen.
```

- [ ] **Schritt 2: feedback_erkenntnisse_speichern.md als primär kennzeichnen**

In der Datei den Why-Abschnitt ergänzen:

```markdown
**Primäre Regel** (überschreibt feedback_lernphase.md vollständig):
Erkenntnisse sofort speichern, keine AskUserQuestion, keine Rückfragen.
```

- [ ] **Schritt 3: Verifizieren**

```bash
grep "SUPERSEDED" /root/.claude/projects/-root/memory/feedback_lernphase.md
grep "Primäre Regel" /root/.claude/projects/-root/memory/feedback_erkenntnisse_speichern.md
```

Beide Befehle müssen Output liefern.

- [ ] **Schritt 4: Commit**

```bash
cd /root/.claude
git add projects/-root/memory/feedback_lernphase.md projects/-root/memory/feedback_erkenntnisse_speichern.md
git commit -m "fix(memory): Lernphase-Widerspruch bereinigen — feedback_erkenntnisse_speichern als primär"
```

---

### Task 7: LIVE-PROGRESS + DOKUMENTATION.md aktualisieren

**Files:**
- Modify: `/root/.claude/projects/-root/memory/MEMORY.md` (neue Memory-Einträge verlinken)
- Modify: `/root/SF-1-Ultimate-/LIVE-PROGRESS.md`
- Modify: `/root/SF-1-Ultimate-/DOKUMENTATION.md`

- [ ] **Schritt 1: MEMORY.md neue Einträge verlinken**

In `/root/.claude/projects/-root/memory/MEMORY.md` unter "Regeln & Feedback" ergänzen:

```markdown
- [plan Skill](feedback_plan_shortcode.md) — plan = brainstorming + writing-plans + Vault-Kopie + [geplant]-Eintrag
- [task-done Skill](feedback_task_done_shortcode.md) — task-done = DOKUMENTATION [abgeschlossen] + LIVE-PROGRESS
- [quickfix Skill](feedback_quickfix_shortcode.md) — quickfix = QUICKFIX-ACTIVE + fix + task-done (max 2 Dateien)
```

- [ ] **Schritt 2: DOKUMENTATION.md [abgeschlossen]-Eintrag**

In DOKUMENTATION.md den `[geplant]`-Eintrag auf `[abgeschlossen]` aktualisieren (wird beim Ausführen der Session erstellt).

- [ ] **Schritt 3: LIVE-PROGRESS aktualisieren**

```bash
# Status auf clean setzen, Task als erledigt markieren
```

- [ ] **Schritt 4: Commit**

```bash
cd /root/.claude
git add projects/-root/memory/MEMORY.md
git commit -m "docs(memory): neue Skill-Shortcuts in MEMORY.md verlinken"
```

---

## Erfolgs-Kriterium

```bash
# Alle 5 Skills existieren
ls /root/.claude/skills/{ss,se,plan,task-done,quickfix}/SKILL.md

# Jeder Skill hat Pflicht-Schritte und Selbst-Check
grep -l "SELBST-CHECK" /root/.claude/skills/{ss,se,plan,task-done,quickfix}/SKILL.md | wc -l
# Erwartet: 5

# Lernphase-Widerspruch bereinigt
grep "SUPERSEDED" /root/.claude/projects/-root/memory/feedback_lernphase.md
```

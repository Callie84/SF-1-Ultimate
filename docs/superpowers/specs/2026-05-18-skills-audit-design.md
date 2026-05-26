# Design: Skills-Audit — ss, se, plan, task-done, quickfix + Lernphase-Fix

**Datum:** 2026-05-18
**Status:** approved
**Ziel:** 5 Shortcode-Skills von losen Memory-Notizen zu echten SKILL.md Dateien upgraden (wie dk). Lernphase-Widerspruch bereinigen.

---

## Problem

`ss`, `se`, `plan`, `task-done`, `quickfix` existieren nur als Memory-Einträge — Claude interpretiert sie frei ohne feste Checkliste. Führt zu inkonsistenter Ausführung, vergessenen Schritten, unzuverlässiger Dokumentation.

`feedback_lernphase.md` widerspricht `feedback_erkenntnisse_speichern.md` — Claude muss raten welche gilt.

---

## Skill-Designs (Option A — detailliert wie dk)

### ss (session-start)
**5 Pflicht-Schritte:**
1. REMINDERS.md prüfen — Einträge anzeigen + leeren
2. Backup auslösen + prüfen (< 24h)
3. Container-Status: unhealthy Services melden
4. Beta-Status: belegte Plätze anzeigen
5. LIVE-PROGRESS laden + NEXT ACTION anzeigen

**Selbst-Check:** Backup < 24h? Kritische Container healthy? NEXT ACTION angezeigt?
**Blockier-Regel:** Bei fehlgeschlagenem Check → User informieren, nicht einfach weitermachen.

### se (session-end)
**4 Pflicht-Schritte:**
1. `dk` aufrufen (vollständige Dokumentation)
2. LIVE-PROGRESS: Status `✅ clean`, NEXT ACTION aktualisieren
3. Offene Tasks + Blockaden für nächste Session benennen
4. Zusammenfassung: Was gemacht / Was offen / Was User selbst tun muss

**Selbst-Check:** dk vollständig? LIVE-PROGRESS aktuell? Zusammenfassung hat offene Punkte?

### plan
**5 Pflicht-Schritte:**
1. `brainstorming` Skill aufrufen
2. `writing-plans` Skill aufrufen
3. Plan speichern: `docs/superpowers/plans/YYYY-MM-DD-<name>.md`
4. Plan kopieren: `/root/SF-Brain/SF-1 Projekt/Plans/YYYY-MM-DD-<name>.md`
5. DOKUMENTATION.md `[geplant]`-Eintrag anlegen

**Selbst-Check:** Plan in beiden Orten? `[geplant]`-Eintrag? LIVE-PROGRESS NEXT ACTION gesetzt?

### task-done
**5 Pflicht-Schritte:**
1. DOKUMENTATION.md `[geplant]` → `[abgeschlossen]` + Commits
2. LIVE-PROGRESS "Diese Session erledigt" + Datum + Hash
3. Offene Tasks aktualisieren, nächsten aktivieren
4. QUICKFIX-ACTIVE löschen falls gesetzt
5. NEXT ACTION für kalten Claude formulieren

**Selbst-Check:** `[abgeschlossen]` mit Commits? Erledigt-Zeile mit Hash? QUICKFIX gelöscht? NEXT ACTION eindeutig?

### quickfix
**4 Pflicht-Schritte:**
1. QUICKFIX-ACTIVE setzen mit Timestamp
2. Fix direkt implementieren (kein brainstorming)
3. `task-done` aufrufen
4. QUICKFIX-ACTIVE löschen

**Bedingungen:** Max. 1–2 Dateien, Ursache eindeutig, kein neues Pattern nötig.
**Selbst-Check:** Flag gesetzt + gelöscht? task-done aufgerufen? Wirklich < 2 Dateien?

---

## Lernphase-Fix

- `feedback_lernphase.md` → Hinweis "superseded by feedback_erkenntnisse_speichern.md" + nicht mehr befolgen
- `feedback_erkenntnisse_speichern.md` → als alleinig gültig kennzeichnen
- Beide Dateien bleiben erhalten (historische Referenz), aber Priorität ist klar

---

## Dateien die erstellt/geändert werden

| Datei | Aktion |
|-------|--------|
| `/root/.claude/skills/ss/SKILL.md` | neu anlegen |
| `/root/.claude/skills/se/SKILL.md` | neu anlegen |
| `/root/.claude/skills/plan/SKILL.md` | neu anlegen |
| `/root/.claude/skills/task-done/SKILL.md` | neu anlegen |
| `/root/.claude/skills/quickfix/SKILL.md` | neu anlegen |
| `/root/.claude/projects/-root/memory/feedback_lernphase.md` | superseded-Hinweis ergänzen |
| `/root/.claude/projects/-root/memory/feedback_erkenntnisse_speichern.md` | als primär kennzeichnen |
| Memory-Dateien für ss, se, plan, task-done, quickfix | auf Skill-Aufruf aktualisieren |

---

## Erfolgs-Kriterium

`ss`, `se`, `plan`, `task-done`, `quickfix` laden jeweils ein SKILL.md mit Pflicht-Schritten und Selbst-Check — identisches Qualitätsniveau wie `dk`. Kein Abschnitt darf fehlen oder mit "—" abgespeist werden.

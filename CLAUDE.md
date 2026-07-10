# CLAUDE — SF-1 Ultimate Projektregeln

> Gilt nur für dieses Projekt. Ergänzt die globalen Regeln aus `/root/CLAUDE.md`.
> Globale Regeln haben Vorrang. Bei Widerspruch: User fragen.

---

## SF-1 Projekt-Kontext

**Projekt:** seedfinderpro.de — Cannabis Growing Community Platform
**Root:** `/root/SF-1-Ultimate-/`
**Vault:** `/root/SF-Brain/`

**Erste Aktion bei Session-Start:**
1. `CLAUDE_CONTEXT.md` lesen
2. `/root/REMINDERS.md` prüfen (falls vorhanden: User zeigen, dann leeren)
3. Backup auslösen + prüfen (siehe Vault: `Regeln & Protokolle/Session-Protokoll.md`)
4. `docker ps --format "table {{.Names}}\t{{.Status}}" | grep sf1` ausführen
5. Beta-Status prüfen

---

## SF-1 Vault-Trigger (zusätzlich zu globalen)

| Situation | Vault-Datei |
|-----------|-------------|
| Feed-Adapter / Price-Service | `SF-1 Projekt/Code-Patterns.md` (Abschnitt Feed-Adapter) |
| MongoDB / Mongoose Fehler | `SF-1 Projekt/Code-Patterns.md` (Abschnitt MongoDB) |
| Meilisearch / Search-Service | `SF-1 Projekt/Code-Patterns.md` (Abschnitt Meilisearch) |
| JWT / Auth / OAuth | `SF-1 Projekt/Architektur.md` (Abschnitt Auth) |
| Beta-Limit / Beta-Feature | `SF-1 Projekt/Status & Roadmap.md` (Abschnitt Beta) |
| Neue Session abschließen | `SF-1 Projekt/Status & Roadmap.md` updaten |

---

## SF-1 Pflicht-Regeln (Kurzreferenz)

Vollständig in Vault: `Regeln & Protokolle/Pflicht-Regeln.md`

- **Regel 0b:** Analysen als Datei in `/root/Dokumente/` speichern
- **Regel 2:** `DOKUMENTATION.md` sofort nach JEDER Änderung updaten
- **Regel 3:** Vor deleteMany/DROP/reset → count() zeigen + User bestätigen
- **Regel 6:** Frontend-Rebuild (~10 min) nur wenn wirklich nötig
- **Regel 8:** Keine Secrets hardcoden
- **Regel 10:** Nie alle Services gleichzeitig restarten
- **Regel 12:** `prisma db push` nur nach Backup

---

## Deploy-Reihenfolge

HARTES VERBOT, KEINE AUSNAHMEN: 1. Lenovo (lokal) -> 2. GitHub (push + verifizieren) -> 3. Server (erst danach). Kein direkter Server-Zugriff vor Schritt 1+2, außer explizite Anweisung von Callie.

---

## SF-1 Mastertest — Trigger

Wenn der User sagt "starte master test", "mastertest starten", "führe mastertest aus" oder ähnliches:
→ **`mastertest`-Skill aufrufen** (Skill tool, name: `mastertest`)

Der Skill führt die 42-Test-Suite aus, liest den JSON-Output und schreibt einen detaillierten Report nach `/root/SF-Brain/Logs/mastertest-reports/`.

---

## SF-1 Bekannte Fallen (Kurzreferenz)

Vollständig in Vault: `SF-1 Projekt/Code-Patterns.md`

- Redis v4: `setex()` ist weg → `redis.set(key, val, { EX: n })`
- Frontend: Production-Build, kein Hot-Reload → Rebuild kostet ~10 min
- Express: spezifische Routes VOR parametrisierten definieren
- Toast: `sonner` nicht `@/hooks/use-toast`
- Mongoose: immer `mongoose.models['X'] || mongoose.model(...)` pattern

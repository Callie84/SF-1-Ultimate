# Plan 03 — tests (tests/)

> **Niedrigste Priorität:** Test-Infrastruktur, **nicht in Prod ausgeliefert** → kein reales Laufzeitrisiko trotz „high"-Labels. Kein Frontend-Rebuild, kein Server-Deploy nötig (nur Lockfile + GitHub).

## Alerts

| Paket | jetzt → Ziel | Sev | Anmerkung |
|---|---|---|---|
| **axios** | 1.15.x → **1.16.0** | 6× high + 1 med + 1 low | **Ein** Bump killt alle 8 CVEs (44492/44496/44488/44487/44486/44494/44490/44489) |
| form-data | 4.0.x → 4.0.6 | high (GHSA-hmw2-7cc7-3qxx) | Patch |

## Schritte
```bash
cd tests
cp package.json package.json.bak && cp package-lock.json package-lock.json.bak
npm install axios@^1.16.0 form-data@^4.0.6
npm audit
# Test-Suite muss weiter laufen:
npm test   # oder die relevanten test:* Scripts aus root package.json
```

## Verifikation
- `npm audit` in `tests/`: axios + form-data weg.
- Mastertest / relevante Test-Scripts laufen weiter grün (Trigger: „starte master test" → mastertest-Skill).

## Deploy
- Kein Server-Deploy (Tests laufen nicht in Prod).
1. Lenovo: Tests grün.
2. GitHub: commit (tests/package.json + lock + DOKUMENTATION.md), push, CI grün. Fertig.

## Rollback
`.bak` zurück, `npm install`.

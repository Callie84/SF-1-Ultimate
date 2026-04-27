#!/usr/bin/env python3
"""
SF-1 Mastertest — Vault-Report-Generator
Liest /tmp/sf1-mastertest-result.json und schreibt Report nach
/root/SF-Brain/Logs/mastertest-reports/YYYY-MM-DD_HH-MM_mastertest.md
Aktualisiert auch den INDEX.md.

Aufruf: python3 tests/generate-vault-report.py
"""

import json
import os
import sys
from datetime import datetime

JSON_IN = '/tmp/sf1-mastertest-result.json'
REPORT_DIR = '/root/SF-Brain/Logs/mastertest-reports'
INDEX_FILE = os.path.join(REPORT_DIR, 'INDEX.md')

SERVICE_MAP = {
    'auth.test.ts': 'auth',
    'tools.test.ts': 'tools',
    'community.test.ts': 'community',
    'journal.test.ts': 'journal',
    'price.test.ts': 'price',
    'search.test.ts': 'search',
    'gamification.test.ts': 'gamification',
    'notification.test.ts': 'notification',
    'ai.test.ts': 'ai',
    'backup.test.ts': 'backup',
    'media.test.ts': 'media',
}


def main():
    if not os.path.exists(JSON_IN):
        print(f'FEHLER: {JSON_IN} nicht gefunden. Zuerst mastertest-report.sh ausführen.', file=sys.stderr)
        sys.exit(1)

    with open(JSON_IN) as f:
        data = json.load(f)

    ts = datetime.now()
    timestamp = ts.strftime('%Y-%m-%d_%H-%M')
    ts_human = ts.strftime('%Y-%m-%d %H:%M:%S')
    ts_short = ts.strftime('%Y-%m-%d %H:%M')

    total_passed = data['numPassedTests']
    total_failed = data['numFailedTests']
    total_duration_ms = sum(
        (r.get('endTime', 0) - r.get('startTime', 0))
        for r in data['testResults']
    )

    rows = []
    rate_limit_events = []
    failed_tests = []

    for suite in data['testResults']:
        fname = os.path.basename(suite.get('name', ''))
        service = SERVICE_MAP.get(fname, fname)
        status = suite.get('status', '?')
        assertions = suite.get('assertionResults', [])
        passed = sum(1 for a in assertions if a.get('status') == 'passed')
        failed_count = sum(1 for a in assertions if a.get('status') == 'failed')
        duration_ms = suite.get('endTime', 0) - suite.get('startTime', 0)
        duration_s = f'{duration_ms / 1000:.1f}s'
        icon = '✅' if status == 'passed' else '❌'

        rows.append(f'| {service} | {icon} | {passed}/{len(assertions)} | {duration_s} |')

        for a in assertions:
            title = a.get('title', '')
            if 'skipped' in title.lower():
                rate_limit_events.append(f'- **{service}**: `{title}`')
            if a.get('status') == 'failed':
                msg = (a.get('failureMessages') or [''])[0][:300]
                failed_tests.append(f'### {service} — {title}\n\n```\n{msg}\n```')

    overall_status = '✅ ALLE GRÜN' if total_failed == 0 else f'❌ {total_failed} FEHLGESCHLAGEN'
    rate_limit_section = '\n'.join(rate_limit_events) if rate_limit_events else '_Keine Rate-Limit-Events._'
    failed_section = '\n\n'.join(failed_tests) if failed_tests else '_Keine fehlgeschlagenen Tests._'

    report = f"""# SF-1 Mastertest — {ts_human}

## Zusammenfassung

| Metrik | Wert |
|--------|------|
| **Status** | {overall_status} |
| **Tests bestanden** | {total_passed} / {total_passed + total_failed} |
| **Test-Dateien** | {len(data['testResults'])} / {len(data['testResults'])} |
| **Gesamtdauer** | {total_duration_ms / 1000:.1f}s |
| **Ausgeführt** | {ts_human} |

## Ergebnis pro Service

| Service | Status | Tests | Dauer |
|---------|--------|-------|-------|
{chr(10).join(rows)}

## Rate-Limit-Events (Auth-Service)

{rate_limit_section}

> Rate-Limit-Events sind kein Fehler — betroffene Tests werden graceful übersprungen (rateLimited-Flag).
> Auth-Service erlaubt ~20 Register-Calls pro 15 Minuten.

## Fehlgeschlagene Tests

{failed_section}

## Testumgebung

- **Vitest**: 1.6.x
- **Services**: 11 SF-1 Docker-Container (172.17.0.x)
- **Auth-Rate-Limit-Resilience**: aktiv (alle 6 auth-abhängigen Services)
- **Gamification-Timeout**: 25s Axios-Client (Leaderboard ~10–20s normal)
- **Report erstellt von**: mastertest-Skill / generate-vault-report.py
"""

    os.makedirs(REPORT_DIR, exist_ok=True)
    report_filename = f'{timestamp}_mastertest.md'
    report_path = os.path.join(REPORT_DIR, report_filename)
    with open(report_path, 'w') as f:
        f.write(report)

    # INDEX.md aktualisieren — neuen Eintrag oben einfügen
    status_cell = f'✅ {total_passed}/{total_passed + total_failed}' if total_failed == 0 else f'❌ {total_failed} Fehler'
    new_row = f'| {ts_short} | {status_cell} | {len(data["testResults"])} | [{report_filename}]({report_filename}) |'

    if os.path.exists(INDEX_FILE):
        with open(INDEX_FILE) as f:
            idx = f.read()
        header_end = '|-------|--------|-------|--------|-------|'
        if header_end in idx:
            idx = idx.replace(header_end, header_end + '\n' + new_row, 1)
        else:
            idx += '\n' + new_row
    else:
        idx = f"""# SF-1 Mastertest — Report-Index

Neueste Reports zuerst. Erstellt automatisch durch den `mastertest`-Skill.

| Datum | Status | Tests | Suites | Datei |
|-------|--------|-------|--------|-------|
{new_row}
"""

    with open(INDEX_FILE, 'w') as f:
        f.write(idx)

    print(f'Report: {report_path}')
    print(f'Status: {overall_status}')
    print(f'Tests: {total_passed}/{total_passed + total_failed} | Dauer: {total_duration_ms / 1000:.1f}s')
    if rate_limit_events:
        print(f'Rate-Limits: {len(rate_limit_events)} Events')
    if failed_tests:
        print(f'Fehler: {len(failed_tests)} Tests', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()

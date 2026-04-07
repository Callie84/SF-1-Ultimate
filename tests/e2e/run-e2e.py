#!/usr/bin/env python3
"""
SF-1 E2E Test Runner
Führt alle Browser-Use E2E Tests aus und erstellt einen Report.

Usage:
  python3 run-e2e.py              # alle Tests
  python3 run-e2e.py auth         # nur Auth-Tests
  python3 run-e2e.py auth strains # nur Auth + Strain-Tests

Verfügbare Suites: auth, journal, community, strains, prices
"""
import sys
import os
import asyncio
import json
from datetime import datetime

sys.path.insert(0, '/root/SF-1-Ultimate-/tests/e2e')

from config import REPORT_DIR, TEST_USER, BASE_URL


async def run_suite(name: str):
    """Importiert und führt eine Test-Suite aus."""
    module_map = {
        'auth':      'flows.test_auth',
        'journal':   'flows.test_journal',
        'community': 'flows.test_community',
        'strains':   'flows.test_strains',
        'prices':    'flows.test_prices',
    }
    if name not in module_map:
        print(f'Unbekannte Suite: {name}')
        return []

    import importlib
    mod = importlib.import_module(module_map[name])
    return await mod.run_all()


async def main():
    # Welche Suites laufen?
    all_suites = ['auth', 'journal', 'community', 'strains', 'prices']
    requested = sys.argv[1:] if len(sys.argv) > 1 else all_suites

    invalid = [s for s in requested if s not in all_suites]
    if invalid:
        print(f'Ungültige Suites: {invalid}')
        print(f'Verfügbar: {all_suites}')
        sys.exit(1)

    print(f'\n{"="*50}')
    print(f'SF-1 E2E TESTS — {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print(f'URL: {BASE_URL}')
    print(f'Test-User: {TEST_USER["email"]}')
    print(f'Suites: {", ".join(requested)}')
    print(f'{"="*50}')

    all_results = []
    suite_summaries = []

    for i, suite_name in enumerate(requested):
        if i > 0:
            print(f'\n⏳ Pause 120s (Rate-Limit Reset)...')
            await asyncio.sleep(120)
        results = await run_suite(suite_name)
        all_results.extend(results)

        passed = sum(1 for r in results if r['passed'])
        suite_summaries.append({
            'suite':   suite_name,
            'passed':  passed,
            'total':   len(results),
            'results': results,
        })

    # Gesamt-Zusammenfassung
    total_passed = sum(1 for r in all_results if r['passed'])
    total = len(all_results)
    duration = sum(r['duration'] for r in all_results)

    print(f'\n{"="*50}')
    print(f'GESAMT: {total_passed}/{total} bestanden ({round(duration)}s)')
    print(f'{"="*50}')
    for s in suite_summaries:
        icon = '✅' if s['passed'] == s['total'] else ('⚠️' if s['passed'] > 0 else '❌')
        print(f'  {icon} {s["suite"]:12} {s["passed"]}/{s["total"]}')

    # Report speichern
    os.makedirs(REPORT_DIR, exist_ok=True)
    report_date = datetime.now().strftime('%Y-%m-%d_%H-%M')
    report_path = f'{REPORT_DIR}/e2e-{report_date}.json'

    report = {
        'date':          datetime.now().isoformat(),
        'url':           BASE_URL,
        'total_passed':  total_passed,
        'total':         total,
        'duration':      round(duration),
        'suites':        suite_summaries,
    }
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    # Auch als Markdown speichern (Regel 0b)
    md_path = f'/root/Dokumente/e2e-report-{report_date}.md'
    with open(md_path, 'w') as f:
        f.write(f'# SF-1 E2E Report — {datetime.now().strftime("%Y-%m-%d %H:%M")}\n\n')
        f.write(f'**Gesamt:** {total_passed}/{total} bestanden | **Dauer:** {round(duration)}s\n\n')
        for s in suite_summaries:
            icon = '✅' if s['passed'] == s['total'] else ('⚠️' if s['passed'] > 0 else '❌')
            f.write(f'\n## {icon} {s["suite"].capitalize()} ({s["passed"]}/{s["total"]})\n\n')
            for r in s['results']:
                ri = '✅' if r['passed'] else '❌'
                f.write(f'- {ri} **{r["name"]}** ({r["duration"]}s)\n')
                if r['result']:
                    first = r['result'].strip().split('\n')[0][:200]
                    f.write(f'  - {first}\n')
                if r['error']:
                    f.write(f'  - ⚠ `{r["error"][:150]}`\n')

    print(f'\nReport gespeichert:')
    print(f'  JSON: {report_path}')
    print(f'  MD:   {md_path}')

    # Exit-Code: 0 wenn alle bestanden, 1 wenn Fehler
    sys.exit(0 if total_passed == total else 1)


if __name__ == '__main__':
    asyncio.run(main())

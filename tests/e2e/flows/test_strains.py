"""
SF-1 E2E — Strain-Datenbank Tests
Testet: Suche, Detailseite, Vergleich, öffentliche Sichtbarkeit
"""
import sys
sys.path.insert(0, '/root/SF-1-Ultimate-/tests/e2e')

import asyncio
from base import run_test, print_result
from config import BASE_URL, TEST_USER


async def test_strain_list():
    return await run_test(
        name='Strains — Übersicht lädt',
        task=f"""
Gehe zu {BASE_URL}/strains oder {BASE_URL}/sorten.

Prüfe ob:
- Die Seite lädt ohne Fehler
- Strain-Einträge sichtbar sind
- Keine 404 oder 500 Fehlerseite

Antworte mit:
- PASS: Strain-Liste lädt — [Anzahl sichtbarer Strains wenn erkennbar]
- FAIL: [Fehler]
""",
        max_steps=10,
    )


async def test_strain_search():
    return await run_test(
        name='Strains — Suche funktioniert',
        task=f"""
Gehe zu {BASE_URL}/strains oder zur Suche auf {BASE_URL}.

Suche nach "OG Kush" oder "Haze" — wähle den Begriff der im Suchfeld verfügbar erscheint.

Prüfe ob:
- Suchergebnisse erscheinen
- Mindestens ein Ergebnis relevant zum Suchbegriff ist

Antworte mit:
- PASS: Suche funktioniert — [Suchbegriff und Anzahl Ergebnisse]
- FAIL: [Fehler oder keine Ergebnisse]
""",
        max_steps=15,
    )


async def test_strain_detail():
    return await run_test(
        name='Strains — Detailseite öffnen',
        task=f"""
Gehe zu {BASE_URL}/strains.

Klicke auf den ersten Strain in der Liste.

Prüfe ob die Detailseite:
- Einen Namen hat
- Beschreibung oder Informationen anzeigt
- Keine 404 oder 500 Fehlerseite ist

Antworte mit:
- PASS: Detailseite lädt — [Strain-Name den du gesehen hast]
- FAIL: [Fehler]
""",
        max_steps=15,
    )


async def run_all():
    print('\n=== STRAIN FLOW TESTS ===\n')
    results = []

    for i, test_fn in enumerate([test_strain_list, test_strain_search, test_strain_detail]):
        if i > 0:
            await asyncio.sleep(120)  # Rate-Limit Reset: Haiku 50K tokens/min
        r = await test_fn()
        print_result(r)
        results.append(r)

    passed = sum(1 for r in results if r['passed'])
    print(f'\nErgebnis: {passed}/{len(results)} bestanden')
    return results


if __name__ == '__main__':
    asyncio.run(run_all())

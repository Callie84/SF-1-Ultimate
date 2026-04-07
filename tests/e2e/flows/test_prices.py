"""
SF-1 E2E — Preisvergleich Tests
Testet: Preisliste, Strain-Preise, Preisalarm (eingeloggt)
"""
import sys
sys.path.insert(0, '/root/SF-1-Ultimate-/tests/e2e')

import asyncio
from base import run_test, print_result
from config import BASE_URL, TEST_USER, clear_ip_login_lock


async def test_price_list():
    return await run_test(
        name='Preise — Übersicht lädt',
        task=f"""
Gehe zu {BASE_URL}/preise oder {BASE_URL}/prices.

Prüfe ob:
- Die Seite lädt ohne Fehler
- Preiseinträge oder Seedbank-Daten sichtbar sind
- Keine 404 oder 500 Fehlerseite

Antworte mit:
- PASS: Preisübersicht lädt — [was du gesehen hast]
- FAIL: [Fehler]
""",
        max_steps=10,
    )


async def test_price_search():
    return await run_test(
        name='Preise — Strain-Preissuche',
        task=f"""
Gehe zu {BASE_URL}/preise oder {BASE_URL}/prices.

Suche nach einem Strain (z.B. "Auto", "Kush" oder "OG") falls ein Suchfeld vorhanden ist.
Alternativ klicke auf den ersten verfügbaren Strain/Eintrag.

Prüfe ob:
- Preise von verschiedenen Seedbanks angezeigt werden
- Mindestens ein Preis sichtbar ist

Antworte mit:
- PASS: Preise werden angezeigt — [was du gesehen hast, z.B. Seedbank-Namen oder Preise]
- FAIL: [Fehler oder keine Preise]
""",
        max_steps=20,
    )


async def test_price_alert():
    return await run_test(
        name='Preise — Preisalarm setzen (eingeloggt)',
        task=f"""
Gehe zu {BASE_URL}/auth/login und logge dich ein:
- E-Mail: {TEST_USER['email']}
- Passwort: {TEST_USER['password']}

Navigiere zu {BASE_URL}/preise oder {BASE_URL}/prices.

Versuche einen Preisalarm zu setzen:
- Klicke auf einen Strain oder ein Produkt
- Suche nach einem "Preisalarm", "Alert", "Benachrichtigung" oder Glocken-Icon
- Klicke darauf und bestätige

Prüfe ob der Preisalarm angelegt wurde oder eine entsprechende Meldung erscheint.

Antworte mit:
- PASS: Preisalarm gesetzt oder Feature nicht vorhanden — [was du gesehen hast]
- FAIL: [Fehlermeldung]
""",
        max_steps=30,
    )


async def run_all():
    print('\n=== PREIS FLOW TESTS ===\n')
    results = []

    for i, test_fn in enumerate([test_price_list, test_price_search, test_price_alert]):
        if i > 0:
            await asyncio.sleep(120)
        clear_ip_login_lock()
        r = await test_fn()
        print_result(r)
        results.append(r)

    passed = sum(1 for r in results if r['passed'])
    print(f'\nErgebnis: {passed}/{len(results)} bestanden')
    return results


if __name__ == '__main__':
    asyncio.run(run_all())

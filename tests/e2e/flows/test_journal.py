"""
SF-1 E2E — Journal Flow Tests
Testet: Grow erstellen, Tagebucheintrag hinzufügen, Grow ansehen
"""
import sys
sys.path.insert(0, '/root/SF-1-Ultimate-/tests/e2e')

import asyncio
from base import run_test, print_result
from config import BASE_URL, TEST_USER, clear_ip_login_lock


async def test_create_grow():
    return await run_test(
        name='Journal — Grow erstellen',
        task=f"""
Gehe zu {BASE_URL}/auth/login und logge dich ein:
- E-Mail: {TEST_USER['email']}
- Passwort: {TEST_USER['password']}

Nach dem Login navigiere zum Journal (Menüpunkt "Journal", "Grows" oder ähnlich).

Erstelle einen neuen Grow:
- Klicke auf "Neuer Grow", "Grow erstellen" oder ähnlichen Button
- Name: "E2E Test Grow"
- Wähle eine beliebige Strain wenn gefragt
- Fülle alle Pflichtfelder aus
- Speichere/Erstelle den Grow

Prüfe ob der Grow erstellt wurde und in der Liste erscheint.

Antworte mit:
- PASS: Grow erstellt — [Name und was du gesehen hast]
- FAIL: [Fehlermeldung oder was nicht funktioniert hat]
""",
        max_steps=30,
    )


async def test_add_journal_entry():
    return await run_test(
        name='Journal — Tagebucheintrag hinzufügen',
        task=f"""
Gehe zu {BASE_URL}/auth/login und logge dich ein:
- E-Mail: {TEST_USER['email']}
- Passwort: {TEST_USER['password']}

Navigiere zum Journal und öffne den Grow "E2E Test Grow".

Füge einen neuen Tagebucheintrag hinzu:
- Klicke auf "Eintrag hinzufügen", "Neuer Eintrag" oder ähnlich
- Schreibe einen kurzen Text: "E2E Testeintrag — alles läuft gut"
- Fülle optionale Felder aus wenn vorhanden (Größe, Wasserstand etc.)
- Speichere den Eintrag

Prüfe ob der Eintrag gespeichert wurde und sichtbar ist.

Antworte mit:
- PASS: Eintrag gespeichert — [was du gesehen hast]
- FAIL: [Fehlermeldung oder was nicht funktioniert hat]
""",
        max_steps=30,
    )


async def test_public_grow_visibility():
    return await run_test(
        name='Journal — Öffentlicher Grow sichtbar',
        task=f"""
Gehe zu {BASE_URL}/grows (öffentliche Grows-Übersicht).

Prüfe ob:
- Die Seite lädt ohne Fehler
- Mindestens ein Grow angezeigt wird ODER eine "Noch keine Grows" Meldung erscheint
- Keine 404 oder 500 Fehlerseite

Antworte mit:
- PASS: Seite lädt korrekt — [was du gesehen hast, Anzahl Grows wenn sichtbar]
- FAIL: [Fehlermeldung oder HTTP-Fehler]
""",
        max_steps=10,
    )


async def run_all():
    print('\n=== JOURNAL FLOW TESTS ===\n')
    results = []

    r1 = await test_public_grow_visibility()
    print_result(r1)
    results.append(r1)

    await asyncio.sleep(120)
    clear_ip_login_lock()
    r2 = await test_create_grow()
    print_result(r2)
    results.append(r2)

    if r2['passed']:
        await asyncio.sleep(120)
        clear_ip_login_lock()
        r3 = await test_add_journal_entry()
        print_result(r3)
        results.append(r3)
    else:
        print('⏭  Tagebucheintrag-Test übersprungen (Grow-Erstellung fehlgeschlagen)')

    passed = sum(1 for r in results if r['passed'])
    print(f'\nErgebnis: {passed}/{len(results)} bestanden')
    return results


if __name__ == '__main__':
    asyncio.run(run_all())

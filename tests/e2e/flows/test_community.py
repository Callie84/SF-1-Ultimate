"""
SF-1 E2E — Community Flow Tests
Testet: Forum öffnen, Thread erstellen, Reply, öffentliche Sichtbarkeit
"""
import sys
sys.path.insert(0, '/root/SF-1-Ultimate-/tests/e2e')

import asyncio
from base import run_test, print_result
from config import BASE_URL, TEST_USER, clear_ip_login_lock


async def test_community_public():
    return await run_test(
        name='Community — Forum öffentlich sichtbar',
        task=f"""
Gehe zu {BASE_URL}/community oder {BASE_URL}/forum.

Prüfe ob:
- Die Seite lädt ohne Fehler
- Thread-Liste oder Kategorien sichtbar sind
- Keine 404 oder 500 Fehlerseite

Antworte mit:
- PASS: Forum lädt korrekt — [was du gesehen hast]
- FAIL: [Fehler]
""",
        max_steps=10,
    )


async def test_create_thread():
    return await run_test(
        name='Community — Thread erstellen',
        task=f"""
Gehe zu {BASE_URL}/auth/login und logge dich ein:
- E-Mail: {TEST_USER['email']}
- Passwort: {TEST_USER['password']}

Navigiere zum Community/Forum-Bereich.

Erstelle einen neuen Thread:
- Klicke auf "Neuer Thread", "Thread erstellen", "Post erstellen" oder ähnlich
- Titel: "E2E Testthread — bitte ignorieren"
- Inhalt: "Dies ist ein automatisch erstellter Testthread."
- Wähle eine Kategorie wenn erforderlich
- Poste/Erstelle den Thread

Prüfe ob der Thread erstellt wurde.

Antworte mit:
- PASS: Thread erstellt — [was du gesehen hast]
- FAIL: [Fehlermeldung]
""",
        max_steps=30,
    )


async def test_reply_to_thread():
    return await run_test(
        name='Community — Auf Thread antworten',
        task=f"""
Gehe zu {BASE_URL}/auth/login und logge dich ein:
- E-Mail: {TEST_USER['email']}
- Passwort: {TEST_USER['password']}

Navigiere zum Community/Forum und finde den Thread "E2E Testthread — bitte ignorieren".

Schreibe eine Antwort:
- Klicke auf "Antworten", "Reply" oder das Antwort-Feld
- Text: "E2E Testantwort — automatisch erstellt"
- Sende die Antwort

Prüfe ob die Antwort erscheint.

Antworte mit:
- PASS: Antwort gepostet — [was du gesehen hast]
- FAIL: [Fehlermeldung]
""",
        max_steps=30,
    )


async def run_all():
    print('\n=== COMMUNITY FLOW TESTS ===\n')
    results = []

    r1 = await test_community_public()
    print_result(r1)
    results.append(r1)

    await asyncio.sleep(120)
    clear_ip_login_lock()
    r2 = await test_create_thread()
    print_result(r2)
    results.append(r2)

    if r2['passed']:
        await asyncio.sleep(120)
        clear_ip_login_lock()
        r3 = await test_reply_to_thread()
        print_result(r3)
        results.append(r3)
    else:
        print('⏭  Reply-Test übersprungen (Thread-Erstellung fehlgeschlagen)')

    passed = sum(1 for r in results if r['passed'])
    print(f'\nErgebnis: {passed}/{len(results)} bestanden')
    return results


if __name__ == '__main__':
    asyncio.run(run_all())

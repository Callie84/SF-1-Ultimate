"""
SF-1 E2E — Auth Flow Tests
Testet: Registrierung, Login, Logout, Fehler-Handling
"""
import sys
sys.path.insert(0, '/root/SF-1-Ultimate-/tests/e2e')

import asyncio
from base import run_test, print_result
from config import BASE_URL, TEST_USER, clear_ip_login_lock


async def test_registration():
    return await run_test(
        name='Registrierung — neuer Account',
        task=f"Gehe zu {BASE_URL}/auth/register. Registriere: E-Mail={TEST_USER['email']}, Benutzername={TEST_USER['username']}, Passwort={TEST_USER['password']}. Checkboxen aktivieren. Absenden. Antworte PASS: [Ergebnis] oder FAIL: [Fehler]",
        max_steps=20,
    )


async def test_login():
    return await run_test(
        name='Login — bestehender Account',
        task=f"Gehe zu {BASE_URL}/auth/login. Login mit E-Mail={TEST_USER['email']}, Passwort={TEST_USER['password']}. Prüfe ob Dashboard erscheint. Antworte PASS: [Ergebnis] oder FAIL: [Fehler]",
        max_steps=15,
    )


async def test_login_wrong_password():
    return await run_test(
        name='Login — falsches Passwort',
        task=f"Gehe zu {BASE_URL}/auth/login. Login mit E-Mail={TEST_USER['email']}, Passwort=FalschesPasswort999!. Prüfe ob Fehlermeldung erscheint. Antworte PASS: Fehlermeldung erscheint — [Text] oder FAIL: kein Fehler",
        max_steps=10,
    )


async def test_logout():
    return await run_test(
        name='Logout — Session beenden',
        task=f"Gehe zu {BASE_URL}/auth/login. Login mit {TEST_USER['email']} / {TEST_USER['password']}. Dann Logout über Menü/Avatar. Prüfe ob Session beendet. Antworte PASS: [Ergebnis] oder FAIL: [Fehler]",
        max_steps=20,
    )


async def run_all():
    print('\n=== AUTH FLOW TESTS ===\n')
    results = []

    await asyncio.sleep(120)  # Rate-Limit vollständig leeren

    clear_ip_login_lock()
    r = await test_login()
    print_result(r)
    results.append(r)

    await asyncio.sleep(120)
    clear_ip_login_lock()
    r2 = await test_login_wrong_password()
    print_result(r2)
    results.append(r2)

    await asyncio.sleep(120)
    clear_ip_login_lock()
    r3 = await test_logout()
    print_result(r3)
    results.append(r3)

    passed = sum(1 for r in results if r['passed'])
    print(f'\nErgebnis: {passed}/{len(results)} bestanden')
    return results


if __name__ == '__main__':
    asyncio.run(run_all())

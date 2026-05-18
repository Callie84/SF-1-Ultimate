"""
SF-1 E2E Test Base — gemeinsame Logik für alle Tests
"""
import asyncio
import subprocess
import tempfile
import time
import traceback
from datetime import datetime

from browser_use import Agent
from browser_use.browser.profile import BrowserProfile
from browser_use.browser.session import BrowserSession
from browser_use.llm.litellm.chat import ChatLiteLLM

from config import ANTHROPIC_API_KEY, LLM_MODEL, AGENT_MAX_STEPS, BASE_URL

# Playwright Chromium Binary
CHROMIUM_PATH = '/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome'


def get_llm():
    return ChatLiteLLM(
        model=f'anthropic/{LLM_MODEL}',
        api_key=ANTHROPIC_API_KEY,
        temperature=0.0,
        max_tokens=4096,
    )


async def _start_chromium(port: int, user_data_dir: str) -> subprocess.Popen:
    """Startet Chromium headless mit CDP auf gegebenem Port."""
    proc = subprocess.Popen(
        [
            CHROMIUM_PATH,
            f'--remote-debugging-port={port}',
            f'--user-data-dir={user_data_dir}',
            '--headless=new',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-networking',
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    # Warten bis CDP bereit ist (max 15s)
    import aiohttp
    cdp_url = f'http://localhost:{port}'
    for _ in range(30):
        try:
            async with aiohttp.ClientSession() as s:
                async with s.get(f'{cdp_url}/json/version', timeout=aiohttp.ClientTimeout(total=1)) as r:
                    if r.status == 200:
                        return proc
        except Exception:
            pass
        await asyncio.sleep(0.5)
    raise RuntimeError(f'Chromium CDP nicht bereit auf Port {port}')


async def run_test(name: str, task: str, max_steps: int = AGENT_MAX_STEPS) -> dict:
    """
    Startet Chromium manuell per CDP, verbindet browser-use, führt Test aus.
    Gibt dict mit name, passed, duration, result, error zurück.
    """
    start = time.time()
    result_text = ''
    error_text = ''
    passed = False
    proc = None
    tmp_dir = tempfile.mkdtemp(prefix='sf1_e2e_')

    # Freien Port finden
    import socket
    with socket.socket() as s:
        s.bind(('', 0))
        port = s.getsockname()[1]

    try:
        # Chromium manuell starten
        proc = await _start_chromium(port, tmp_dir)

        # BrowserSession per CDP verbinden (kein interner Browser-Start)
        profile = BrowserProfile(data={
            'headless': True,
            'chromium_sandbox': False,
            'enable_default_extensions': False,
            'cdp_url': f'http://localhost:{port}',
        })
        session = BrowserSession(
            cdp_url=f'http://localhost:{port}',
            browser_profile=profile,
        )

        agent = Agent(
            task=task,
            llm=get_llm(),
            browser_session=session,
            max_actions_per_step=3,
            use_vision=False,         # kein Screenshot → spart Tokens
            message_compaction=True,  # komprimiert alte History → weniger Tokens
            enable_planning=False,    # kein extra Planning-Prompt → spart Tokens
        )
        result = await agent.run(max_steps=max_steps)
        result_text = result.final_result() or ''
        passed = 'PASS' in result_text.upper() and 'FAIL' not in result_text.upper()

    except Exception as e:
        error_text = f'{type(e).__name__}: {e}\n{traceback.format_exc()}'
        passed = False
    finally:
        if proc:
            try:
                proc.terminate()
                proc.wait(timeout=5)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)

    duration = round(time.time() - start, 1)

    return {
        'name':     name,
        'passed':   passed,
        'duration': duration,
        'result':   result_text,
        'error':    error_text,
        'time':     datetime.now().strftime('%H:%M:%S'),
    }


def print_result(r: dict):
    icon = '✅' if r['passed'] else '❌'
    print(f"{icon} [{r['time']}] {r['name']} ({r['duration']}s)")
    if r['result']:
        # Nur die erste relevante Zeile ausgeben
        first_line = r['result'].strip().split('\n')[0][:120]
        print(f"   → {first_line}")
    if r['error']:
        print(f"   ⚠ {r['error'][:200]}")

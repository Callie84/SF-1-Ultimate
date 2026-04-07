"""
SF-1 E2E Test Configuration
"""
import os
import subprocess
from dotenv import load_dotenv

# .env aus Projekt-Root laden
load_dotenv('/root/SF-1-Ultimate-/.env')

# URLs
BASE_URL = os.getenv('FRONTEND_URL', 'https://seedfinderpro.de')

# Anthropic API Key
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

# Redis-Passwort (für IP-Lock-Reset)
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', '')

# Persistenter Test-User (kein frischer User pro Lauf → kein IP-Lock-Problem)
# Angelegt am 2026-04-03, Passwort: E2ETest2026!
TEST_USER = {
    'email':        'e2e-persistent@test.de',
    'username':     'e2epersistent',
    'password':     'E2ETest2026!',
    'age_verified': True,
}

# LLM-Modell: Haiku (50K tokens/min — mit Pausen zwischen Tests nutzbar)
LLM_MODEL = 'claude-haiku-4-5-20251001'

# Timeouts
AGENT_MAX_STEPS = 25
AGENT_TIMEOUT   = 120

# Report-Verzeichnis
REPORT_DIR = '/root/SF-1-Ultimate-/tests/e2e/reports'


def clear_ip_login_lock():
    """Löscht den Redis IP-Login-Lock damit Tests von derselben IP einloggen können."""
    try:
        subprocess.run(
            ['docker', 'exec', 'sf1-redis', 'redis-cli',
             '-a', REDIS_PASSWORD, '--no-auth-warning',
             'DEL', 'ip:login:::ffff:172.28.0.1'],
            capture_output=True, timeout=5
        )
    except Exception:
        pass

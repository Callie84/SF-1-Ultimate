# AI-Stack Entfernen aus SF-1 — Design Spec

**Datum:** 2026-04-29  
**Status:** approved  
**Grund:** RAM-Mangel (7,8 GiB Server), Ollama verursacht Swap-Krisen, kein aktiver Nutzen

---

## Ziel

Den kompletten AI-Stack aus SF-1 entfernen um dauerhaft ~600–900 MiB RAM freizugeben und Swap-Krisen durch Ollama zu verhindern. Frontend-AI-Seiten bleiben als Dateien erhalten (für spätere Reaktivierung), werden aber aus der Navigation entfernt.

---

## Scope

### Wird entfernt

**Container / Docker Compose:**
- `sf1-ollama` — aus `docker-compose.ki.yml`
- `sf1-open-webui` — aus `docker-compose.ki.yml`
- `sf1-rag-service` — aus `docker-compose.ki.yml`
- `sf1-ai-service` — aus `docker-compose.yml`
- `sf1-ai-service-stg` — aus `docker-compose.staging.yml`
- Netzwerk `sf1-ki-network` — aus allen compose-Dateien (wenn niemand sonst dranhängt)

**Traefik (in docker-compose.yml):**
- Router-Labels `traefik.http.routers.ai.*` (AI-Service Routing)
- Rate-Limit Middleware `rl-ai` (10 req/min für /api/ai)

**Code-Verzeichnisse:**
- `/apps/ai-service/` — komplett löschen
- `/apps/rag-service/` — komplett löschen

**Konfiguration:**
- `.env`: `OPENAI_API_KEY` entfernen
- `apps/web-app/src/app/api/health/route.ts`: AI-Service Health-Check Eintrag entfernen

**Frontend Navigation:**
- Links zu `/ai/diagnose`, `/ai/advisor`, `/ai/chat` aus Navigation entfernen
- Hook `use-ai-monitoring` Imports entfernen (falls in Layout/Nav verwendet)

### Bleibt erhalten

- Frontend-Seiten-Dateien `/apps/web-app/src/app/ai/` — unberührt
- Docker Volume `sf-1-ultimate-_ollama_data` (5,6 GiB Modelle — wiederverwendbar)
- Netzwerk-Definition in docker-compose.yml für `sf1-ki-network` nur entfernen wenn sicher nicht mehr referenziert

---

## Rollback

Vollständig via `git revert` wiederherstellbar. Ollama-Modelle bleiben auf Disk. Kein Datenverlust. Container können jederzeit neu gestartet werden nach `git revert`.

---

## Erwartetes Ergebnis

- ~600–900 MiB RAM dauerhaft frei
- Keine Swap-Aktivität durch Ollama-Modell-Loads
- Server-Load stabil unter 2.0
- Keine `/api/ai/*` Endpoints erreichbar (404 via Traefik)
- Frontend zeigt keine AI-Navigation-Links mehr

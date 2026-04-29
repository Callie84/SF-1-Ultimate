# AI-Stack Entfernen aus SF-1 — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den kompletten AI-Stack (Ollama, Open WebUI, RAG-Service, AI-Service) aus SF-1 entfernen um dauerhaft RAM freizugeben und Swap-Krisen zu verhindern.

**Architecture:** Container werden gestoppt und aus den Compose-Dateien entfernt. Code-Verzeichnisse werden gelöscht. Frontend-Navigation-Links werden entfernt, die Seiten-Dateien selbst bleiben. Das Ollama Docker-Volume bleibt erhalten.

**Tech Stack:** Docker Compose, Next.js, TypeScript

**Hinweis:** n8n (`sf1-n8n`) in `docker-compose.ki.yml` ist KEIN AI-Stack und bleibt unberührt.

---

### Task 1: Laufende AI-Container stoppen

**Files:**
- Keine Dateien — nur Container-Operationen

- [ ] **Step 1: AI-Container aus docker-compose.ki.yml stoppen**

```bash
cd /root/SF-1-Ultimate-
docker compose -f docker-compose.ki.yml stop ollama open-webui rag-service
docker compose -f docker-compose.ki.yml rm -f ollama open-webui rag-service
```

Erwartete Ausgabe: Container `sf1-ollama`, `sf1-open-webui`, `sf1-rag-service` werden gestoppt und entfernt.

- [ ] **Step 2: AI-Service aus docker-compose.yml stoppen**

```bash
docker compose stop ai-service
docker compose rm -f ai-service
```

Erwartete Ausgabe: Container `sf1-ai-service` wird gestoppt und entfernt.

- [ ] **Step 3: Verifikation**

```bash
docker ps --format "{{.Names}}" | grep -E "ollama|open-webui|rag-service|ai-service"
```

Erwartete Ausgabe: Keine Ausgabe (alle AI-Container weg).

---

### Task 2: docker-compose.ki.yml bereinigen

**Files:**
- Modify: `docker-compose.ki.yml`

- [ ] **Step 1: ollama-Service-Block entfernen (Zeilen 22–44)**

Entferne den gesamten Block:
```yaml
  # ============================================
  # 1. OLLAMA — Lokale LLM-Modelle
  # ============================================
  ollama:
    image: ollama/ollama:latest
    container_name: sf1-ollama
    restart: always
    ports:
      - "11435:11434"
    environment:
      OLLAMA_HOST: "0.0.0.0:11434"
    volumes:
      - ollama_data:/root/.ollama
    networks:
      - sf1-ki-network
    # Healthcheck disabled — Ollama braucht Zeit zum Starten
    # Für Production: Pull-Models im Init-Skript
    # Folgende Modelle werden manual gepullt:
    # docker exec sf1-ollama ollama pull qwen2.5:7b
    # docker exec sf1-ollama ollama pull llama2:7b
```

- [ ] **Step 2: open-webui-Service-Block entfernen (Zeilen 46–72)**

Entferne den gesamten Block:
```yaml
  # ============================================
  # 2. OPEN WEB UI — ChatGPT-ähnliche Oberfläche
  # ============================================
  open-webui:
    image: openwebui/open-webui:latest
    container_name: sf1-open-webui
    restart: always
    ports:
      - "8081:8080"
    environment:
      OLLAMA_BASE_URL: "http://ollama:11434"
      WEBUI_SECRET_KEY: ${WEBUI_SECRET_KEY:-change-me-in-production}
      ENABLE_SIGNUP: "true"
      ENABLE_API: "true"
      OLLAMA_HOST: "http://ollama:11434"
    volumes:
      - open-webui_data:/app/backend/data
    networks:
      - sf1-ki-network
    deploy:
      resources:
        limits:
          memory: 800m
    # Healthcheck disabled — Ollama braucht Zeit zum Starten
```

- [ ] **Step 3: rag-service-Block entfernen (Zeilen 119–143)**

Entferne den gesamten Block:
```yaml
  # ============================================
  # 4. RAG-SERVICE — KI + Datenbank Integration
  # ============================================
  rag-service:
    image: sf1-rag-service:latest
    container_name: sf1-rag-service
    restart: always
    ports:
      - "3014:3013"
    environment:
      PORT: "3013"
      RAG_SERVICE_LOG_LEVEL: "info"
      OLLAMA_BASE_URL: "http://ollama:11434"
      OPENWEBUI_BASE_URL: "http://open-webui:8080"
      N8N_BASE_URL: "http://n8n:5678"
      MONGODB_URL: "mongodb://sf1_admin:Sf1_MongoDB_SuperSecure_2026!@mongodb:27017/sf1_db?authSource=admin"
      POSTGRES_URL: "postgresql://sf1_user:@postgres:5432/sf1_db"
    volumes:
      - rag_service_data:/app/data
    networks:
      - sf1-ki-network
      - sf1-network
    # Hinweis: depends_on removed, damit Services nicht beim Start blockieren
    # Healthcheck disabled (Node Health-Check kann fehlen wenn Service länger braucht)
```

- [ ] **Step 4: Volumes-Einträge für entfernte Services löschen**

In der `volumes:` Section oben in der Datei entferne:
```yaml
  ollama_data:
  open-webui_data:
  rag_service_data:
```

`n8n_data:` bleibt stehen (n8n läuft weiter).

- [ ] **Step 5: Syntax-Check**

```bash
docker compose -f docker-compose.ki.yml config --quiet
```

Erwartete Ausgabe: Kein Fehler. Falls Fehler → YAML-Einrückung prüfen.

---

### Task 3: docker-compose.yml bereinigen

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: ai-service-Block entfernen (Zeilen 503–544)**

Entferne den gesamten Block von `ai-service:` bis einschließlich der letzten Label-Zeile:
```yaml
  ai-service:
    build:
      context: .
      dockerfile: apps/ai-service/Dockerfile
    container_name: sf1-ai-service
    restart: unless-stopped
    volumes:
      - ./apps/ai-service:/app
    environment:
      NODE_ENV: production
      MONGODB_URL: mongodb://sf1_admin:${MONGO_PASSWORD}@mongodb:27017/sf1_ai?authSource=admin&directConnection=true
      JWT_SECRET: ${JWT_SECRET}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      SENTRY_DSN: ${SENTRY_DSN_BACKEND:-}
      OLLAMA_BASE_URL: http://sf1-ollama:11434
    networks:
      - sf1-network
      - sf1-ki-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ai.rule=(Host(`seedfinderpro.de`) || Host(`www.seedfinderpro.de`)) && PathPrefix(`/api/ai`)"
      - "traefik.http.routers.ai.priority=10"
      - "traefik.http.routers.ai.entrypoints=websecure"
      - "traefik.http.routers.ai.tls=true"
      - "traefik.http.routers.ai.tls.certresolver=letsencrypt"
      # NO middlewares - service expects full path /api/ai/...
      - "traefik.http.services.ai.loadbalancer.server.port=3010"
```

- [ ] **Step 2: Rate-Limit Middleware rl-ai entfernen (Zeilen 219–221)**

Entferne diese drei Zeilen aus den Traefik-Labels (im api-gateway oder traefik Block):
```yaml
      - "traefik.http.middlewares.rl-ai.rateLimit.average=10"
      - "traefik.http.middlewares.rl-ai.rateLimit.period=1m"
      - "traefik.http.middlewares.rl-ai.rateLimit.burst=3"
```

- [ ] **Step 3: sf1-ki-network aus networks-Section entfernen**

Am Ende der Datei in der globalen `networks:` Section entferne:
```yaml
  sf1-ki-network:
    external: true
    name: sf-1-ultimate-_sf1-ki-network
```

- [ ] **Step 4: Syntax-Check**

```bash
docker compose config --quiet
```

Erwartete Ausgabe: Kein Fehler.

---

### Task 4: docker-compose.staging.yml bereinigen

**Files:**
- Modify: `docker-compose.staging.yml`

- [ ] **Step 1: ai-service-stg-Block finden und anzeigen**

```bash
grep -n "ai-service-stg\|ai-service" /root/SF-1-Ultimate-/docker-compose.staging.yml
```

Notiere die Zeilen des gesamten Blocks.

- [ ] **Step 2: ai-service-stg-Block entfernen**

Entferne den gesamten `ai-service-stg:` Block (beginnt bei Zeile 216, bis zum nächsten Service-Block).

- [ ] **Step 3: ki-network aus Staging entfernen (falls vorhanden)**

```bash
grep -n "ki-network" /root/SF-1-Ultimate-/docker-compose.staging.yml
```

Falls gefunden: entsprechende Zeilen entfernen.

- [ ] **Step 4: Syntax-Check**

```bash
docker compose -f docker-compose.staging.yml config --quiet 2>&1 | head -5
```

Erwartete Ausgabe: Kein Fehler (oder nur "variable not set" Warnungen für Staging-Vars).

---

### Task 5: Code-Verzeichnisse löschen

**Files:**
- Delete: `apps/ai-service/`
- Delete: `apps/rag-service/`

- [ ] **Step 1: ai-service löschen**

```bash
rm -rf /root/SF-1-Ultimate-/apps/ai-service
```

- [ ] **Step 2: rag-service löschen**

```bash
rm -rf /root/SF-1-Ultimate-/apps/rag-service
```

- [ ] **Step 3: Verifikation**

```bash
ls /root/SF-1-Ultimate-/apps/
```

Erwartete Ausgabe: Weder `ai-service` noch `rag-service` im Listing.

---

### Task 6: .env bereinigen

**Files:**
- Modify: `.env`

- [ ] **Step 1: OPENAI_API_KEY-Zeile entfernen**

Zeile 14 in `.env` komplett entfernen:
```
OPENAI_API_KEY=sk-proj-...
```

- [ ] **Step 2: Verifikation**

```bash
grep -n "OPENAI" /root/SF-1-Ultimate-/.env
```

Erwartete Ausgabe: Keine Ausgabe.

---

### Task 7: Health-Route bereinigen

**Files:**
- Modify: `apps/web-app/src/app/api/health/route.ts:12`

- [ ] **Step 1: AI-Service Health-Check Eintrag entfernen**

Datei lesen, dann Zeile 12 entfernen:
```typescript
  { name: 'ai', label: 'AI-Service', url: 'http://sf1-ai-service:3010/health' },
```

Die Zeile komplett löschen. Die restlichen Service-Einträge bleiben unverändert.

- [ ] **Step 2: TypeScript-Check**

```bash
cd /root/SF-1-Ultimate-/apps/web-app && npx tsc --noEmit 2>&1 | grep -i "health" | head -10
```

Erwartete Ausgabe: Keine Fehler für health/route.ts.

---

### Task 8: Frontend-Navigation AI-Links entfernen

**Files:**
- Modify: `apps/web-app/src/components/footer.tsx:46`
- Modify: `apps/web-app/src/app/admin/ai/page.tsx` (useAiMonitoring import)
- Modify: `apps/web-app/src/app/status/page.tsx` (falls AI-Status angezeigt wird)

- [ ] **Step 1: footer.tsx — AI-Advisor Link entfernen**

Datei lesen, dann Zeile 46 und den zugehörigen Link-Block entfernen:
```tsx
              <Link href="/ai/advisor" className="text-sm text-muted-foreground hover:text-foreground">
```
Auch den Text-Inhalt des Links und das schließende `</Link>` Tag entfernen.

- [ ] **Step 2: admin/ai/page.tsx — useAiMonitoring entfernen**

Datei lesen, dann:
1. Import-Zeile entfernen: `import { useAiMonitoring } from '@/hooks/use-ai-monitoring';`
2. Hook-Aufruf im Komponenten-Body entfernen (z.B. `const { ... } = useAiMonitoring();`)
3. Alle Stellen die Daten aus dem Hook nutzen, ersetzen durch statische Platzhalter oder entfernen

- [ ] **Step 3: status/page.tsx — AI-Status prüfen und entfernen**

```bash
grep -n "ai\|AI-Service" /root/SF-1-Ultimate-/apps/web-app/src/app/status/page.tsx
```

Falls AI-Einträge vorhanden: entfernen.

- [ ] **Step 4: TypeScript-Check**

```bash
cd /root/SF-1-Ultimate-/apps/web-app && npx tsc --noEmit 2>&1 | grep -E "footer|admin/ai|status" | head -20
```

Erwartete Ausgabe: Keine Fehler für die bearbeiteten Dateien.

---

### Task 9: Frontend neu bauen und deployen

**Files:**
- Keine neuen Dateien

- [ ] **Step 1: Frontend-Container neu bauen**

```bash
cd /root/SF-1-Ultimate-
docker compose build frontend
```

Erwartete Ausgabe: Build erfolgreich, kein Fehler.

- [ ] **Step 2: Frontend-Container neu starten**

```bash
docker compose up -d frontend
```

- [ ] **Step 3: Verifikation — kein AI-Link im Footer**

```bash
curl -s https://seedfinderpro.de | grep -i "ai/advisor\|ai/diagnose\|ai/chat"
```

Erwartete Ausgabe: Keine Ausgabe (Links nicht mehr vorhanden).

- [ ] **Step 4: RAM-Check nach Cleanup**

```bash
free -h && docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}" | sort
```

Erwartete Ausgabe: Mehr freier RAM als vorher. Ollama/OpenWebUI nicht mehr in Liste.

---

### Task 10: Commit

**Files:**
- Alle geänderten Dateien

- [ ] **Step 1: Commit erstellen**

```bash
cd /root/SF-1-Ultimate-
git add docker-compose.yml docker-compose.ki.yml docker-compose.staging.yml .env
git add apps/web-app/src/app/api/health/route.ts
git add apps/web-app/src/components/footer.tsx
git add apps/web-app/src/app/admin/ai/page.tsx
git add apps/web-app/src/app/status/page.tsx
git add docs/superpowers/specs/2026-04-29-ai-stack-removal-design.md
git add docs/superpowers/plans/2026-04-29-ai-stack-removal.md
git status
```

Prüfen: Nur erwartete Dateien staged. Keine `.env`-Secrets committed (`.env` ist in `.gitignore` — falls nicht: NICHT stagen).

- [ ] **Step 2: .gitignore prüfen**

```bash
grep "^\.env" /root/SF-1-Ultimate-/.gitignore
```

Falls `.env` nicht in `.gitignore`: `git reset HEAD .env` sofort ausführen.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove AI stack (Ollama, Open WebUI, RAG, AI-Service)

RAM freed: ~800MiB, prevents swap crisis on 7.8GiB server.
Frontend nav links removed, page files preserved for later reuse.
Ollama volume retained on disk."
```

---

## Rollback

Falls etwas schiefgeht:

```bash
# Alles rückgängig machen
git revert HEAD

# Container neu starten
docker compose up -d ai-service
docker compose -f docker-compose.ki.yml up -d ollama open-webui rag-service
```

Ollama-Modelle sind noch im Volume — kein erneuter Download nötig.

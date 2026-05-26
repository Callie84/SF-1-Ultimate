# KI-Stack Production Setup — Manual Configuration Guide

**Status:** Task 17–18 Manual Setup (Browser-based Configuration)
**Date:** 2026-04-09
**Services:** Open Web UI (localhost:8081), n8n (localhost:5679)

---

## 🎯 Overview

The KI-Stack requires manual configuration via browser UI after container startup. This guide covers:

1. **Task 17:** Open Web UI Admin User + Ollama Connection
2. **Task 18:** n8n Price-Alert Workflow Setup

Both services are running, but need configuration before production use.

---

## Task 17: Open Web UI Setup ✏️

### Step 1: Access Open Web UI

```
Browser: http://localhost:8081
```

Expected: Signup form (ENABLE_SIGNUP=true in docker-compose.ki.yml)

### Step 2: Create Admin User

1. **Form Fields:**
   - **Name:** Admin
   - **Email:** admin@sf1.local
   - **Password:** Choose secure password (min 8 chars)
   - **Confirm Password:** Repeat password

2. **Submit:** Click "Sign Up"

3. **Expected Result:** Dashboard with Ollama models listed

### Step 3: Verify Ollama Connection

1. Go to **Settings** (⚙️ icon, top right)
2. Look for **"Ollama"** or **"Model Configuration"**
3. Verify **Base URL:** `http://ollama:11434`
4. Click **"Test Connection"** (optional)
5. Models should show: `qwen2.5:7b`, `mxbai-embed-large`

### Step 4: Test Chat

1. Main chat interface
2. **Test Query:**
   ```
   "Was ist Cannabis Growing? Kurz und praktisch."
   ```
3. Expected response: ~30–120 seconds (CPU-only Ollama)
4. Model should be **qwen2.5:7b**

### Step 5: Disable Signup (Production Security)

After admin user is created:

1. **Stop KI stack:**
   ```bash
   docker-compose -f docker-compose.ki.yml down
   ```

2. **Edit `docker-compose.ki.yml`:**
   Change:
   ```yaml
   ENABLE_SIGNUP: "true"   # ← Change to false
   ```
   To:
   ```yaml
   ENABLE_SIGNUP: "false"  # ← Production mode
   ```

3. **Restart:**
   ```bash
   docker-compose -f docker-compose.ki.yml up -d
   ```

---

## Task 18: n8n Price-Alert Workflow ✏️

### Step 1: Access n8n

```
Browser: http://localhost:5679
```

Expected: Empty workflow editor

### Step 2: Create Workflow — "Price-Alert Check"

#### Node 1: Trigger — Cron (30min)

1. Click **"Add Node"** (left sidebar)
2. Search **"Cron"**
3. **Config:**
   - **Trigger Type:** Every X minutes
   - **Minutes:** 30

#### Node 2: Action — HTTP Request

1. Click **"+"** next to Cron
2. Add **"HTTP Request"**
3. **Config:**
   - **URL:** `http://sf1-price-service:3012/api/prices/latest`
   - **Method:** GET
   - **Authentication:** None

#### Node 3: Set — Extract Data

1. Add **"Set"** node
2. **Variable Name:** `current_prices`
3. **Variable Value:** `{{ $json.data }}`

#### Node 4: Condition — IF

1. Add **"IF"** node
2. **Condition:**
   ```
   {{ $node["HTTP Request"].json.data.length > 0 }}
   ```

#### Node 5: Notification — Slack or Email

**Option A: Slack (if configured)**

1. Add **"Slack"** node
2. **Message:**
   ```
   ⚠️ Preise aktualisiert:
   {{ $node["Set"].json.current_prices }}
   ```

**Option B: Send Email**

1. Add **"Send Email"** node
2. **To:** admin@sf1.local
3. **Subject:** Preis-Alert (30min Check)
4. **Body:**
   ```
   Aktuelle Preise:
   {{ JSON.stringify($node["Set"].json.current_prices) }}
   ```

### Step 3: Test Workflow

1. Button top right: **"Test Workflow"** or **"Execute Workflow"**
2. Should:
   - Call price-service API
   - Extract data
   - Check condition
   - Send notification (if configured)

### Step 4: Activate Workflow

1. Button top right: **"Active"** toggle → **ON**
2. Workflow now runs every 30 minutes

### Step 5: View Executions

1. **Menu:** "Executions" (left sidebar)
2. See all past workflow runs
3. Click run to see details

---

## Verification Checklist

### Open Web UI ✅
- [ ] Admin user created and can login
- [ ] Chat works: test query gets response (~30–120s)
- [ ] Ollama connection verified (`http://ollama:11434`)
- [ ] Models listed: qwen2.5:7b visible

### n8n ✅
- [ ] Workflow created: "Price-Alert Check"
- [ ] Cron trigger: 30 minutes
- [ ] HTTP Request: Returns data from price-service
- [ ] Condition: IF (data exists)
- [ ] Notification: Slack or Email configured
- [ ] Active: Toggle is ON
- [ ] Executions: At least 1 test run visible

---

## Troubleshooting

### Open Web UI

**Q: "Ollama connection refused"**
- URL must be: `http://ollama:11434` (container name, NOT localhost)
- Check: `docker ps | grep ollama`

**Q: "No models available"**
- Verify models pulled:
  ```bash
  docker exec sf1-ollama ollama list
  ```
- If missing:
  ```bash
  docker exec sf1-ollama ollama pull qwen2.5:7b
  docker exec sf1-ollama ollama pull mxbai-embed-large
  ```

**Q: Chat response takes > 2 minutes**
- Expected on CPU-only: 30–120s per request
- Ollama may crash on concurrent requests
- See: `/PERFORMANCE-REPORT-KI-STACK.md`

### n8n

**Q: "Workflow won't test"**
- Check logs:
  ```bash
  docker logs sf1-n8n | tail -30
  ```

**Q: "Can't reach price-service"**
- URL must be: `http://sf1-price-service:3012` (container DNS)
- Check price-service running:
  ```bash
  docker ps | grep price-service
  ```

---

## After Setup Complete

1. **Open Web UI:**
   - Set `ENABLE_SIGNUP: "false"` in docker-compose.ki.yml
   - Restart KI stack
   - ✅ Task 17 → COMPLETED

2. **n8n:**
   - Workflow is active and running every 30 minutes
   - ✅ Task 18 → COMPLETED

3. **Next Steps:**
   - Task 19: Load-Test RAG under realistic traffic
   - Task 20: Integrate KI-Stack into main docker-compose.yml
   - Task 21: Connect KI-Integration to ai-service API

---

**Status:** Ready for manual browser configuration
**Time Estimate:** ~20 minutes (5 min Open Web UI + 10 min n8n setup + 5 min verification)


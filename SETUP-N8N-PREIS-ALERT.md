# n8n Preis-Alert Workflow — Setup Guide

**n8n URL:** http://localhost:5679

## Einfacher PoC-Workflow: "Preis-Alert Check alle 30min"

### Step 1: n8n Web-UI öffnen
- Öffne http://localhost:5679
- Klick "Start" oder "New Workflow"

### Step 2: Workflow-Nodes hinzufügen

#### Node 1: **Trigger - Cron**
1. Linker Seitenbalken → "**Trigger**"
2. Suche "**Cron**"
3. Konfiguration:
   ```
   Trigger Type: Every X minutes
   Minutes: 30
   ```
4. Speichern

#### Node 2: **Action - HTTP Request**
1. Rechts neben Cron → "+" → "**Add Node**"
2. Suche "**HTTP Request**"
3. Konfiguration:
   ```
   URL: http://sf1-price-service:3012/api/prices/latest
   Method: GET
   Authentication: None (für PoC)
   ```
4. Speichern

#### Node 3: **Action - Set**
1. "+" → "**Set**"
2. Konfiguration (Set variable):
   ```
   name: "current_prices"
   value: {{ $json.data }}
   ```

#### Node 4: **Conditional - If**
1. "+" → "**IF**"
2. Konfiguration:
   ```
   Condition: {{ $node["HTTP Request"].json.data.length > 0 }}
   ```

#### Node 5: **Action - Slack (oder Email)**
Alternativ für Notification:
- "+" → "**Slack**" (wenn Slack verbunden)
- oder "**Send Email**"
3. Konfiguration:
   ```
   Message: "⚠️ Preise geändert: {{ $node["Set"].json.current_prices }}"
   ```

### Step 3: Workflow testen
1. Button oben: **"Test Workflow"** oder **"Execute Workflow"**
2. Sollte `/api/prices/latest` aufrufen und Antwort zeigen

### Step 4: Workflow aktivieren
1. Button oben rechts: **"Active"** toggle → ON
2. Workflow läuft jetzt alle 30 Minuten

---

## Alternative: Webhook-Trigger (für Tests)

```
POST http://localhost:5679/webhook/preis-alert
Content-Type: application/json

{
  "strain_id": "12345",
  "price_change": "+5%"
}
```

---

## Status

✅ Workflow-Struktur dokumentiert
⚠️  Manuelle Setup über Web-UI nötig (keine API-Automation ohne Secrets)

**Nach Setup:** Task #11 als completed markieren

# Content-Check: Landing Page Update + Wöchentlicher Telegram-Alarm

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Landing Page auf aktuelle DB-Zahlen korrigieren und ein wöchentliches Bash-Script einrichten, das Abweichungen automatisch per Telegram meldet.

**Architecture:** Einmalige manuelle Korrektur der hardcodierten Stats, danach ein Bash-Script (`content-check.sh`) das via `crontab` jeden Montag läuft, per `docker exec mongosh` die echten DB-Zahlen holt, diese mit Regex-Parsing der `.tsx`-Dateien vergleicht und bei >10% Abweichung eine Telegram-Nachricht schickt.

**Tech Stack:** Bash, mongosh (via `docker exec sf1-mongodb`), curl (Telegram API), crontab

**Echte DB-Werte (Stand 2026-04-24):**
- Seeds/Strain-Profile in `sf1_price.seeds`: **7.187**
- Preiseinträge in `sf1_price.prices`: **6.237**
- Aktive Seedbanks in `sf1_price.prices.distinct('seedbank')`: **19**

---

## Dateiübersicht

| Aktion | Datei |
|--------|-------|
| Modify | `apps/web-app/src/app/landing/page.tsx` (Stats-Array + Beschreibungstexte) |
| Modify | `apps/web-app/src/app/layout.tsx` (Meta-Tags) |
| Modify | `apps/web-app/src/app/about/page.tsx` (interner Name "SF-1 Ultimate" entfernen) |
| Create | `scripts/content-check.sh` |

---

## Task 1: Landing Page Stats korrigieren

**Files:**
- Modify: `apps/web-app/src/app/landing/page.tsx`

- [ ] **Step 1: Stats-Array updaten**

In `apps/web-app/src/app/landing/page.tsx`, Zeilen 87–90, Stats-Array ersetzen:

```tsx
// ALT:
{ value: '2800+', label: 'Cannabis-Samen' },
{ value: '183', label: 'Strain-Profile' },
{ value: '12', label: 'Seedbanks' },
{ value: '100%', label: 'Kostenlos' },

// NEU:
{ value: '7.000+', label: 'Cannabis-Samen' },
{ value: '7.000+', label: 'Strain-Profile' },
{ value: '19', label: 'Seedbanks' },
{ value: '100%', label: 'Kostenlos' },
```

- [ ] **Step 2: Hero-Subtext updaten**

In `apps/web-app/src/app/landing/page.tsx`, Hero-Abschnitt (ca. Zeile 70):

```tsx
// ALT:
Vergleiche Preise von 2800+ Samen aus 12 Seedbanks — kostenlos, ohne Anmeldung.

// NEU:
Vergleiche Preise von 7.000+ Samen aus 19 Seedbanks — kostenlos, ohne Anmeldung.
```

- [ ] **Step 3: Features-Abschnitt — Samen-Preisvergleich updaten**

In `apps/web-app/src/app/landing/page.tsx`, Feature-Cards (ca. Zeile 128):

```tsx
// ALT:
2800+ Samen aus 12 Seedbanks täglich aktualisiert. Finde den günstigsten Preis sofort.

// NEU:
7.000+ Samen aus 19 Seedbanks täglich aktualisiert. Finde den günstigsten Preis sofort.
```

- [ ] **Step 4: Strain-Datenbank Feature-Text updaten**

```tsx
// ALT:
183 Cannabis-Profile mit THC/CBD-Werten, Terpenprofil, Wirkungen und Aromen. Inkl. Preisvergleich.

// NEU:
7.000+ Cannabis-Profile mit THC/CBD-Werten, Terpenprofil, Wirkungen und Aromen. Inkl. Preisvergleich.
```

- [ ] **Step 5: Änderungen visuell prüfen**

```bash
grep -n "7\.000\+\|19\|2800\|183\|Seedbanks\|Samen" \
  /root/SF-1-Ultimate-/apps/web-app/src/app/landing/page.tsx
```

Erwartetes Ergebnis: `2800` und `183` kommen nicht mehr vor, `7.000+` und `19` sind vorhanden.

---

## Task 2: Meta-Tags in layout.tsx aktualisieren

**Files:**
- Modify: `apps/web-app/src/app/layout.tsx`

- [ ] **Step 1: Alle Meta-Descriptions updaten**

In `apps/web-app/src/app/layout.tsx`, alle Vorkommen von `2800+` und `12 Seedbanks` ersetzen:

```tsx
// ALT (description, openGraph.description, twitter.description):
'Vergleiche Preise von 2800+ Cannabis Samen aus 12 Seedbanks...'

// NEU (alle 3 Stellen):
'Vergleiche Preise von 7.000+ Cannabis Samen aus 19 Seedbanks...'
```

- [ ] **Step 2: Prüfen**

```bash
grep -n "2800\|12 Seedbank\|7\.000\|19 Seedbank" \
  /root/SF-1-Ultimate-/apps/web-app/src/app/layout.tsx
```

Erwartetes Ergebnis: `2800` und `12 Seedbank` nicht mehr vorhanden.

---

## Task 3: About-Seite bereinigen

**Files:**
- Modify: `apps/web-app/src/app/about/page.tsx`

- [ ] **Step 1: Internen Namen entfernen**

In `apps/web-app/src/app/about/page.tsx`, ca. Zeile 21:

```tsx
// ALT:
SeedfinderPro (SF-1 Ultimate) ist die umfassende Community-Plattform für Cannabis-Anbauer.

// NEU:
SeedFinderPro ist der deutsche Preisvergleich für Cannabis-Samen mit Strain-Datenbank, KI-Assistent und Growing-Community.
```

- [ ] **Step 2: Commit Phase 1**

```bash
cd /root/SF-1-Ultimate-
git add apps/web-app/src/app/landing/page.tsx \
        apps/web-app/src/app/layout.tsx \
        apps/web-app/src/app/about/page.tsx
git commit -m "fix(web-app): update landing page stats to current DB values (7000+ seeds, 19 seedbanks)"
```

---

## Task 4: content-check.sh Script erstellen

**Files:**
- Create: `scripts/content-check.sh`

- [ ] **Step 1: Script erstellen**

```bash
cat > /root/SF-1-Ultimate-/scripts/content-check.sh << 'EOF'
#!/bin/bash
# SF-1 Weekly Content Check
# Vergleicht hardcodierte Zahlen in .tsx-Dateien mit echten DB-Werten
# Sendet Telegram-Alarm bei Abweichung > 10%

set -euo pipefail

# Config
ENV_FILE="/root/SF-1-Ultimate-/.env"
WEB_APP="/root/SF-1-Ultimate-/apps/web-app/src"
LOG_PREFIX="[SF-1 Content-Check $(date '+%Y-%m-%d %H:%M')]"

# Aus .env laden
MONGO_PASSWORD=$(grep '^MONGO_PASSWORD=' "$ENV_FILE" | cut -d= -f2)
TELEGRAM_BOT_TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE" | cut -d= -f2)
TELEGRAM_CHAT_ID=$(grep '^TELEGRAM_CHAT_ID=' "$ENV_FILE" | cut -d= -f2)
MONGO_URI="mongodb://sf1_admin:${MONGO_PASSWORD}@localhost:27017/admin?authSource=admin"

echo "$LOG_PREFIX Start"

# ─── Telegram-Funktion ───────────────────────────────────────────────────────
send_telegram() {
  local msg="$1"
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=${msg}" \
    -d "parse_mode=HTML" > /dev/null
}

# ─── Abweichungs-Check ───────────────────────────────────────────────────────
check_deviation() {
  local label="$1"
  local displayed="$2"
  local actual="$3"
  local file="$4"

  # Zahlen normalisieren (7.000+ → 7000, 7000+ → 7000)
  displayed_num=$(echo "$displayed" | tr -d '.+,')
  actual_num=$(echo "$actual" | tr -d '.+,')

  if [ "$actual_num" -eq 0 ]; then
    echo "$LOG_PREFIX SKIP $label (DB-Wert 0, kein Check)"
    return
  fi

  # Abweichung in % berechnen
  diff=$(( actual_num - displayed_num ))
  diff_abs=${diff#-}
  pct=$(( diff_abs * 100 / actual_num ))

  echo "$LOG_PREFIX $label: angezeigt=$displayed_num, DB=$actual_num, Abweichung=${pct}%"

  if [ "$pct" -gt 10 ]; then
    MSG="⚠️ <b>SF-1 Content-Check — Abweichung erkannt</b>
$(date '+%Y-%m-%d %H:%M')

<b>$label</b>
Landing Page zeigt: $displayed
DB-Realwert: $actual
Abweichung: ${pct}%

→ <code>$file</code>

Bitte Datei manuell aktualisieren."
    send_telegram "$MSG"
    echo "$LOG_PREFIX ALARM: $label (${pct}% Abweichung) → Telegram gesendet"
  fi
}

# ─── DB-Werte abfragen ────────────────────────────────────────────────────────
SEEDS_ACTUAL=$(docker exec sf1-mongodb mongosh "$MONGO_URI" --quiet \
  --eval "print(db.getSiblingDB('sf1_price').seeds.countDocuments())" 2>/dev/null | tail -1)

SEEDBANKS_ACTUAL=$(docker exec sf1-mongodb mongosh "$MONGO_URI" --quiet \
  --eval "print(db.getSiblingDB('sf1_price').prices.distinct('seedbank').length)" 2>/dev/null | tail -1)

PRICES_ACTUAL=$(docker exec sf1-mongodb mongosh "$MONGO_URI" --quiet \
  --eval "print(db.getSiblingDB('sf1_price').prices.countDocuments())" 2>/dev/null | tail -1)

echo "$LOG_PREFIX DB: seeds=$SEEDS_ACTUAL, seedbanks=$SEEDBANKS_ACTUAL, prices=$PRICES_ACTUAL"

# ─── Landing Page parsen ──────────────────────────────────────────────────────
LANDING="$WEB_APP/app/landing/page.tsx"
LAYOUT="$WEB_APP/app/layout.tsx"

# Samen-Wert (erste Zeile des Stats-Arrays)
SEEDS_DISPLAYED=$(grep -oP "value: '\K[0-9][^']+" "$LANDING" | head -1)
# Seedbanks-Wert (dritte Zeile des Stats-Arrays)
SEEDBANKS_DISPLAYED=$(grep -oP "value: '\K[0-9][^']+" "$LANDING" | sed -n '3p')

# ─── Vergleiche durchführen ───────────────────────────────────────────────────
check_deviation "Cannabis-Samen" \
  "$SEEDS_DISPLAYED" "$SEEDS_ACTUAL" \
  "apps/web-app/src/app/landing/page.tsx"

check_deviation "Seedbanks" \
  "$SEEDBANKS_DISPLAYED" "$SEEDBANKS_ACTUAL" \
  "apps/web-app/src/app/landing/page.tsx"

# Meta-Description in layout.tsx
META_SEEDS=$(grep -oP '\d[\d.]+\+ Cannabis Samen' "$LAYOUT" | head -1 | grep -oP '\d[\d.]+\+')

if [ -n "$META_SEEDS" ]; then
  check_deviation "Meta-Description Samen" \
    "$META_SEEDS" "$SEEDS_ACTUAL" \
    "apps/web-app/src/app/layout.tsx"
fi

echo "$LOG_PREFIX Fertig"
EOF
chmod +x /root/SF-1-Ultimate-/scripts/content-check.sh
```

- [ ] **Step 2: Script lesbar prüfen**

```bash
cat /root/SF-1-Ultimate-/scripts/content-check.sh | head -20
```

Erwartetes Ergebnis: Shebang `#!/bin/bash` und Kommentar-Block sichtbar.

---

## Task 5: Script testen

- [ ] **Step 1: Script manuell ausführen**

```bash
bash /root/SF-1-Ultimate-/scripts/content-check.sh
```

Erwartetes Log-Output (kein Alarm da Stats gerade korrigiert):
```
[SF-1 Content-Check 2026-04-24 ...] Start
[SF-1 Content-Check 2026-04-24 ...] DB: seeds=7187, seedbanks=19, prices=6237
[SF-1 Content-Check 2026-04-24 ...] Cannabis-Samen: angezeigt=7000, DB=7187, Abweichung=2%
[SF-1 Content-Check 2026-04-24 ...] Seedbanks: angezeigt=19, DB=19, Abweichung=0%
[SF-1 Content-Check 2026-04-24 ...] Fertig
```

- [ ] **Step 2: Alarm testen — temporärer Test-Wert**

Kurz einen falschen Wert in landing/page.tsx setzen, Script laufen lassen, dann rückgängig:

```bash
# Testweise Seedbank-Zahl auf 5 setzen (löst Alarm aus)
sed -i "s/{ value: '19', label: 'Seedbanks' }/{ value: '5', label: 'Seedbanks' }/" \
  /root/SF-1-Ultimate-/apps/web-app/src/app/landing/page.tsx

bash /root/SF-1-Ultimate-/scripts/content-check.sh
# → Telegram-Nachricht sollte ankommen

# Rückgängig
sed -i "s/{ value: '5', label: 'Seedbanks' }/{ value: '19', label: 'Seedbanks' }/" \
  /root/SF-1-Ultimate-/apps/web-app/src/app/landing/page.tsx
```

- [ ] **Step 3: Telegram-Nachricht auf Handy prüfen**

Erwartete Nachricht:
```
⚠️ SF-1 Content-Check — Abweichung erkannt
2026-04-24 ...

Seedbanks
Landing Page zeigt: 5
DB-Realwert: 19
Abweichung: 73%

→ apps/web-app/src/app/landing/page.tsx

Bitte Datei manuell aktualisieren.
```

---

## Task 6: Cron-Job einrichten

- [ ] **Step 1: Crontab-Eintrag hinzufügen**

```bash
(crontab -l 2>/dev/null; echo "0 9 * * 1 bash /root/SF-1-Ultimate-/scripts/content-check.sh >> /var/log/sf1-content-check.log 2>&1") | crontab -
```

- [ ] **Step 2: Cron-Eintrag prüfen**

```bash
crontab -l | grep content-check
```

Erwartetes Ergebnis:
```
0 9 * * 1 bash /root/SF-1-Ultimate-/scripts/content-check.sh >> /var/log/sf1-content-check.log 2>&1
```

- [ ] **Step 3: Log-Datei anlegen**

```bash
touch /var/log/sf1-content-check.log
chmod 644 /var/log/sf1-content-check.log
```

---

## Task 7: Commit + Abschluss

- [ ] **Step 1: Finalen Commit erstellen**

```bash
cd /root/SF-1-Ultimate-
git add scripts/content-check.sh
git commit -m "feat(scripts): add weekly content-check.sh with Telegram alarm (cron Mon 09:00)"
```

- [ ] **Step 2: Abschluss-Prüfung**

```bash
# Cron läuft
crontab -l | grep content-check

# Script ist ausführbar
ls -la /root/SF-1-Ultimate-/scripts/content-check.sh

# Landing Page zeigt aktuelle Zahlen
grep -A5 "Stats-Array\|value.*7\.000\|value.*19" \
  /root/SF-1-Ultimate-/apps/web-app/src/app/landing/page.tsx | head -10
```

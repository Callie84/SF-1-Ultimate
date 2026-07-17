# Plan 02 — notification-service (apps/notification-service)

> Kein Frontend-Rebuild nötig. Reiner Backend-Service (tsx/typescript).
> Deploy-Reihenfolge einhalten. Kein `--force`.

## Alerts

| Paket | jetzt → Ziel | Sev | Art |
|---|---|---|---|
| **websocket-driver** | 0.7.4 → **0.7.5** | **critical** (GHSA-xv26-6w52-cph6 / CVE-2026-54466) **+ med** (GHSA-mp7j-qc5w-4988 / CVE-2026-54490) | transitiv |
| uuid | <11.1.1 → 11.1.1 | med (GHSA-w5hq-g745-h8pq) | transitiv |

## Kontext websocket-driver (WICHTIG — Label „critical", realer Pfad tot)

Kette: `firebase-admin` (direkt in package.json) → `@firebase/database` → `faye-websocket@0.11.4` → `websocket-driver@0.7.4`.

**Verifiziert in dieser Analyse:**
- `firebase-admin` steht in `package.json`, wird aber **nirgends in `src/` importiert** (`grep firebase src/` = 0 Treffer). Push läuft über `web-push`/VAPID (`push.service.ts`).
- Aktiver Realtime-Pfad = **socket.io → ws@8.21.x** (`websocket.service.ts`), NICHT websocket-driver.
- Kein `admin.database()` / `databaseURL` im Code → RTDB-Websocket-Transport (der websocket-driver zieht) wird nie aktiviert.

→ **Reales Exploit-Risiko ≈ null.** Trotzdem patchen (Label + Compliance). Ein Bump 0.7.4→0.7.5 erledigt critical **und** medium.

## Entscheidung vorab: firebase-admin behalten oder raus?

```bash
cd apps/notification-service
grep -rn "firebase" src/    # bestätigen: wirklich 0 Treffer?
```
- **Wirklich ungenutzt** → firebase-admin entfernen ist die sauberste Lösung: killt websocket-driver (crit+med) **an der Wurzel**, verkleinert das Image. **Erst mit Kalle abklären** (ob FCM-Push perspektivisch geplant ist).
- **Doch geplant/genutzt** → nur websocket-driver hochziehen (siehe unten).

## Variante A — firebase-admin entfernen (falls freigegeben)
```bash
cd apps/notification-service
cp package.json package.json.bak && cp package-lock.json package-lock.json.bak
npm remove firebase-admin @types/web-push   # @types/web-push nur falls auch ungenutzt — prüfen!
npm audit
npm run build 2>/dev/null || npx tsc --noEmit   # muss grün sein
```

## Variante B — nur Bump (firebase-admin bleibt)
```bash
cd apps/notification-service
cp package.json package.json.bak && cp package-lock.json package-lock.json.bak
npm update websocket-driver uuid   # falls Range es nicht hergibt -> overrides:
# "overrides": { "websocket-driver": "0.7.5", "uuid": "11.1.1" }
npm install
npm audit
npx tsc --noEmit
```

## Verifikation
- `npx tsc --noEmit` grün.
- Service lokal starten, WebSocket-Notification-Flow smoke-testen (`notification:new` via socket.io).
- `npm audit`: websocket-driver + uuid weg.

## Deploy
1. Lenovo: tsc grün + Smoke-Test.
2. GitHub: commit (package.json/lock + DOKUMENTATION.md), push, CI grün.
3. Server: nur notification-service-Container neu bauen/deployen (Regel 10 — nicht alle Services).

## Rollback
`.bak` zurück, `npm install`, redeploy.

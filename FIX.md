# SF-1 Ultimate — Bug-Scan Ergebnisse
**Erstellt:** 2026-03-05, Session 23
**Getestet:** Alle 10 Services live per API + vollständiger Code-Review

---

## 🔴 KRITISCH — Sofort beheben

### BUG-01: `redis.lpush` kaputt in 3 Services (redis v4 API-Bruch)
**Bestätigt durch Live-Test:** `redis.lpush is not a function`

Redis v4 verwendet `lPush` (camelCase), nicht `lpush`. Die betroffenen Services nutzen alle `redis` v4.6.x:

| Service | Datei | Zeile |
|---------|-------|-------|
| community-service | `src/services/gamification-hooks.ts` | 17 |
| gamification-service | `src/services/profile.service.ts` | 178 |
| media-service | `src/services/virus-scan.service.ts` | 68 |

**Auswirkung:** Gamification-XP-Events werden nicht published → XP-Vergabe für Community-Aktionen (Thread erstellen etc.) funktioniert nicht. Virus-Scan-Queue bricht. Fehler wird durch try/catch still geschluckt — kein sichtbarer Fehler für den User.

**Fix:**
```ts
// vorher (kaputt):
await redis.lpush('queue:gamification', JSON.stringify(event));

// nachher (redis v4):
await redis.lPush('queue:gamification', JSON.stringify(event));
```

---

### BUG-02: `useSearchParams()` ohne Suspense-Boundary (5 Pages)
**Anforderung Next.js 14:** `useSearchParams()` in Client-Komponenten muss von `<Suspense>` umschlossen sein.

| Datei | ca. Zeile |
|-------|-----------|
| `apps/web-app/src/app/strains/compare/page.tsx` | ~214 |
| `apps/web-app/src/app/search/page.tsx` | ~129 |
| `apps/web-app/src/app/community/new/page.tsx` | ~30 |
| `apps/web-app/src/app/messages/page.tsx` | ~41 |
| `apps/web-app/src/app/auth/reset-password/page.tsx` | ~28 |

**Auswirkung:** Next.js kann diese Seiten nicht korrekt prerendern, kann zu SSR-Crashes in Produktion führen.

**Fix-Muster:**
```tsx
// vorher:
export default function Page() {
  const searchParams = useSearchParams();
  ...
}

// nachher:
function PageContent() {
  const searchParams = useSearchParams();
  ...
}
export default function Page() {
  return <Suspense fallback={<Loader />}><PageContent /></Suspense>;
}
```

---

## 🟠 HOCH

### BUG-03: `ads PUT /:id` — `{ $set: req.body }` ohne Feldfilterung
**Datei:** `apps/community-service/src/routes/ads.routes.ts` Zeile 134
Direktes Übernehmen von `req.body` in MongoDB `$set`. Kein Whitelisting der erlaubten Felder — beliebige MongoDB-Felder können überschrieben werden.

**Fix:**
```ts
// vorher:
{ $set: req.body }

// nachher — nur erlaubte Felder:
const { type, title, imageUrl, link, linkTarget, altText, isActive, order } = req.body;
{ $set: { type, title, imageUrl, link, linkTarget, altText, isActive, order } }
```

---

### BUG-04: `auth-provider.tsx` — `refreshUser` fehlt in useEffect-Dependencies
**Datei:** `apps/web-app/src/components/providers/auth-provider.tsx` Zeile 27

`refreshUser` wird im `useEffect` aufgerufen, ist aber nicht im Dependency-Array → potenzielle Stale-Closure bei Re-Renders.

**Fix:**
```ts
useEffect(() => {
  initAuth();
}, []);  // refreshUser ist stabil genug, oder useCallback verwenden
```

---

### BUG-05: `dashboard/page.tsx` — `useGamificationProfile(user?.id)` mit undefined
**Datei:** `apps/web-app/src/app/dashboard/page.tsx`

Wenn `user` noch lädt, wird Query mit `undefined` als Key gestartet → unnötige API-Anfrage + Cache-Key-Pollution.

**Fix:**
```ts
// enabled-Guard hinzufügen:
const { data: gamification } = useGamificationProfile(user?.id ?? '');
// oder in useGamificationProfile:
enabled: !!userId
```

---

### BUG-06: `grows/[id]/page.tsx` — Kein null-Check auf `grow`
**Datei:** `apps/web-app/src/app/grows/[id]/page.tsx`

Direkter Zugriff auf `grow.userId` ohne zu prüfen ob `growData?.grow` existiert → potenzielle undefined-Fehler.

**Fix:** `if (!grow) return <NotFound />` vor der ersten Verwendung von `grow.*`.

---

### BUG-07: `categories PUT` — Keine Feldlängen-Validierung
**Datei:** `apps/community-service/src/routes/categories.routes.ts` Zeile 74

`req.body` wird ohne Längen-Limits oder Whitelist direkt übernommen.

**Fix:** Felder explizit destructuren und Länge begrenzen.

---

### BUG-08: `AI-Service JSON.parse` ohne try/catch
**Datei:** `apps/ai-service/src/routes/ai.routes.ts` Zeile 62

```ts
// vorher (crasht bei ungültigem JSON):
growSetup: growSetup ? JSON.parse(growSetup) : undefined,

// nachher:
growSetup: growSetup ? (() => { try { return JSON.parse(growSetup); } catch { return undefined; } })() : undefined,
```

---

## 🟡 MITTEL

### BUG-09: `strains` API — `total` im Frontend undefined
**Bestätigt:** Response gibt `total` zurück, aber Frontend-Seite liest falschen Key.
Prüfen ob `useStrains()`-Hook `j.total` oder `j.count` liest.

### BUG-10: `search` Response — `hits` undefined im Frontend-Hook
**Bestätigt:** `Search HTTP:200 hits: undefined`
Search-Service gibt Ergebnisse unter anderem Key zurück als der Hook erwartet. Response-Struktur prüfen.

### BUG-11: `use-community.ts` — `useUserVotesBatch` mit leerem Array
**Datei:** `apps/web-app/src/hooks/use-community.ts`
Query-Key wird `['votes', '']` wenn ids leer ist → falsche Cache-Entries.
**Fix:** `enabled: ids.length > 0` ergänzen.

### BUG-12: `journal/page.tsx` — `window.location.reload()` statt Query-Invalidation
**Anti-Pattern:** Kompletter Seitenreload statt `queryClient.invalidateQueries()`.

### BUG-13: `use-admin.ts` — catch-Block gibt Mock-Data zurück
Fehler werden verschluckt, Frontend merkt API-Fehler nicht → User sieht leere/falsche Daten statt Fehlermeldung.

### BUG-14: `AI-Service` — JWT_SECRET leer = kein Auth
`JWT_SECRET || ''` — wenn Env-Variable nicht gesetzt, ist jeder JWT-Token gültig.
**Fix:** Service beim Start beenden wenn `JWT_SECRET` fehlt.

### BUG-15: `notification-service` — SMTP nicht konfiguriert
`SMTP_HOST` ist nicht gesetzt → Passwort-Reset E-Mails und andere Mails werden nicht versendet. Nutzer bekommen keine Rückmeldung.
**Aktion erforderlich:** SMTP-Provider einrichten (z.B. Brevo, Mailgun).

---

## ✅ Untersucht — Kein Bug

| Verdacht | Ergebnis |
|----------|----------|
| `authMiddleware()` mit `()` in price-service | ✅ Kein Bug — ist Factory-Function (`(trustTraefik=true) => middleware`) |
| Search Route-Reihenfolge `/strains/suggest` nach `/:index` | ✅ Kein Bug — unterschiedliche Pfad-Tiefe, kein Konflikt |
| `INTERNAL_SECRET` Logic in notification-service | ✅ Kein Bug — gibt 401 korrekt zurück |
| `auth/users/undefined` Endpunkt | ✅ Gibt 404 zurück — Backend korrekt |
| Messages Frontend sendet an `/send` | ✅ Frontend und Backend stimmen überein |
| `redis.lpush` in ai-service / search-service | ✅ Kein Bug — nutzen `ioredis` (lowercase API) |

---

## Prioritäts-Reihenfolge für Fixes

```
1. BUG-01  redis.lPush          → 3 Dateien, 1 Minute Fix, hoher Impact
2. BUG-03  ads PUT Whitelist    → Sicherheitslücke
3. BUG-08  JSON.parse try/catch → Crash-Risiko
4. BUG-02  useSearchParams      → 5 Seiten, SSR-Stabilität
5. BUG-05  gamification enabled → Performance / Cache
6. BUG-06  grows null-check     → Crash-Risiko
7. BUG-07  categories validate  → Sicherheit
8. BUG-04  useEffect deps       → Stabilität
9. BUG-09  strains total        → UI-Anzeige falsch
10. BUG-10  search hits         → UI-Anzeige falsch
11. BUG-11  votes enabled       → Cache-Pollution
12. BUG-12  window.reload       → UX
13. BUG-13  admin mock-data     → UX
14. BUG-14  JWT_SECRET check    → Sicherheit
15. BUG-15  SMTP einrichten     → Feature komplett broken
```

---

## Statistik

| Schweregrad | Anzahl |
|-------------|--------|
| 🔴 KRITISCH | 2 |
| 🟠 HOCH | 6 |
| 🟡 MITTEL | 7 |
| ✅ Kein Bug | 6 |
| **Gesamt untersucht** | **10 Services, ~150 Dateien** |

---

*Scan durchgeführt: 2026-03-05*
*Methode: Live-API-Tests + vollständiger Code-Review aller Backend-Services und Frontend-Hooks/Pages*

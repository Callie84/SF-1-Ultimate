# 🔧 SF-1 ULTIMATE - MASTER TEST & FIX PLAN
**Stand:** 01.11.2025 | **Version:** 10.0 | **Status:** Testing Phase

---

## 🎯 ZIEL

Alle Features systematisch testen, Bugs finden und fixen.
**Ziel:** Projekt zu 100% stabil und produktionsreif machen.

---

## 📊 TEST-KATEGORIEN

1. ✅ **Setup & Installation** (Phase 1)
2. ✅ **Backend Services** (Phase 2)
3. ✅ **Frontend Pages** (Phase 3)
4. ✅ **Components & UI** (Phase 4)
5. ✅ **Integration & API** (Phase 5)
6. ✅ **Design & UX** (Phase 6)
7. ✅ **Performance** (Phase 7)
8. ✅ **Security** (Phase 8)

---

# PHASE 1: SETUP & INSTALLATION

## 1.1 Dependencies Check

### Test:
```powershell
cd C:\--Projekte--\sf1-ultimate\apps\web-app
npm install
```

### Erwartetes Ergebnis:
- ✅ Keine Errors
- ✅ Alle Packages installiert
- ✅ `node_modules` Ordner erstellt

### Mögliche Probleme:
- ❌ `react-markdown` fehlt
- ❌ `date-fns` Versionskonflikt
- ❌ Node-Version zu alt

### Fix:
```powershell
# Falls Errors:
npm install --legacy-peer-deps

# Falls react-markdown fehlt:
npm install react-markdown@^9.0.1

# Node-Version prüfen:
node --version  # Min: v18.0.0
```

---

## 1.2 TypeScript Compilation

### Test:
```powershell
npm run type-check
```

### Erwartetes Ergebnis:
- ✅ Keine Type-Errors
- ✅ Build erfolgreich

### Mögliche Probleme:
- ❌ Missing types für `react-markdown`
- ❌ Type-Errors in Calculator-Komponente
- ❌ Import-Errors

### Fix:
```powershell
# Types installieren:
npm install --save-dev @types/react-markdown

# Falls Errors in Komponenten:
# → Siehe detailed logs, einzeln fixen
```

---

## 1.3 Development Server Start

### Test:
```powershell
npm run dev
```

### Erwartetes Ergebnis:
- ✅ Server startet auf Port 3000
- ✅ Keine Compilation-Errors
- ✅ Hot-Reload funktioniert

### Mögliche Probleme:
- ❌ Port 3000 belegt
- ❌ Environment-Variables fehlen
- ❌ Module-Resolution-Errors

### Fix:
```powershell
# Port ändern:
npm run dev -- -p 3001

# .env.local erstellen:
cp .env.local.example .env.local
# → Fülle NEXT_PUBLIC_API_URL ein
```

---

# PHASE 2: BACKEND SERVICES

## 2.1 Backend Status prüfen

### Test (manuell):
1. Öffne Terminal
2. Prüfe welche Services laufen:
   ```powershell
   # Für jeden Service:
   cd C:\--Projekte--\sf1-ultimate\apps\[service-name]
   npm run dev
   ```

### Service-Liste:
- [ ] API Gateway (Port 80)
- [ ] Auth Service (Port 3001)
- [ ] Price Service (Port 3002)
- [ ] Journal Service (Port 3003)
- [ ] Tools Service (Port 3004)
- [ ] Community Service (Port 3005)
- [ ] Notification Service (Port 3006)
- [ ] Search Service (Port 3007)
- [ ] Media Service (Port 3008)
- [ ] Gamification Service (Port 3009)
- [ ] AI Service (Port 3010)

### Erwartetes Ergebnis:
- ✅ Alle Services starten
- ✅ Keine Port-Konflikte
- ✅ MongoDB/PostgreSQL/Redis verbunden

### Mögliche Probleme:
- ❌ Services nicht gestartet
- ❌ Datenbank-Connection fehlt
- ❌ Environment-Variables fehlen

### Fix:
```powershell
# Services einzeln starten und Logs prüfen
# Fehlende ENV-Vars aus README holen
# MongoDB/PostgreSQL/Redis starten
```

---

## 2.2 API Endpoints testen

### Test (mit Postman/Insomnia):
```http
# Auth
POST http://localhost:3001/api/auth/register
POST http://localhost:3001/api/auth/login

# Search
GET http://localhost:3007/api/search?q=test

# AI
POST http://localhost:3010/api/ai/chat

# Tools
POST http://localhost:3004/api/tools/calculate/vpd

# Prices
GET http://localhost:3002/api/prices/search?q=northern
```

### Erwartetes Ergebnis:
- ✅ 200/201 Status Codes
- ✅ Korrekte Response-Struktur
- ✅ Keine 500 Errors

### Mögliche Probleme:
- ❌ CORS-Errors
- ❌ 500 Internal Server Errors
- ❌ Missing Routes

### Fix:
- CORS in API Gateway konfigurieren
- Fehlende Routes implementieren
- Error-Handling verbessern

---

# PHASE 3: FRONTEND PAGES

## 3.1 Landing Page

### Test:
1. Öffne http://localhost:3000
2. Prüfe:
   - [ ] Page lädt ohne Errors
   - [ ] Hero-Section angezeigt
   - [ ] Navigation funktioniert
   - [ ] Buttons funktionieren
   - [ ] Links zu /auth/login funktionieren

### Mögliche Probleme:
- ❌ 404 Error
- ❌ Hydration-Errors
- ❌ Missing Components

### Fix:
```tsx
// Falls Landing Page fehlt:
// → src/app/page.tsx erstellen oder
// → Redirect zu /landing
```

---

## 3.2 Authentication Pages

### Test Login (/auth/login):
1. Öffne http://localhost:3000/auth/login
2. Prüfe:
   - [ ] Form wird angezeigt
   - [ ] Email/Password Inputs funktionieren
   - [ ] Submit-Button funktioniert
   - [ ] Validation funktioniert
   - [ ] Error-Messages angezeigt
   - [ ] Redirect nach Login

### Test Register (/auth/register):
1. Öffne http://localhost:3000/auth/register
2. Prüfe:
   - [ ] Form wird angezeigt
   - [ ] Alle Inputs funktionieren
   - [ ] Password-Strength angezeigt
   - [ ] Terms-Checkbox funktioniert
   - [ ] Submit funktioniert

### Mögliche Probleme:
- ❌ Auth-Provider nicht initialisiert
- ❌ API-Calls schlagen fehl
- ❌ Redirect loop

### Fix:
```tsx
// Auth-Provider prüfen:
// src/components/providers/auth-provider.tsx
// API-URL in .env.local setzen
```

---

## 3.3 Dashboard

### Test (/dashboard):
1. Einloggen
2. Öffne http://localhost:3000/dashboard
3. Prüfe:
   - [ ] Dashboard lädt
   - [ ] Stats werden angezeigt
   - [ ] Charts funktionieren (recharts)
   - [ ] Navigation funktioniert
   - [ ] Quick-Actions funktionieren

### Mögliche Probleme:
- ❌ Keine Daten geladen
- ❌ Chart-Library Error
- ❌ Protected Route nicht geschützt

### Fix:
- API-Integration prüfen
- recharts Dependencies checken
- Auth-Middleware implementieren

---

## 3.4 Grow Journal

### Test (/journal):
1. Öffne http://localhost:3000/journal
2. Prüfe:
   - [ ] Journal-Liste lädt
   - [ ] "New Journal" Button funktioniert
   - [ ] Journal-Cards angezeigt
   - [ ] Click auf Card → Detail-View

### Test New Journal (/journal/new):
1. Öffne http://localhost:3000/journal/new
2. Prüfe:
   - [ ] Form wird angezeigt
   - [ ] Alle Inputs funktionieren
   - [ ] Strain-Selection funktioniert
   - [ ] Image-Upload funktioniert
   - [ ] Submit funktioniert
   - [ ] Redirect nach Create

### Test Journal Detail (/journal/[id]):
1. Click auf ein Journal
2. Prüfe:
   - [ ] Detail-View lädt
   - [ ] Alle Infos angezeigt
   - [ ] Timeline funktioniert
   - [ ] Edit-Button funktioniert
   - [ ] Delete funktioniert

### Mögliche Probleme:
- ❌ useJournal Hook fehlt
- ❌ API-Calls fehlerhaft
- ❌ Image-Upload bricht ab

### Fix:
```tsx
// Hook implementieren/fixen:
// src/hooks/use-journal.ts
```

---

## 3.5 Community Forum

### Test Forum (/community):
1. Öffne http://localhost:3000/community
2. Prüfe:
   - [ ] Thread-Liste lädt
   - [ ] Categories funktionieren
   - [ ] "New Thread" Button
   - [ ] Voting funktioniert
   - [ ] Search funktioniert

### Test Thread Detail (/community/thread/[id]):
1. Click auf Thread
2. Prüfe:
   - [ ] Thread lädt
   - [ ] Posts angezeigt
   - [ ] Reply funktioniert
   - [ ] Voting funktioniert
   - [ ] Edit/Delete funktioniert

### Mögliche Probleme:
- ❌ Voting-Component fehlt
- ❌ useCommunity Hook fehlerhaft
- ❌ Pagination fehlt

### Fix:
```tsx
// Voting Component:
// src/components/community/voting.tsx prüfen
```

---

## 3.6 Search

### Test (/search):
1. Öffne http://localhost:3000/search?q=test
2. Prüfe:
   - [ ] Results werden geladen
   - [ ] Filter-Sidebar funktioniert
   - [ ] Sort-Options funktionieren
   - [ ] Pagination funktioniert
   - [ ] Result-Cards klickbar

### Test Search Bar (Header):
1. Tippe in Search Bar
2. Prüfe:
   - [ ] Autocomplete öffnet
   - [ ] Suggestions laden
   - [ ] Recent Searches angezeigt
   - [ ] Enter → Search Page
   - [ ] Keyboard-Navigation funktioniert

### Mögliche Probleme:
- ❌ Debounce zu kurz/lang
- ❌ API antwortet nicht
- ❌ useDebounce Hook fehlt

### Fix:
```tsx
// useDebounce prüfen:
// src/hooks/use-debounce.ts
// Delay auf 300ms setzen
```

---

## 3.7 AI Features

### Test AI Chat (/ai/chat):
1. Öffne http://localhost:3000/ai/chat
2. Prüfe:
   - [ ] Chat-Interface lädt
   - [ ] Message senden funktioniert
   - [ ] AI antwortet
   - [ ] Markdown wird gerendert
   - [ ] Typing-Indicator angezeigt
   - [ ] Sessions funktionieren

### Test Plant Diagnosis (/ai/diagnose):
1. Öffne http://localhost:3000/ai/diagnose
2. Prüfe:
   - [ ] Upload-Zone funktioniert
   - [ ] Drag & Drop funktioniert
   - [ ] Multi-Image Upload
   - [ ] Text-Description funktioniert
   - [ ] Submit → Analysis
   - [ ] Results angezeigt

### Test Grow Advisor (/ai/advisor):
1. Öffne http://localhost:3000/ai/advisor
2. Prüfe:
   - [ ] Multi-Step Form funktioniert
   - [ ] Alle Selections funktionieren
   - [ ] Submit → Recommendations
   - [ ] Results angezeigt

### Mögliche Probleme:
- ❌ react-markdown nicht installiert
- ❌ AI-API antwortet nicht
- ❌ Image-Upload zu groß

### Fix:
```powershell
npm install react-markdown@^9.0.1

# API-Keys prüfen:
# OPENAI_API_KEY in Backend .env
```

---

## 3.8 Cannabis-Rechner

### Test für JEDEN Calculator:

**VPD (/tools/vpd):**
- [ ] Page lädt
- [ ] Inputs funktionieren
- [ ] Calculate → Result
- [ ] Status-Color korrekt
- [ ] Info-Section angezeigt

**EC (/tools/ec):**
- [ ] Page lädt
- [ ] PPM/Scale Inputs
- [ ] Berechnung korrekt
- [ ] Status passt

**DLI (/tools/dli):**
- [ ] Page lädt
- [ ] PPFD/Hours Inputs
- [ ] Formel korrekt
- [ ] Status passt

**PPFD (/tools/ppfd):**
- [ ] Page lädt
- [ ] Watt/Type/Area Inputs
- [ ] Berechnung realistisch
- [ ] Status passt

**Power (/tools/power):**
- [ ] Page lädt
- [ ] Alle Inputs funktionieren
- [ ] kWh-Berechnung korrekt
- [ ] Kosten korrekt

**CO₂ (/tools/co2):**
- [ ] Page lädt
- [ ] Raum-Inputs funktionieren
- [ ] CO₂-Bedarf realistisch
- [ ] Status passt

### Mögliche Probleme:
- ❌ Calculator-Component nicht gefunden
- ❌ Formeln falsch
- ❌ Type-Errors

### Fix:
```tsx
// Calculator Component prüfen:
// src/components/tools/calculator.tsx
```

---

## 3.9 Price Comparison

### Test (/prices):
1. Öffne http://localhost:3000/prices
2. Prüfe:
   - [ ] Search-Input funktioniert
   - [ ] Submit → Results
   - [ ] Price-Cards angezeigt
   - [ ] Sort funktioniert
   - [ ] Links zu Seedbanks funktionieren

### Mögliche Probleme:
- ❌ Price-API antwortet nicht
- ❌ Keine Daten gefunden
- ❌ External Links nicht klickbar

---

# PHASE 4: COMPONENTS & UI

## 4.1 Header

### Test:
1. Auf jeder Page:
2. Prüfe:
   - [ ] Header immer sichtbar
   - [ ] Search Bar funktioniert
   - [ ] Theme-Toggle funktioniert
   - [ ] Notifications-Dropdown funktioniert
   - [ ] User-Menu funktioniert

### Mögliche Probleme:
- ❌ Header nicht sticky
- ❌ Notifications laden nicht
- ❌ Theme ändert sich nicht

### Fix:
```tsx
// Header prüfen:
// src/components/layout/header.tsx

// Sticky Header:
<header className="sticky top-0 z-50 ...">
```

---

## 4.2 Sidebar/Navigation

### Test:
1. Auf Dashboard/Journal Pages:
2. Prüfe:
   - [ ] Sidebar angezeigt
   - [ ] Navigation-Links funktionieren
   - [ ] Active-State korrekt
   - [ ] Icons angezeigt

### Mögliche Probleme:
- ❌ Sidebar nicht responsive
- ❌ Active-Link nicht highlighted

---

## 4.3 Notifications Dropdown

### Test:
1. Click auf Bell-Icon
2. Prüfe:
   - [ ] Dropdown öffnet
   - [ ] Notifications laden
   - [ ] Unread-Count korrekt
   - [ ] Mark as Read funktioniert
   - [ ] Click → Action-URL

### Mögliche Probleme:
- ❌ Dropdown öffnet nicht
- ❌ API-Call fehlt
- ❌ date-fns Error

### Fix:
```powershell
npm install date-fns@^3.6.0
```

---

## 4.4 3D-Design & Styles

### Test auf allen Pages:
1. Prüfe:
   - [ ] neo-deep Cards funktionieren
   - [ ] bubble-soft Buttons funktionieren
   - [ ] input-inset Inputs funktionieren
   - [ ] text-cannabis Gradient funktioniert
   - [ ] Hover-Effects funktionieren
   - [ ] Custom Scrollbars angezeigt

### Mögliche Probleme:
- ❌ globals.css nicht geladen
- ❌ Tailwind nicht kompiliert
- ❌ Fonts nicht geladen

### Fix:
```tsx
// globals.css importiert in layout.tsx?
import '@/app/globals.css'

// Fonts laden in globals.css:
@import url('https://fonts.googleapis.com/css2?family=Caveat...')
```

---

# PHASE 5: INTEGRATION & API

## 5.1 API-Client

### Test:
```tsx
// In Browser Console:
// Öffne eine Page und teste:
```

### Prüfe:
- [ ] apiClient importierbar
- [ ] GET-Requests funktionieren
- [ ] POST-Requests funktionieren
- [ ] Error-Handling funktioniert
- [ ] Auth-Token wird mitgeschickt

### Mögliche Probleme:
- ❌ CORS-Errors
- ❌ Base-URL falsch
- ❌ Token nicht gesetzt

### Fix:
```tsx
// src/lib/api-client.ts prüfen:
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost'

// CORS im Backend:
// API Gateway CORS-Config prüfen
```

---

## 5.2 Auth-Flow

### Test kompletter Auth-Flow:
1. Registrierung:
   - [ ] User erstellen
   - [ ] Token erhalten
   - [ ] Redirect zu Dashboard
   
2. Login:
   - [ ] Mit Credentials einloggen
   - [ ] Token erhalten
   - [ ] User-Data geladen
   
3. Protected Routes:
   - [ ] Ohne Login → Redirect zu /login
   - [ ] Mit Login → Access granted
   
4. Logout:
   - [ ] Logout funktioniert
   - [ ] Token gelöscht
   - [ ] Redirect zu /

### Mögliche Probleme:
- ❌ Token nicht gespeichert
- ❌ AuthProvider fehlt Context
- ❌ Middleware fehlt

---

## 5.3 Real-Time Features

### Test (falls vorhanden):
1. Notifications:
   - [ ] Echtzeit-Updates
   - [ ] WebSocket connected
   
2. Live-Updates:
   - [ ] New Posts erscheinen
   - [ ] Votes live

### Mögliche Probleme:
- ❌ Socket.io nicht connected
- ❌ Events nicht subscribed

---

# PHASE 6: DESIGN & UX

## 6.1 Responsive Design

### Test auf verschiedenen Breakpoints:
- [ ] Desktop (1920px)
- [ ] Laptop (1366px)
- [ ] Tablet (768px)
- [ ] Mobile (375px)

### Prüfe für jede Page:
- [ ] Layout passt sich an
- [ ] Keine Horizontal-Scrolls
- [ ] Text lesbar
- [ ] Buttons erreichbar
- [ ] Navigation funktioniert

### Mögliche Probleme:
- ❌ Fixed Widths
- ❌ Overflow-Hidden fehlt
- ❌ Mobile-Nav fehlt

---

## 6.2 Dark/Light Mode

### Test:
1. Toggle Theme-Button
2. Prüfe:
   - [ ] Theme ändert sich
   - [ ] Alle Farben passen
   - [ ] Text lesbar
   - [ ] Keine Blendung

### Mögliche Probleme:
- ❌ next-themes nicht konfiguriert
- ❌ Dark-Mode Classes fehlen

---

## 6.3 Loading States

### Test auf allen Pages:
- [ ] Initial Loading angezeigt
- [ ] Skeleton-Loaders
- [ ] Spinner bei Actions
- [ ] Progress bei Uploads

### Mögliche Probleme:
- ❌ Keine Loading-States
- ❌ Unendliches Loading

---

## 6.4 Error States

### Test Error-Handling:
1. Network offline:
   - [ ] Error-Message angezeigt
   
2. 404 Errors:
   - [ ] Custom 404 Page
   
3. 500 Errors:
   - [ ] Error-Boundary
   
4. Form-Validation:
   - [ ] Field-Errors angezeigt

### Mögliche Probleme:
- ❌ Keine Error-Messages
- ❌ App crashed bei Error

---

# PHASE 7: PERFORMANCE

## 7.1 Page Load Speed

### Test:
1. Chrome DevTools → Network
2. Öffne jede Page
3. Messe:
   - [ ] First Contentful Paint < 1.5s
   - [ ] Time to Interactive < 3s
   - [ ] Total Load Time < 5s

### Mögliche Probleme:
- ❌ Zu große Bundles
- ❌ Unoptimierte Images
- ❌ Blocking Resources

### Fix:
```tsx
// Next.js Image verwenden:
import Image from 'next/image'

// Dynamic Imports:
const HeavyComponent = dynamic(() => import('./Heavy'))
```

---

## 7.2 Bundle Size

### Test:
```powershell
npm run build
# Check .next/server/chunks Größen
```

### Prüfe:
- [ ] Main Bundle < 500KB
- [ ] Page Bundles < 200KB
- [ ] Keine duplizierten Deps

### Mögliche Probleme:
- ❌ react-markdown zu groß
- ❌ recharts zu groß

### Fix:
```tsx
// Dynamic Import für große Libs:
const ReactMarkdown = dynamic(() => import('react-markdown'))
```

---

## 7.3 API Response Times

### Test:
1. Chrome DevTools → Network
2. Trigger API-Calls
3. Messe:
   - [ ] Search < 500ms
   - [ ] CRUD Operations < 1s
   - [ ] AI-Calls < 5s

### Mögliche Probleme:
- ❌ Backend langsam
- ❌ Keine Caching
- ❌ Zu viele Requests

---

# PHASE 8: SECURITY

## 8.1 Authentication

### Test:
- [ ] Passwords werden gehasht
- [ ] JWT sicher gespeichert
- [ ] HttpOnly Cookies (optional)
- [ ] CSRF-Protection

### Mögliche Probleme:
- ❌ Token in LocalStorage (XSS-Risk)
- ❌ Keine Password-Validation

---

## 8.2 Authorization

### Test:
- [ ] User kann nur eigene Daten sehen
- [ ] Admin-Routes geschützt
- [ ] API-Endpoints validieren User

### Mögliche Probleme:
- ❌ Fehlende Auth-Checks
- ❌ IDOR-Vulnerabilities

---

## 8.3 Input Validation

### Test:
- [ ] XSS-Prevention
- [ ] SQL-Injection Prevention
- [ ] File-Upload Validation
- [ ] Rate-Limiting

### Mögliche Probleme:
- ❌ Kein Input-Sanitization
- ❌ Keine File-Type Checks

---

# 🔧 BUG-FIX WORKFLOW

## Wenn ein Bug gefunden wird:

1. **Dokumentieren:**
   ```
   Bug: [Kurze Beschreibung]
   Page: [URL]
   Steps to Reproduce:
   1. ...
   2. ...
   Expected: [...]
   Actual: [...]
   ```

2. **Priorität setzen:**
   - 🔴 Critical (App nicht nutzbar)
   - 🟡 Major (Feature nicht nutzbar)
   - 🟢 Minor (Kosmetisch)

3. **Fixen:**
   - Code-Änderung
   - Test wiederholen
   - Dokumentieren

4. **Re-Test:**
   - Bug-Fix verifizieren
   - Keine neuen Bugs

---

# 📋 TEST-PROTOKOLL

## Wie dokumentieren:

```markdown
## Test: [Feature-Name]
**Datum:** [DD.MM.YYYY]
**Tester:** [Name]

### Tests:
- [x] Test 1 - ✅ Pass
- [x] Test 2 - ✅ Pass
- [ ] Test 3 - ❌ Fail
  - Bug: [Beschreibung]
  - Fix: [Was getan wurde]
  - Re-Test: ✅ Pass

### Status: ✅ Complete / 🟡 Partial / ❌ Failed
```

---

# 🎯 PRIORITÄTEN

## Phase 1-3 (Must-Have):
- Installation
- Backend Services
- Core Frontend Pages

## Phase 4-6 (Should-Have):
- Components & UI
- Integration
- Design & UX

## Phase 7-8 (Nice-to-Have):
- Performance
- Security

---

# 📞 NEXT STEPS

1. **Starte mit Phase 1** (Setup)
2. **Arbeite dich durch** (Phase für Phase)
3. **Dokumentiere Bugs** (in separate File)
4. **Fixe Bugs** (nach Priorität)
5. **Re-Test** (bis alles grün)

---

**Erstellt:** 01.11.2025
**Version:** 1.0
**Status:** Ready for Testing! 🧪

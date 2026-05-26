# Mobile UI Audit 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobile-Darstellung auf den 5 wichtigsten Seiten verbessern — weniger verschwendeter Platz, lesbare Strain-Namen, kompakte Tab-Navs.

**Architecture:** Rein CSS/Tailwind-Änderungen — `truncate` durch `line-clamp-2` ersetzen, responsive Padding-Klassen (`p-3 sm:p-5` statt `p-5`), Hero-Höhe mobilfreundlich machen. Kein JS, kein Refactoring, kein Desktop-Layout anfassen.

**Tech Stack:** Next.js 14, Tailwind CSS, shadcn/ui. Frontend-Build: `docker-compose restart frontend` (dauert ~10 min, baut neu wegen `npm run build`).

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `apps/web-app/src/app/strains/page.tsx` | Zeile 192: `truncate` → `line-clamp-2` |
| `apps/web-app/src/app/ai/layout.tsx` | Zeile 121: `py-2` → `py-1.5` in Mobile-Tab-Buttons |
| `apps/web-app/src/app/tools/layout.tsx` | Zeile 130: `py-2` → `py-1.5` in Mobile-Tab-Buttons |
| `apps/web-app/src/app/landing/page.tsx` | Hero-Höhe + Schriftgröße mobilfreundlich |
| `apps/web-app/src/app/dashboard/page.tsx` | Quick-Actions CardHeader Padding auf Mobile reduzieren |
| `apps/web-app/src/app/tools/page.tsx` | Karten-Padding auf Mobile reduzieren |
| `apps/web-app/src/app/ai/page.tsx` | Karten-Padding auf Mobile reduzieren |

---

## Task 1: Strain-Namen — `truncate` durch `line-clamp-2` ersetzen

**Files:**
- Modify: `apps/web-app/src/app/strains/page.tsx:192`

- [ ] **Step 1: Zeile 192 ändern**

  Aktuell:
  ```tsx
  <h3 className="font-bold truncate">{strain.name}</h3>
  ```
  Neu:
  ```tsx
  <h3 className="font-bold line-clamp-2 leading-tight">{strain.name}</h3>
  ```

- [ ] **Step 2: TypeScript prüfen**

  ```bash
  cd /root/SF-1-Ultimate-/apps/web-app && npx tsc --noEmit 2>&1 | head -20
  ```
  Erwartet: keine Fehler (oder nur vorher schon vorhandene)

- [ ] **Step 3: Commit**

  ```bash
  cd /root/SF-1-Ultimate- && git add apps/web-app/src/app/strains/page.tsx
  git commit -m "fix(web-app): Strain-Namen line-clamp-2 statt truncate auf Mobile"
  ```

---

## Task 2: AI + Tools Mobile Tab-Nav — kompakteres Padding

**Files:**
- Modify: `apps/web-app/src/app/ai/layout.tsx:121`
- Modify: `apps/web-app/src/app/tools/layout.tsx:130`

- [ ] **Step 1: ai/layout.tsx — Tab-Button-Padding reduzieren**

  Datei: `apps/web-app/src/app/ai/layout.tsx`, Zeile ~121
  
  Aktuell:
  ```tsx
  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
  ```
  Neu:
  ```tsx
  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
  ```

- [ ] **Step 2: tools/layout.tsx — Tab-Button-Padding reduzieren**

  Datei: `apps/web-app/src/app/tools/layout.tsx`, Zeile ~130
  
  Aktuell:
  ```tsx
  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
  ```
  Neu:
  ```tsx
  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
  ```

- [ ] **Step 3: Commit**

  ```bash
  cd /root/SF-1-Ultimate- && git add apps/web-app/src/app/ai/layout.tsx apps/web-app/src/app/tools/layout.tsx
  git commit -m "fix(web-app): Mobile Tab-Nav Padding reduzieren (AI + Tools)"
  ```

---

## Task 3: Landing Page — Hero auf Mobile verkleinern

**Files:**
- Modify: `apps/web-app/src/app/landing/page.tsx:41,50,55`

- [ ] **Step 1: Hero-Section — Höhe und Schriftgröße anpassen**

  Zeile 41 — Hero-Container:
  ```tsx
  // Aktuell:
  <section className="relative h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
  // Neu:
  <section className="relative min-h-[70vh] sm:h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
  ```

  Zeile 50 — H1 Schriftgröße:
  ```tsx
  // Aktuell:
  <h1 className="text-6xl md:text-7xl font-bold tracking-tight">
  // Neu:
  <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight">
  ```

  Zeile 55 — Subheadline:
  ```tsx
  // Aktuell:
  <p className="text-xl md:text-2xl text-muted-foreground font-medium">
  // Neu:
  <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-medium">
  ```

- [ ] **Step 2: TypeScript prüfen**

  ```bash
  cd /root/SF-1-Ultimate-/apps/web-app && npx tsc --noEmit 2>&1 | head -20
  ```

- [ ] **Step 3: Commit**

  ```bash
  cd /root/SF-1-Ultimate- && git add apps/web-app/src/app/landing/page.tsx
  git commit -m "fix(web-app): Landing Hero mobilfreundlich — Höhe + Schriftgröße"
  ```

---

## Task 4: Dashboard — Quick Actions Padding auf Mobile

**Files:**
- Modify: `apps/web-app/src/app/dashboard/page.tsx:209,215`

- [ ] **Step 1: Quick Actions Grid-Gap und CardHeader anpassen**

  Zeile 209 — Grid:
  ```tsx
  // Aktuell:
  <div className="grid gap-4 sm:grid-cols-3">
  // Neu:
  <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
  ```

  Zeile 215 — Card CardHeader:
  ```tsx
  // Aktuell:
  <CardHeader>
  // Neu:
  <CardHeader className="p-4 sm:p-6">
  ```

- [ ] **Step 2: Stats-Grid Gap ebenfalls reduzieren**

  Zeile 188:
  ```tsx
  // Aktuell:
  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
  // Neu:
  <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
  ```

- [ ] **Step 3: Commit**

  ```bash
  cd /root/SF-1-Ultimate- && git add apps/web-app/src/app/dashboard/page.tsx
  git commit -m "fix(web-app): Dashboard Mobile-Padding und Grid-Gap reduzieren"
  ```

---

## Task 5: Tools + AI Übersicht — Karten-Padding auf Mobile

**Files:**
- Modify: `apps/web-app/src/app/tools/page.tsx`
- Modify: `apps/web-app/src/app/ai/page.tsx`

- [ ] **Step 1: tools/page.tsx — Karten-Padding + Grid-Gap**

  ```tsx
  // Aktuell (Zeile ~66):
  className="group rounded-xl border bg-card p-4 sm:p-5 transition-all hover:border-primary hover:shadow-lg"
  // Neu:
  className="group rounded-xl border bg-card p-3 sm:p-5 transition-all hover:border-primary hover:shadow-lg"
  ```

- [ ] **Step 2: ai/page.tsx — Karten-Padding**

  ```tsx
  // Aktuell (Zeile ~53):
  className="group rounded-xl border bg-card p-4 sm:p-6 transition-all hover:border-primary hover:shadow-lg"
  // Neu:
  className="group rounded-xl border bg-card p-3 sm:p-6 transition-all hover:border-primary hover:shadow-lg"
  ```

- [ ] **Step 3: Commit**

  ```bash
  cd /root/SF-1-Ultimate- && git add apps/web-app/src/app/tools/page.tsx apps/web-app/src/app/ai/page.tsx
  git commit -m "fix(web-app): Tools + AI Karten-Padding auf Mobile reduzieren"
  ```

---

## Task 6: Frontend neu bauen + verifizieren

- [ ] **Step 1: Frontend-Container neu starten**

  ```bash
  docker-compose stop frontend && docker-compose up -d frontend
  ```

- [ ] **Step 2: Build-Erfolg abwarten (~10 min)**

  ```bash
  docker logs -f sf1-frontend 2>&1 | grep -E "Ready|Error|error" | head -5
  ```
  Erwartet: `✓ Ready in ...ms`

- [ ] **Step 3: TypeScript-Fehler-Check im Build-Log**

  ```bash
  docker logs sf1-frontend 2>&1 | grep -i "error\|Type error" | head -10
  ```
  Erwartet: keine Ausgabe

- [ ] **Step 4: LIVE-PROGRESS.md aktualisieren**

  ```bash
  # Status auf clean setzen und NEXT ACTION leeren
  ```

# Mobile UI Audit 2 — Design Spec

**Datum:** 2026-04-27  
**Status:** Approved  
**Scope:** Bug-Fixes + Mobile-Optimierung der 4 wichtigsten Seiten

---

## Kontext

SF-1 wird gleich häufig auf Desktop und Handy genutzt. Nach dem ersten Mobile-Audit (2026-04-25) wurden Layout-Fixes committed aber nie deployed — der Frontend-Container lief noch 2 Wochen auf der alten Version. Am 2026-04-27 wurde der Container neu gebaut; die alten Fixes (THC toFixed, Footer, AdCarousel, ai/tools Layout) sind nun live.

Verbleibende Probleme: Strain-Namen abgeschnitten, Tab-Navs zu hoch auf Mobile, allgemeine Übergrößen (zu viel Padding, Karten zu groß, verschwendeter Bildschirmplatz auf Mobile).

---

## Teil 1 — Verbleibende Bug-Fixes

### 1A — Strain-Namen abgeschnitten
- **Datei:** `apps/web-app/src/app/strains/page.tsx`
- **Problem:** Strain-Name in Grid-Karte abgeschnitten
- **Fix:** `line-clamp-2` statt `truncate`, Kartenhöhe flexibel

### 1B — Tools mobile Tab-Nav zu hoch
- **Datei:** `apps/web-app/src/app/tools/layout.tsx`
- **Fix:** Tab-Button padding von `py-2` → `py-1.5`

### 1C — AI mobile Tab-Nav zu hoch
- **Datei:** `apps/web-app/src/app/ai/layout.tsx`
- **Fix:** gleich wie 1B

---

## Teil 2 — Mobile-Optimierung der 4 Seiten

**Grundprinzip:** Nur Spacing/Sizing anpassen. Kein strukturelles Redesign. Desktop bleibt unberührt.

### 2A — Landing Page
- **Datei:** `apps/web-app/src/app/landing/page.tsx`
- Hero: `py-24` → `py-12 sm:py-24`
- Feature-Cards: `p-6` → `p-4 sm:p-6`

### 2B — Dashboard
- **Datei:** `apps/web-app/src/app/dashboard/page.tsx`
- Stats-Karten: `p-6` → `p-4 sm:p-6`
- Grid-Gap: `gap-6` → `gap-3 sm:gap-6`

### 2C — Strains
- **Datei:** `apps/web-app/src/app/strains/page.tsx`
- Grid-Karten: `p-4 sm:p-5` → `p-3 sm:p-5`
- Header: `mb-6` → `mb-3 sm:mb-6`

### 2D — Tools & AI Übersicht
- **Dateien:** `apps/web-app/src/app/tools/page.tsx`, `apps/web-app/src/app/ai/page.tsx`
- Karten: `p-4 sm:p-6` → `p-3 sm:p-6`
- Grid-Gap: `gap-4 sm:gap-6` → `gap-3 sm:gap-6`

---

## Nicht im Scope

- Kein Redesign, keine neuen Features
- Kein Desktop anfassen
- Kein Refactoring von Komponenten

---

## Acceptance Criteria

1. Strain-Namen vollständig lesbar (2 Zeilen erlaubt)
2. Mobile Tab-Navs (Tools/AI) max 40px hoch
3. Landing/Dashboard/Strains/Tools/AI zeigen auf 390px mehr Inhalt ohne Scrollen
4. Frontend nach den Fixes neu gebaut und live

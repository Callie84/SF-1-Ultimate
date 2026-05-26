# Design: Löschen + Undo Recovery-UI (Session 6)

**Datum:** 2026-04-30  
**Status:** approved

## Scope

Alle löschbaren Inhalte: Threads, Replies, Grows, Entries, Comments.

## Ansatz

Optimistic Delete + gemeinsamer Restore-Endpoint (genutzt von Toast-Undo und Admin-Papierkorb).

## Backend

### Neue Model-Felder
`isPermanentlyDeleted: Boolean, default: false` in:
- `Thread.model.ts`, `Reply.model.ts` (community-service)
- `Grow.model.ts`, `Entry.model.ts`, `Comment.model.ts` (journal-service)

### Neue Endpoints

**Restore (Owner oder Admin):**
```
PATCH /api/community/threads/:id/restore
PATCH /api/community/replies/:id/restore
PATCH /api/journal/grows/:id/restore
PATCH /api/journal/entries/:id/restore
PATCH /api/journal/grows/:growId/comments/:id/restore
```
Setzt `isDeleted = false`.

**Purge (Admin only):**
```
PATCH /api/community/threads/:id/purge
PATCH /api/journal/grows/:id/purge
```
Setzt `isPermanentlyDeleted = true` — Item bleibt in DB, erscheint nirgends mehr.

**Deleted-List (Admin only):**
```
GET /api/community/threads?deleted=true
GET /api/journal/grows?deleted=true
```
Gibt `isDeleted: true, isPermanentlyDeleted: false` zurück.

## Frontend

### Zentraler Hook `useDeleteWithUndo`
```typescript
useDeleteWithUndo(deleteFn, restoreFn, queryKey, label)
```
1. Optimistic: Item aus Query-Cache entfernen
2. Delete-API aufrufen
3. `sonner` Toast: `"${label} gelöscht. [Rückgängig]"` — 10 Sek
4. Undo-Klick → `PATCH /restore` → Query invalidieren

Alle bestehenden Delete-Hooks nutzen diesen zentralen Hook.

### Admin-Papierkorb
Tab "Gelöscht" in `/admin/threads/page.tsx` und `/admin/grows/page.tsx`:
- Lädt Items mit `?deleted=true`
- "Wiederherstellen" → `PATCH /restore`
- "Endgültig" → `confirm()` → `PATCH /purge`
- Pagination identisch zu bestehendem Tab

## Acceptance Criteria
- [ ] Toast mit Undo erscheint nach jedem Löschen (alle 5 Typen)
- [ ] Undo funktioniert innerhalb 10 Sekunden
- [ ] Admin-Tab "Gelöscht" zeigt soft-gelöschte Items
- [ ] Wiederherstellen-Button funktioniert
- [ ] Endgültig-Button mit confirm() setzt isPermanentlyDeleted
- [ ] TypeScript: keine Fehler
- [ ] Purged Items erscheinen nirgends mehr

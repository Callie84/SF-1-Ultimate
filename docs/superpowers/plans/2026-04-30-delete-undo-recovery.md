# Delete + Undo Recovery-UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toast mit Undo (10 Sek) nach jedem Löschen + Admin-Papierkorb (Tab in bestehenden Admin-Seiten) für alle löschbaren Inhalte.

**Architecture:** Optimistic Delete bleibt wie bisher. Neuer zentraler `useDeleteWithUndo`-Hook wrapet bestehende Delete-Hooks mit sonner-Toast + Restore-Call. Backend bekommt `/restore`- und `/purge`-Endpoints pro Content-Typ. `isPermanentlyDeleted`-Flag verhindert erneutes Anzeigen ohne Hard-Delete.

**Tech Stack:** MongoDB/Mongoose, Express, TypeScript (community-service + journal-service), Next.js + React Query + sonner (web-app)

---

## Dateien-Übersicht

| Aktion | Datei |
|--------|-------|
| Modify | `apps/community-service/src/models/Thread.model.ts` |
| Modify | `apps/community-service/src/models/Reply.model.ts` |
| Modify | `apps/community-service/src/services/thread.service.ts` |
| Modify | `apps/community-service/src/services/reply.service.ts` |
| Modify | `apps/community-service/src/routes/threads.routes.ts` |
| Modify | `apps/community-service/src/routes/replies.routes.ts` |
| Modify | `apps/journal-service/src/models/Grow.model.ts` |
| Modify | `apps/journal-service/src/models/Entry.model.ts` (falls isDeleted fehlt) |
| Modify | `apps/journal-service/src/services/grow.service.ts` |
| Modify | `apps/journal-service/src/routes/grows.routes.ts` |
| Create | `apps/web-app/src/hooks/use-delete-with-undo.ts` |
| Modify | `apps/web-app/src/hooks/use-community.ts` |
| Modify | `apps/web-app/src/hooks/use-journal.ts` |
| Modify | `apps/web-app/src/hooks/use-admin.ts` |
| Modify | `apps/web-app/src/app/admin/threads/page.tsx` |
| Modify | `apps/web-app/src/app/admin/grows/page.tsx` |
| Modify | `tests/services/community.test.ts` |
| Modify | `tests/services/journal.test.ts` |

---

## Task 1: Community-Service Models — isPermanentlyDeleted

**Files:**
- Modify: `apps/community-service/src/models/Thread.model.ts`
- Modify: `apps/community-service/src/models/Reply.model.ts`

- [ ] **Step 1: Thread.model.ts — Interface erweitern**

In `IThread` Interface nach `deleteReason?: string;` einfügen:
```typescript
isPermanentlyDeleted: boolean;
```

- [ ] **Step 2: Thread.model.ts — Schema erweitern**

Im ThreadSchema nach dem `isDeleted`-Block einfügen:
```typescript
isPermanentlyDeleted: { type: Boolean, default: false, index: true },
```

- [ ] **Step 3: Reply.model.ts — Interface erweitern**

In `IReply` Interface nach `deleteReason?: string;` einfügen:
```typescript
isPermanentlyDeleted: boolean;
```

- [ ] **Step 4: Reply.model.ts — Schema erweitern**

Im ReplySchema nach dem `isDeleted`-Block einfügen:
```typescript
isPermanentlyDeleted: { type: Boolean, default: false, index: true },
```

- [ ] **Step 5: TypeScript prüfen**

```bash
cd /root/SF-1-Ultimate-/apps/community-service && npx tsc --noEmit
```
Erwartung: keine Fehler

- [ ] **Step 6: Commit**

```bash
git add apps/community-service/src/models/Thread.model.ts apps/community-service/src/models/Reply.model.ts
git commit -m "feat(community): add isPermanentlyDeleted field to Thread and Reply models"
```

---

## Task 2: Community-Service — Thread restore/purge + Admin-Query

**Files:**
- Modify: `apps/community-service/src/services/thread.service.ts`
- Modify: `apps/community-service/src/routes/threads.routes.ts`

- [ ] **Step 1: thread.service.ts lesen**

```bash
cat -n /root/SF-1-Ultimate-/apps/community-service/src/services/thread.service.ts | head -50
```
Finde die `delete()`-Methode (ca. Zeile 220) und die `getAll()`-Methode.

- [ ] **Step 2: Restore-Methode in thread.service.ts hinzufügen**

Nach der `delete()`-Methode einfügen:
```typescript
async restore(threadId: string, userId: string): Promise<IThread> {
  const thread = await Thread.findById(threadId);
  if (!thread) throw new Error('Thread nicht gefunden');
  if (thread.userId !== userId) throw new Error('Nicht berechtigt');
  thread.isDeleted = false;
  thread.deletedAt = undefined;
  thread.isPermanentlyDeleted = false;
  await thread.save();
  return thread;
}

async purge(threadId: string): Promise<void> {
  const thread = await Thread.findById(threadId);
  if (!thread) throw new Error('Thread nicht gefunden');
  thread.isPermanentlyDeleted = true;
  await thread.save();
}

async getDeleted(page: number, limit: number): Promise<{ threads: IThread[]; total: number }> {
  const query = { isDeleted: true, isPermanentlyDeleted: false };
  const [threads, total] = await Promise.all([
    Thread.find(query).sort({ deletedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Thread.countDocuments(query),
  ]);
  return { threads, total };
}
```

- [ ] **Step 3: Restore + Purge Routes in threads.routes.ts hinzufügen**

Nach dem bestehenden `router.delete('/:id', ...)` Block einfügen:
```typescript
// Restore (owner or admin)
router.patch('/:id/restore',
  authMiddleware,
  async (req, res, next) => {
    try {
      const thread = await threadService.restore(req.params.id, req.user!.id);
      res.json({ success: true, thread });
    } catch (error) {
      next(error);
    }
  }
);

// Purge (admin only — marks as permanently deleted)
router.patch('/:id/purge',
  authMiddleware,
  async (req, res, next) => {
    try {
      if (req.user!.role !== 'ADMIN' && req.user!.role !== 'MODERATOR') {
        return res.status(403).json({ error: 'Nicht berechtigt' });
      }
      await threadService.purge(req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// Admin: list deleted threads
router.get('/admin/deleted',
  authMiddleware,
  async (req, res, next) => {
    try {
      if (req.user!.role !== 'ADMIN' && req.user!.role !== 'MODERATOR') {
        return res.status(403).json({ error: 'Nicht berechtigt' });
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await threadService.getDeleted(page, limit);
      res.json({ ...result, page, totalPages: Math.ceil(result.total / limit) });
    } catch (error) {
      next(error);
    }
  }
);
```

**Wichtig:** Die Route `GET /admin/deleted` muss VOR `GET /:id` definiert sein, sonst matcht Express `:id = 'admin'`.

- [ ] **Step 4: TypeScript prüfen**

```bash
cd /root/SF-1-Ultimate-/apps/community-service && npx tsc --noEmit
```
Erwartung: keine Fehler

- [ ] **Step 5: Service neu starten + Endpoints testen**

```bash
docker restart sf1-community-service
sleep 3
# Erst einen Thread ID aus der DB holen:
docker exec sf1-mongodb mongosh sf1 --quiet --eval "db.threads.findOne({isDeleted:true},{_id:1})"
```

- [ ] **Step 6: Commit**

```bash
git add apps/community-service/src/services/thread.service.ts apps/community-service/src/routes/threads.routes.ts
git commit -m "feat(community): add thread restore, purge and admin deleted-list endpoints"
```

---

## Task 3: Community-Service — Reply restore

**Files:**
- Modify: `apps/community-service/src/services/reply.service.ts`
- Modify: `apps/community-service/src/routes/replies.routes.ts`

- [ ] **Step 1: reply.service.ts lesen**

```bash
cat -n /root/SF-1-Ultimate-/apps/community-service/src/services/reply.service.ts
```
Finde die `delete()`-Methode.

- [ ] **Step 2: Restore-Methode in reply.service.ts hinzufügen**

Nach der `delete()`-Methode einfügen:
```typescript
async restore(replyId: string, userId: string): Promise<IReply> {
  const reply = await Reply.findById(replyId);
  if (!reply) throw new Error('Reply nicht gefunden');
  if (reply.userId !== userId) throw new Error('Nicht berechtigt');
  reply.isDeleted = false;
  reply.deletedAt = undefined;
  reply.isPermanentlyDeleted = false;
  await reply.save();
  return reply;
}
```

- [ ] **Step 3: Restore Route in replies.routes.ts hinzufügen**

Nach dem bestehenden `router.delete('/:id', ...)` Block:
```typescript
router.patch('/:id/restore',
  authMiddleware,
  async (req, res, next) => {
    try {
      const reply = await replyService.restore(req.params.id, req.user!.id);
      res.json({ success: true, reply });
    } catch (error) {
      next(error);
    }
  }
);
```

- [ ] **Step 4: TypeScript prüfen**

```bash
cd /root/SF-1-Ultimate-/apps/community-service && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add apps/community-service/src/services/reply.service.ts apps/community-service/src/routes/replies.routes.ts
git commit -m "feat(community): add reply restore endpoint"
```

---

## Task 4: Journal-Service Model + Grow restore/purge + Admin-Query

**Files:**
- Modify: `apps/journal-service/src/models/Grow.model.ts`
- Modify: `apps/journal-service/src/services/grow.service.ts`
- Modify: `apps/journal-service/src/routes/grows.routes.ts`

- [ ] **Step 1: Grow.model.ts — Interface + Schema erweitern**

In `IGrow` Interface nach `deletedAt?: Date;` einfügen:
```typescript
isPermanentlyDeleted: boolean;
```

Im GrowSchema nach dem `deletedAt`-Block (Zeile ~127) einfügen:
```typescript
isPermanentlyDeleted: { type: Boolean, default: false, index: true },
```

- [ ] **Step 2: grow.service.ts — restore/purge/getDeleted hinzufügen**

```bash
cat -n /root/SF-1-Ultimate-/apps/journal-service/src/services/grow.service.ts | grep -n "delete\|async" | head -20
```

Nach der `delete()`-Methode (ca. Zeile 123) einfügen:
```typescript
async restore(growId: string, userId: string): Promise<IGrow> {
  const grow = await Grow.findById(growId);
  if (!grow) throw new Error('Grow nicht gefunden');
  if (grow.userId !== userId) throw new Error('Nicht berechtigt');
  grow.deletedAt = undefined;
  grow.isPermanentlyDeleted = false;
  await grow.save();
  return grow;
}

async purge(growId: string): Promise<void> {
  const grow = await Grow.findById(growId);
  if (!grow) throw new Error('Grow nicht gefunden');
  grow.isPermanentlyDeleted = true;
  await grow.save();
}

async getDeleted(page: number, limit: number): Promise<{ grows: IGrow[]; total: number }> {
  const query = { deletedAt: { $ne: null, $exists: true }, isPermanentlyDeleted: false };
  const [grows, total] = await Promise.all([
    Grow.find(query).sort({ deletedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Grow.countDocuments(query),
  ]);
  return { grows, total };
}
```

- [ ] **Step 3: Alle Grow-Queries um isPermanentlyDeleted erweitern**

In `grow.service.ts` alle Stellen wo auf `deletedAt: null` oder `deletedAt: { $exists: false }` gefiltert wird, erweitern:
```typescript
// Vorher:
{ userId, deletedAt: null }
// Nachher:
{ userId, deletedAt: null, isPermanentlyDeleted: false }

// Vorher:
{ userId, deletedAt: { $exists: false } }
// Nachher:
{ userId, deletedAt: { $exists: false }, isPermanentlyDeleted: { $ne: true } }
```

Auch in `grows.routes.ts` Zeile 299 (`deletedAt: null`):
```typescript
// Vorher:
deletedAt: null,
// Nachher:
deletedAt: null, isPermanentlyDeleted: false,
```

- [ ] **Step 4: Restore + Purge + Admin-Deleted Routes in grows.routes.ts**

Nach dem bestehenden `router.delete('/:id', ...)` Block einfügen:
```typescript
// Restore
router.patch('/:id/restore',
  authMiddleware,
  async (req, res, next) => {
    try {
      const grow = await growService.restore(req.params.id, req.user!.id);
      res.json({ success: true, grow });
    } catch (error) {
      next(error);
    }
  }
);

// Purge (admin only)
router.patch('/:id/purge',
  authMiddleware,
  async (req, res, next) => {
    try {
      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Nicht berechtigt' });
      }
      await growService.purge(req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// Admin: list deleted grows
router.get('/admin/deleted',
  authMiddleware,
  async (req, res, next) => {
    try {
      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Nicht berechtigt' });
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await growService.getDeleted(page, limit);
      res.json({ ...result, page, totalPages: Math.ceil(result.total / limit) });
    } catch (error) {
      next(error);
    }
  }
);
```

**Wichtig:** `GET /admin/deleted` muss VOR `GET /:id` definiert sein.

- [ ] **Step 5: TypeScript prüfen**

```bash
cd /root/SF-1-Ultimate-/apps/journal-service && npx tsc --noEmit
```

- [ ] **Step 6: Service neu starten**

```bash
docker restart sf1-journal-service
sleep 3
docker logs sf1-journal-service --tail 10
```
Erwartung: kein Crash, "Server started" oder ähnliches.

- [ ] **Step 7: Commit**

```bash
git add apps/journal-service/src/models/Grow.model.ts apps/journal-service/src/services/grow.service.ts apps/journal-service/src/routes/grows.routes.ts
git commit -m "feat(journal): add isPermanentlyDeleted field and grow restore/purge/admin-deleted endpoints"
```

---

## Task 5: Frontend — useDeleteWithUndo Hook

**Files:**
- Create: `apps/web-app/src/hooks/use-delete-with-undo.ts`

- [ ] **Step 1: Hook erstellen**

```typescript
// apps/web-app/src/hooks/use-delete-with-undo.ts
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DeleteWithUndoOptions {
  deleteFn: () => Promise<void>;
  restoreFn: () => Promise<void>;
  queryKey: unknown[];
  label: string; // z.B. "Thread", "Grow", "Reply"
}

export function useDeleteWithUndo() {
  const queryClient = useQueryClient();

  return async ({ deleteFn, restoreFn, queryKey, label }: DeleteWithUndoOptions) => {
    // Optimistic: sofort aus dem Cache entfernen
    await queryClient.invalidateQueries({ queryKey });

    try {
      await deleteFn();
    } catch {
      // Delete fehlgeschlagen: Cache wiederherstellen
      await queryClient.invalidateQueries({ queryKey });
      toast.error(`Fehler beim Löschen des ${label}s`);
      return;
    }

    // Toast mit Undo-Button (10 Sek)
    toast(`${label} gelöscht`, {
      duration: 10000,
      action: {
        label: 'Rückgängig',
        onClick: async () => {
          try {
            await restoreFn();
            await queryClient.invalidateQueries({ queryKey });
            toast.success(`${label} wiederhergestellt`);
          } catch {
            toast.error(`Fehler beim Wiederherstellen des ${label}s`);
          }
        },
      },
    });
  };
}
```

- [ ] **Step 2: TypeScript prüfen**

```bash
cd /root/SF-1-Ultimate-/apps/web-app && npx tsc --noEmit 2>&1 | head -20
```
Erwartung: keine neuen Fehler

- [ ] **Step 3: Commit**

```bash
git add apps/web-app/src/hooks/use-delete-with-undo.ts
git commit -m "feat(web): add useDeleteWithUndo hook with sonner toast and 10s undo window"
```

---

## Task 6: Frontend — use-community.ts + use-journal.ts aktualisieren

**Files:**
- Modify: `apps/web-app/src/hooks/use-community.ts`
- Modify: `apps/web-app/src/hooks/use-journal.ts`

- [ ] **Step 1: use-community.ts lesen (vollständig)**

```bash
cat -n /root/SF-1-Ultimate-/apps/web-app/src/hooks/use-community.ts
```

- [ ] **Step 2: Restore-Hooks + aktualisierte Delete-Hooks in use-community.ts**

Imports am Anfang ergänzen:
```typescript
import { useDeleteWithUndo } from './use-delete-with-undo';
```

`useDeleteThread()` ersetzen durch:
```typescript
export function useDeleteThread() {
  const deleteWithUndo = useDeleteWithUndo();
  const queryClient = useQueryClient();

  return {
    mutateAsync: async (id: string) => {
      await deleteWithUndo({
        deleteFn: () => api.delete(`/api/community/threads/${id}`).then(() => {}),
        restoreFn: () => api.patch(`/api/community/threads/${id}/restore`).then(() => {}),
        queryKey: communityKeys.threads(),
        label: 'Thread',
      });
    },
  };
}
```

`useDeleteReply()` analog ersetzen:
```typescript
export function useDeleteReply() {
  const deleteWithUndo = useDeleteWithUndo();

  return {
    mutateAsync: async (id: string) => {
      await deleteWithUndo({
        deleteFn: () => api.delete(`/api/community/replies/${id}`).then(() => {}),
        restoreFn: () => api.patch(`/api/community/replies/${id}/restore`).then(() => {}),
        queryKey: communityKeys.threads(),
        label: 'Reply',
      });
    },
  };
}
```

- [ ] **Step 3: use-journal.ts lesen (vollständig)**

```bash
cat -n /root/SF-1-Ultimate-/apps/web-app/src/hooks/use-journal.ts
```

- [ ] **Step 4: Delete-Hooks in use-journal.ts aktualisieren**

Import ergänzen:
```typescript
import { useDeleteWithUndo } from './use-delete-with-undo';
```

`useDeleteGrow()` ersetzen durch:
```typescript
export function useDeleteGrow() {
  const deleteWithUndo = useDeleteWithUndo();

  return {
    mutateAsync: async (id: string) => {
      await deleteWithUndo({
        deleteFn: () => api.delete(`/api/journal/grows/${id}`).then(() => {}),
        restoreFn: () => api.patch(`/api/journal/grows/${id}/restore`).then(() => {}),
        queryKey: journalKeys.grows(),
        label: 'Grow',
      });
    },
  };
}
```

`useDeleteEntry()` analog:
```typescript
export function useDeleteEntry() {
  const deleteWithUndo = useDeleteWithUndo();

  return {
    mutateAsync: async (id: string) => {
      await deleteWithUndo({
        deleteFn: () => api.delete(`/api/journal/entries/${id}`).then(() => {}),
        restoreFn: () => api.patch(`/api/journal/entries/${id}/restore`).then(() => {}),
        queryKey: journalKeys.grows(),
        label: 'Eintrag',
      });
    },
  };
}
```

`useDeleteGrowComment()` analog:
```typescript
export function useDeleteGrowComment() {
  const deleteWithUndo = useDeleteWithUndo();

  return {
    mutateAsync: async ({ growId, commentId }: { growId: string; commentId: string }) => {
      await deleteWithUndo({
        deleteFn: () => api.delete(`/api/journal/grows/${growId}/comments/${commentId}`).then(() => {}),
        restoreFn: () => api.patch(`/api/journal/grows/${growId}/comments/${commentId}/restore`).then(() => {}),
        queryKey: journalKeys.grows(),
        label: 'Kommentar',
      });
    },
  };
}
```

- [ ] **Step 5: TypeScript prüfen**

```bash
cd /root/SF-1-Ultimate-/apps/web-app && npx tsc --noEmit 2>&1 | head -30
```
Erwartung: keine neuen Fehler. Falls Signaturen nicht passen: Aufrufe in thread-detail-client.tsx etc. prüfen und anpassen.

- [ ] **Step 6: Commit**

```bash
git add apps/web-app/src/hooks/use-community.ts apps/web-app/src/hooks/use-journal.ts
git commit -m "feat(web): wire delete hooks to useDeleteWithUndo for toast+undo on all content types"
```

---

## Task 7: Frontend — use-admin.ts — Trash-Hooks hinzufügen

**Files:**
- Modify: `apps/web-app/src/hooks/use-admin.ts`

- [ ] **Step 1: use-admin.ts lesen**

```bash
cat -n /root/SF-1-Ultimate-/apps/web-app/src/hooks/use-admin.ts
```
Notiere: Query-Keys-Pattern (`adminKeys`), wie `useAdminThreads` und `useAdminGrows` aufgebaut sind.

- [ ] **Step 2: Deleted-List Hooks hinzufügen**

Am Ende der Datei (vor letztem Export) einfügen:

```typescript
// Admin Trash — Threads
export function useAdminDeletedThreads({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: [...adminKeys.all, 'deleted-threads', page],
    queryFn: async () => {
      const { data } = await api.get('/api/community/threads/admin/deleted', {
        params: { page, limit },
      });
      return data as { threads: any[]; total: number; totalPages: number };
    },
  });
}

// Admin Trash — Grows
export function useAdminDeletedGrows({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: [...adminKeys.all, 'deleted-grows', page],
    queryFn: async () => {
      const { data } = await api.get('/api/journal/grows/admin/deleted', {
        params: { page, limit },
      });
      return data as { grows: any[]; total: number; totalPages: number };
    },
  });
}

// Restore Thread (Admin)
export function useRestoreThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      await api.patch(`/api/community/threads/${threadId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'deleted-threads'] });
    },
  });
}

// Purge Thread (Admin — permanent hidden)
export function usePurgeThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      await api.patch(`/api/community/threads/${threadId}/purge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'deleted-threads'] });
    },
  });
}

// Restore Grow (Admin)
export function useRestoreGrow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (growId: string) => {
      await api.patch(`/api/journal/grows/${growId}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'deleted-grows'] });
    },
  });
}

// Purge Grow (Admin)
export function usePurgeGrow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (growId: string) => {
      await api.patch(`/api/journal/grows/${growId}/purge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'deleted-grows'] });
    },
  });
}
```

- [ ] **Step 3: TypeScript prüfen**

```bash
cd /root/SF-1-Ultimate-/apps/web-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add apps/web-app/src/hooks/use-admin.ts
git commit -m "feat(web): add admin trash hooks for deleted threads and grows"
```

---

## Task 8: Frontend — Admin Threads — Tab "Gelöscht"

**Files:**
- Modify: `apps/web-app/src/app/admin/threads/page.tsx`

- [ ] **Step 1: Datei vollständig lesen**

```bash
cat -n /root/SF-1-Ultimate-/apps/web-app/src/app/admin/threads/page.tsx
```

- [ ] **Step 2: Imports ergänzen**

Zu den bestehenden Hook-Imports hinzufügen:
```typescript
import { useAdminDeletedThreads, useRestoreThread, usePurgeThread } from '@/hooks/use-admin';
```

Zu den Lucide-Icons hinzufügen:
```typescript
import { RotateCcw, Ban } from 'lucide-react';
```

- [ ] **Step 3: Tab-State + neue Hooks hinzufügen**

Nach den bestehenden State-Deklarationen (`const [page, setPage]`):
```typescript
const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
const [deletedPage, setDeletedPage] = useState(1);

const { data: deletedData, isLoading: deletedLoading, refetch: refetchDeleted } = useAdminDeletedThreads({
  page: deletedPage,
  limit: 20,
});
const restoreThread = useRestoreThread();
const purgeThread = usePurgeThread();
```

- [ ] **Step 4: Handler für Restore + Purge hinzufügen**

```typescript
const handleRestore = async (threadId: string) => {
  try {
    await restoreThread.mutateAsync(threadId);
    toast.success('Thread wiederhergestellt');
  } catch {
    toast.error('Fehler beim Wiederherstellen');
  }
};

const handlePurge = async (threadId: string) => {
  if (!confirm('Thread dauerhaft ausblenden? Er bleibt in der Datenbank, wird aber nirgends mehr angezeigt.')) return;
  try {
    await purgeThread.mutateAsync(threadId);
    toast.success('Thread dauerhaft ausgeblendet');
  } catch {
    toast.error('Fehler beim Ausblenden');
  }
};
```

- [ ] **Step 5: Tab-Navigation in der JSX ergänzen**

Vor der bestehenden Threads-Liste (nach dem `<CardHeader>`) Tab-Buttons einfügen:
```tsx
<div className="flex gap-2 px-6 pb-4">
  <Button
    variant={activeTab === 'active' ? 'default' : 'ghost'}
    size="sm"
    onClick={() => setActiveTab('active')}
  >
    Aktive Threads
  </Button>
  <Button
    variant={activeTab === 'deleted' ? 'default' : 'ghost'}
    size="sm"
    onClick={() => setActiveTab('deleted')}
  >
    Gelöscht ({deletedData?.total ?? 0})
  </Button>
</div>
```

- [ ] **Step 6: Gelöscht-Tab-Inhalt einfügen**

Die bestehende Threads-Liste in `{activeTab === 'active' && (...)}` wrappen.

Danach einfügen:
```tsx
{activeTab === 'deleted' && (
  <div className="space-y-2 p-4">
    {deletedLoading ? (
      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
    ) : !deletedData?.threads.length ? (
      <p className="text-center text-muted-foreground py-8">Keine gelöschten Threads</p>
    ) : (
      deletedData.threads.map((thread: any) => (
        <div key={thread._id} className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{thread.title}</p>
            <p className="text-xs text-muted-foreground">
              Gelöscht: {formatDate(thread.deletedAt)} · {thread.userId}
            </p>
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRestore(thread._id)}
              disabled={restoreThread.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-1" /> Wiederherstellen
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handlePurge(thread._id)}
              disabled={purgeThread.isPending}
            >
              <Ban className="h-4 w-4 mr-1" /> Dauerhaft
            </Button>
          </div>
        </div>
      ))
    )}
    {(deletedData?.totalPages ?? 0) > 1 && (
      <div className="flex justify-center gap-2 pt-4">
        <Button variant="outline" size="sm" disabled={deletedPage <= 1} onClick={() => setDeletedPage(p => p - 1)}>Zurück</Button>
        <span className="text-sm text-muted-foreground py-2">{deletedPage} / {deletedData?.totalPages}</span>
        <Button variant="outline" size="sm" disabled={deletedPage >= (deletedData?.totalPages ?? 1)} onClick={() => setDeletedPage(p => p + 1)}>Weiter</Button>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 7: TypeScript prüfen**

```bash
cd /root/SF-1-Ultimate-/apps/web-app && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 8: Commit**

```bash
git add apps/web-app/src/app/admin/threads/page.tsx
git commit -m "feat(web): add deleted threads tab to admin with restore and purge actions"
```

---

## Task 9: Frontend — Admin Grows — Tab "Gelöscht"

**Files:**
- Modify: `apps/web-app/src/app/admin/grows/page.tsx`

Identische Struktur wie Task 8 — für Grows.

- [ ] **Step 1: Datei vollständig lesen**

```bash
cat -n /root/SF-1-Ultimate-/apps/web-app/src/app/admin/grows/page.tsx
```

- [ ] **Step 2: Imports ergänzen**

```typescript
import { useAdminDeletedGrows, useRestoreGrow, usePurgeGrow } from '@/hooks/use-admin';
import { RotateCcw, Ban } from 'lucide-react';
```

- [ ] **Step 3: Tab-State + Hooks**

```typescript
const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
const [deletedPage, setDeletedPage] = useState(1);

const { data: deletedData, isLoading: deletedLoading } = useAdminDeletedGrows({
  page: deletedPage,
  limit: 20,
});
const restoreGrow = useRestoreGrow();
const purgeGrow = usePurgeGrow();
```

- [ ] **Step 4: Handler**

```typescript
const handleRestore = async (growId: string) => {
  try {
    await restoreGrow.mutateAsync(growId);
    toast.success('Grow wiederhergestellt');
  } catch {
    toast.error('Fehler beim Wiederherstellen');
  }
};

const handlePurge = async (growId: string) => {
  if (!confirm('Grow dauerhaft ausblenden? Er bleibt in der Datenbank, wird aber nirgends mehr angezeigt.')) return;
  try {
    await purgeGrow.mutateAsync(growId);
    toast.success('Grow dauerhaft ausgeblendet');
  } catch {
    toast.error('Fehler beim Ausblenden');
  }
};
```

- [ ] **Step 5: Tab-Navigation einfügen**

Identisch zu Task 8 Step 5, mit "Aktive Grows" / "Gelöscht".

- [ ] **Step 6: Gelöscht-Tab-Inhalt**

Identisch zu Task 8 Step 6 aber mit `deletedData.grows` statt `deletedData.threads`, Felder `strainName` statt `title`:
```tsx
{activeTab === 'deleted' && (
  <div className="space-y-2 p-4">
    {deletedLoading ? (
      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
    ) : !deletedData?.grows.length ? (
      <p className="text-center text-muted-foreground py-8">Keine gelöschten Grows</p>
    ) : (
      deletedData.grows.map((grow: any) => (
        <div key={grow._id} className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{grow.strainName || 'Unbekannte Sorte'}</p>
            <p className="text-xs text-muted-foreground">
              Gelöscht: {formatDate(grow.deletedAt)} · {grow.userId}
            </p>
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRestore(grow._id)}
              disabled={restoreGrow.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-1" /> Wiederherstellen
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handlePurge(grow._id)}
              disabled={purgeGrow.isPending}
            >
              <Ban className="h-4 w-4 mr-1" /> Dauerhaft
            </Button>
          </div>
        </div>
      ))
    )}
    {(deletedData?.totalPages ?? 0) > 1 && (
      <div className="flex justify-center gap-2 pt-4">
        <Button variant="outline" size="sm" disabled={deletedPage <= 1} onClick={() => setDeletedPage(p => p - 1)}>Zurück</Button>
        <span className="text-sm text-muted-foreground py-2">{deletedPage} / {deletedData?.totalPages}</span>
        <Button variant="outline" size="sm" disabled={deletedPage >= (deletedData?.totalPages ?? 1)} onClick={() => setDeletedPage(p => p + 1)}>Weiter</Button>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 7: TypeScript prüfen**

```bash
cd /root/SF-1-Ultimate-/apps/web-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 8: Commit**

```bash
git add apps/web-app/src/app/admin/grows/page.tsx
git commit -m "feat(web): add deleted grows tab to admin with restore and purge actions"
```

---

## Task 10: Tests + Abschluss

**Files:**
- Modify: `tests/services/community.test.ts`
- Modify: `tests/services/journal.test.ts`

- [ ] **Step 1: community.test.ts — Restore-Test hinzufügen**

Nach dem bestehenden Thread-Delete-Test (Zeile 93-104) einen neuen Test einfügen. Da der Delete-Test `threadId = ''` setzt, brauchen wir einen eigenen Thread für den Restore-Test:

```typescript
it('Thread löschen + Restore — gibt 200 zurück', async () => {
  if (rateLimited || !token) { logPass(SVC, 'thread-restore-skipped'); return; }
  // Neuen Thread anlegen
  const createRes = await safePost(communityClient, '/api/community/threads', {
    title: `Restore-Test ${sessionId}`,
    content: 'Zum Testen des Restore-Flows',
    categoryId: categoryId,
  }, withAuth(token));
  if (!createRes || createRes.status !== 201) { logPass(SVC, 'thread-restore-skipped'); return; }
  const tempId = createRes.data?.thread?._id;

  // Löschen
  const delRes = await safeDelete(communityClient, `/api/community/threads/${tempId}`, withAuth(token));
  expect([200, 204]).toContain(delRes?.status);

  // Restore
  const restoreRes = await safePatch(communityClient, `/api/community/threads/${tempId}/restore`, {}, withAuth(token));
  try {
    expect(restoreRes?.status).toBe(200);
    logPass(SVC, 'thread-restore');
  } catch (e: any) {
    logFail(SVC, 'thread-restore', `Status ${restoreRes?.status}`);
    throw e;
  }
});
```

Prüfe ob `safePatch` im Test-Helper existiert:
```bash
grep -n "safePatch\|export" /root/SF-1-Ultimate-/tests/helpers/client.js | head -20
```
Falls nicht vorhanden, in `tests/helpers/client.js` ergänzen:
```javascript
export async function safePatch(client, path, body, headers = {}) {
  try {
    return await client.patch(path, body, { headers });
  } catch (e) {
    return e.response;
  }
}
```

- [ ] **Step 2: journal.test.ts — Restore-Test hinzufügen**

Analog zu Step 1 für Grows:
```typescript
it('Grow löschen + Restore — gibt 200 zurück', async () => {
  if (rateLimited || !token) { logPass(SVC, 'grow-restore-skipped'); return; }
  // Neuen Grow anlegen
  const createRes = await safePost(journalClient, '/api/journal/grows', {
    strainName: `Restore-Test ${sessionId}`,
    type: 'autoflower',
    environment: 'indoor',
    startDate: new Date().toISOString(),
  }, withAuth(token));
  if (!createRes || createRes.status !== 201) { logPass(SVC, 'grow-restore-skipped'); return; }
  const tempId = createRes.data?.grow?._id;

  // Löschen
  const delRes = await safeDelete(journalClient, `/api/journal/grows/${tempId}`, withAuth(token));
  expect([200, 204]).toContain(delRes?.status);

  // Restore
  const restoreRes = await safePatch(journalClient, `/api/journal/grows/${tempId}/restore`, {}, withAuth(token));
  try {
    expect(restoreRes?.status).toBe(200);
    logPass(SVC, 'grow-restore');
  } catch (e: any) {
    logFail(SVC, 'grow-restore', `Status ${restoreRes?.status}`);
    throw e;
  }
});
```

- [ ] **Step 3: Tests ausführen**

```bash
cd /root/SF-1-Ultimate- && node tests/run-tests.js 2>&1 | tail -30
```
Erwartung: community `thread-restore` PASS, journal `grow-restore` PASS.

- [ ] **Step 4: Frontend Build prüfen**

```bash
cd /root/SF-1-Ultimate-/apps/web-app && npm run build 2>&1 | tail -20
```
Erwartung: Build erfolgreich, keine TypeScript-Errors.

- [ ] **Step 5: Docker Frontend neu starten**

```bash
docker restart sf1-frontend
sleep 5
docker logs sf1-frontend --tail 10
```

- [ ] **Step 6: Manueller Test (Admin-Papierkorb)**

1. Öffne `/admin/threads` — Tab "Gelöscht" muss sichtbar sein
2. Lösche einen Thread als User → Toast mit "Rückgängig" muss erscheinen
3. Klick auf "Rückgängig" → Thread erscheint wieder
4. Lösche erneut → warte 10 Sek → Thread bleibt gelöscht
5. In Admin-Tab "Gelöscht" → Thread erscheint dort
6. "Wiederherstellen" klicken → Thread verschwindet aus Papierkorb
7. "Dauerhaft" klicken (anderer Thread) → verschwindet aus Papierkorb + aus allen Ansichten

- [ ] **Step 7: Abschluss-Commit**

```bash
git add tests/services/community.test.ts tests/services/journal.test.ts tests/helpers/client.js
git commit -m "test: add restore tests for threads and grows"
```

- [ ] **Step 8: Session 6 abschließen**

```bash
# overview.md auf ✅ setzen
sed -i 's/s6.*⏳/s6 ✅/' /root/.claude/session-plan/overview.md 2>/dev/null || true
```
Dann manuell `/root/.claude/session-plan/overview.md` prüfen und s6 auf ✅ setzen.

Dann:
```bash
rm -rf /root/.claude/skills/s6
```

Dann `/task-done` aufrufen.

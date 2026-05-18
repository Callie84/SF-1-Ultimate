import { Router, Request, Response, NextFunction } from 'express';
import { reminderService } from '../services/reminder.service';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * GET /api/journal/reminders
 * Alle Reminder des Users (mit optionalem Filter)
 */
router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { growId, status, type, startDate, endDate, page, limit } = req.query as Record<string, string>;

    const result = await reminderService.getReminders({
      userId,
      growId: growId || undefined,
      status: status as any || undefined,
      type: type || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? Math.min(parseInt(limit), 200) : 100,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/journal/reminders/calendar
 * Kalender-Daten (Reminder gruppiert nach Tag)
 */
router.get('/calendar', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

    const data = await reminderService.getCalendarData(userId, year, month);
    res.json({ calendar: data, year, month });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/journal/reminders/upcoming
 * Bevorstehende Reminder (nächste N Tage)
 */
router.get('/upcoming', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const days = parseInt(req.query.days as string) || 7;
    const reminders = await reminderService.getUpcomingReminders(userId, days);
    res.json({ reminders });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/journal/reminders/overdue
 * Überfällige Reminder
 */
router.get('/overdue', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const reminders = await reminderService.getOverdueReminders(userId);
    res.json({ reminders });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/journal/reminders/stats
 * Reminder-Statistiken
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const stats = await reminderService.getStats(userId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/journal/reminders
 * Neuen Reminder erstellen
 */
router.post('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { title, description, type, dueDate, dueTime, growId, isRecurring, recurrencePattern, recurrenceEndDate, notifyBefore } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ error: 'Titel und Datum sind erforderlich' });
    }

    const reminder = await reminderService.createReminder({
      userId,
      growId: growId || undefined,
      title: String(title).slice(0, 200),
      description: description ? String(description).slice(0, 1000) : undefined,
      type: type || 'custom',
      dueDate: new Date(dueDate),
      dueTime: dueTime || undefined,
      isRecurring: !!isRecurring,
      recurrencePattern: isRecurring ? recurrencePattern : undefined,
      recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : undefined,
      notifyBefore: notifyBefore ? parseInt(notifyBefore) : 60,
    });

    res.status(201).json({ reminder });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/journal/reminders/:id/complete
 * Reminder als erledigt markieren
 */
router.patch('/:id/complete', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const reminder = await reminderService.completeReminder(req.params.id, userId);
    if (!reminder) return res.status(404).json({ error: 'Reminder nicht gefunden' });
    res.json({ reminder });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/journal/reminders/:id/skip
 * Reminder überspringen
 */
router.patch('/:id/skip', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const reminder = await reminderService.skipReminder(req.params.id, userId);
    if (!reminder) return res.status(404).json({ error: 'Reminder nicht gefunden' });
    res.json({ reminder });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/journal/reminders/:id
 * Reminder aktualisieren
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { title, description, type, dueDate, dueTime, isRecurring, recurrencePattern, recurrenceEndDate, notifyBefore } = req.body;

    const reminder = await reminderService.updateReminder(req.params.id, userId, {
      title: title ? String(title).slice(0, 200) : undefined,
      description: description !== undefined ? String(description).slice(0, 1000) : undefined,
      type: type || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      dueTime: dueTime || undefined,
      isRecurring: isRecurring !== undefined ? !!isRecurring : undefined,
      recurrencePattern: recurrencePattern || undefined,
      recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : undefined,
      notifyBefore: notifyBefore !== undefined ? parseInt(notifyBefore) : undefined,
    });

    if (!reminder) return res.status(404).json({ error: 'Reminder nicht gefunden' });
    res.json({ reminder });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/journal/reminders/:id
 * Reminder löschen
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const deleted = await reminderService.deleteReminder(req.params.id, userId);
    if (!deleted) return res.status(404).json({ error: 'Reminder nicht gefunden' });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

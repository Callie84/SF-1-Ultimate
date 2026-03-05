// /apps/journal-service/src/workers/reminder.worker.ts
// Periodically checks for overdue reminders and sends notifications
import { Reminder } from '../models/Reminder.model';
import { logger } from '../utils/logger';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'sf1-internal-secret';

async function sendNotification(userId: string, title: string, message: string, type: string = 'system') {
  try {
    const res = await fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications/internal/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SECRET,
      },
      body: JSON.stringify({ userId, title, message, type }),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.warn(`[ReminderWorker] Notification failed for ${userId}: ${text}`);
    }
  } catch (err: any) {
    logger.warn(`[ReminderWorker] Could not reach notification-service: ${err.message}`);
  }
}

/**
 * Mark pending reminders as overdue and send notifications
 */
async function processOverdueReminders() {
  const now = new Date();
  // Only process reminders that became overdue in the last 24h (avoid old spam)
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const overdueReminders = await Reminder.find({
    status: 'pending',
    dueDate: { $gte: since, $lt: now },
    notificationSent: { $ne: true },
  }).lean();

  if (overdueReminders.length === 0) return;

  logger.info(`[ReminderWorker] Processing ${overdueReminders.length} overdue reminders`);

  for (const reminder of overdueReminders) {
    try {
      // Mark as overdue
      await Reminder.updateOne(
        { _id: reminder._id },
        { $set: { status: 'overdue', notificationSent: true } }
      );

      // Send notification
      const typeLabels: Record<string, string> = {
        watering: 'Gießen',
        feeding: 'Düngen',
        transplant: 'Umtopfen',
        harvest: 'Ernte',
        inspection: 'Kontrolle',
        custom: 'Aufgabe',
      };
      const typeLabel = typeLabels[reminder.type] || 'Erinnerung';

      await sendNotification(
        reminder.userId,
        `Überfällig: ${reminder.title}`,
        `Deine Erinnerung "${reminder.title}" (${typeLabel}) ist überfällig!`,
        'system'
      );
    } catch (err: any) {
      logger.error(`[ReminderWorker] Error processing reminder ${reminder._id}:`, err);
    }
  }
}

/**
 * Send advance notifications for upcoming reminders (notifyBefore minutes)
 */
async function processUpcomingNotifications() {
  const now = new Date();
  // Check for reminders due in the next 60 minutes with notifyBefore set
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  const upcomingReminders = await Reminder.find({
    status: 'pending',
    dueDate: { $gte: now, $lte: inOneHour },
    notifyBefore: { $exists: true, $gt: 0 },
    notificationSent: { $ne: true },
  }).lean();

  for (const reminder of upcomingReminders) {
    try {
      const minutesUntilDue = Math.round((new Date(reminder.dueDate).getTime() - now.getTime()) / 60000);
      if (minutesUntilDue <= (reminder.notifyBefore || 30)) {
        await Reminder.updateOne({ _id: reminder._id }, { $set: { notificationSent: true } });
        await sendNotification(
          reminder.userId,
          `Erinnerung: ${reminder.title}`,
          `In ${minutesUntilDue} Minuten: "${reminder.title}"`,
          'system'
        );
      }
    } catch (err: any) {
      logger.error(`[ReminderWorker] Error sending upcoming notification ${reminder._id}:`, err);
    }
  }
}

let workerInterval: NodeJS.Timeout | null = null;

export function startReminderWorker() {
  logger.info('[ReminderWorker] Starting reminder notification worker (every 30 minutes)');

  // Run immediately on start
  setTimeout(async () => {
    try {
      await processOverdueReminders();
      await processUpcomingNotifications();
    } catch (err: any) {
      logger.error('[ReminderWorker] Initial run error:', err);
    }
  }, 10000); // 10s delay after startup

  // Then every 30 minutes
  workerInterval = setInterval(async () => {
    try {
      await processOverdueReminders();
      await processUpcomingNotifications();
    } catch (err: any) {
      logger.error('[ReminderWorker] Error in interval run:', err);
    }
  }, 30 * 60 * 1000);
}

export function stopReminderWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
}

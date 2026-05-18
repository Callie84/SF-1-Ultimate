// /apps/journal-service/src/services/reminder.service.ts
import { Reminder, IReminder } from '../models/Reminder.model';

export interface CreateReminderData {
  userId: string;
  growId?: string;
  title: string;
  description?: string;
  type: 'watering' | 'feeding' | 'transplant' | 'harvest' | 'inspection' | 'custom';
  dueDate: Date;
  dueTime?: string;
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'every_2_days' | 'every_3_days' | 'weekly' | 'biweekly' | 'monthly';
  recurrenceEndDate?: Date;
  notifyBefore?: number;
}

export interface UpdateReminderData {
  title?: string;
  description?: string;
  type?: 'watering' | 'feeding' | 'transplant' | 'harvest' | 'inspection' | 'custom';
  dueDate?: Date;
  dueTime?: string;
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'every_2_days' | 'every_3_days' | 'weekly' | 'biweekly' | 'monthly';
  recurrenceEndDate?: Date;
  notifyBefore?: number;
}

export interface ReminderFilters {
  userId: string;
  growId?: string;
  status?: 'pending' | 'completed' | 'skipped' | 'overdue';
  type?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

class ReminderService {
  // Create a new reminder
  async createReminder(data: CreateReminderData): Promise<IReminder> {
    const reminder = new Reminder({
      ...data,
      status: 'pending',
      notificationSent: false
    });

    return reminder.save();
  }

  // Get reminders with filters
  async getReminders(filters: ReminderFilters) {
    const {
      userId,
      growId,
      status,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = filters;

    const query: any = { userId };

    if (growId) query.growId = growId;
    if (status) query.status = status;
    if (type) query.type = type;

    if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) query.dueDate.$gte = startDate;
      if (endDate) query.dueDate.$lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [reminders, total] = await Promise.all([
      Reminder.find(query)
        .sort({ dueDate: 1, dueTime: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Reminder.countDocuments(query)
    ]);

    return {
      reminders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get a single reminder by ID
  async getReminderById(reminderId: string, userId: string): Promise<IReminder | null> {
    return Reminder.findOne({ _id: reminderId, userId });
  }

  // Update a reminder
  async updateReminder(
    reminderId: string,
    userId: string,
    data: UpdateReminderData
  ): Promise<IReminder | null> {
    return Reminder.findOneAndUpdate(
      { _id: reminderId, userId },
      { $set: data },
      { new: true }
    );
  }

  // Delete a reminder
  async deleteReminder(reminderId: string, userId: string): Promise<boolean> {
    const result = await Reminder.deleteOne({ _id: reminderId, userId });
    return result.deletedCount > 0;
  }

  // Mark reminder as completed
  async completeReminder(reminderId: string, userId: string): Promise<IReminder | null> {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: reminderId, userId },
      {
        $set: {
          status: 'completed',
          completedAt: new Date()
        }
      },
      { new: true }
    );

    // If recurring, create next occurrence
    if (reminder && reminder.isRecurring && reminder.recurrencePattern) {
      await this.createNextOccurrence(reminder);
    }

    return reminder;
  }

  // Skip a reminder
  async skipReminder(reminderId: string, userId: string): Promise<IReminder | null> {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: reminderId, userId },
      { $set: { status: 'skipped' } },
      { new: true }
    );

    // If recurring, create next occurrence
    if (reminder && reminder.isRecurring && reminder.recurrencePattern) {
      await this.createNextOccurrence(reminder);
    }

    return reminder;
  }

  // Create next occurrence for recurring reminder
  private async createNextOccurrence(reminder: IReminder): Promise<void> {
    const nextDate = this.calculateNextDate(
      reminder.dueDate,
      reminder.recurrencePattern!
    );

    // Check if we've passed the end date
    if (reminder.recurrenceEndDate && nextDate > reminder.recurrenceEndDate) {
      return;
    }

    const newReminder = new Reminder({
      userId: reminder.userId,
      growId: reminder.growId,
      title: reminder.title,
      description: reminder.description,
      type: reminder.type,
      dueDate: nextDate,
      dueTime: reminder.dueTime,
      isRecurring: true,
      recurrencePattern: reminder.recurrencePattern,
      recurrenceEndDate: reminder.recurrenceEndDate,
      notifyBefore: reminder.notifyBefore,
      status: 'pending',
      notificationSent: false
    });

    await newReminder.save();
  }

  // Calculate next date based on recurrence pattern
  private calculateNextDate(currentDate: Date, pattern: string): Date {
    const next = new Date(currentDate);

    switch (pattern) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'every_2_days':
        next.setDate(next.getDate() + 2);
        break;
      case 'every_3_days':
        next.setDate(next.getDate() + 3);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
    }

    return next;
  }

  // Get upcoming reminders (for dashboard)
  async getUpcomingReminders(userId: string, days: number = 7): Promise<IReminder[]> {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return Reminder.find({
      userId,
      status: 'pending',
      dueDate: { $gte: now, $lte: endDate }
    })
      .sort({ dueDate: 1, dueTime: 1 })
      .limit(20)
      .lean();
  }

  // Get overdue reminders
  async getOverdueReminders(userId: string): Promise<IReminder[]> {
    const now = new Date();

    return Reminder.find({
      userId,
      status: 'pending',
      dueDate: { $lt: now }
    })
      .sort({ dueDate: -1 })
      .lean();
  }

  // Update overdue status (called by worker/cron)
  async updateOverdueStatus(): Promise<number> {
    const now = new Date();

    const result = await Reminder.updateMany(
      {
        status: 'pending',
        dueDate: { $lt: now }
      },
      { $set: { status: 'overdue' } }
    );

    return result.modifiedCount;
  }

  // Get reminders for a specific grow
  async getGrowReminders(growId: string, userId: string): Promise<IReminder[]> {
    return Reminder.find({ growId, userId })
      .sort({ dueDate: 1 })
      .lean();
  }

  // Get calendar data (reminders grouped by date)
  async getCalendarData(
    userId: string,
    year: number,
    month: number
  ): Promise<Record<string, IReminder[]>> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const reminders = await Reminder.find({
      userId,
      dueDate: { $gte: startDate, $lte: endDate }
    })
      .sort({ dueDate: 1, dueTime: 1 })
      .lean();

    // Group by date string (YYYY-MM-DD)
    const grouped: Record<string, IReminder[]> = {};

    for (const reminder of reminders) {
      const dateKey = reminder.dueDate.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(reminder);
    }

    return grouped;
  }

  // Get reminder statistics
  async getStats(userId: string) {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const [
      total,
      pending,
      completed,
      overdue,
      upcomingWeek
    ] = await Promise.all([
      Reminder.countDocuments({ userId }),
      Reminder.countDocuments({ userId, status: 'pending' }),
      Reminder.countDocuments({ userId, status: 'completed' }),
      Reminder.countDocuments({ userId, status: 'overdue' }),
      Reminder.countDocuments({
        userId,
        status: 'pending',
        dueDate: { $gte: now, $lte: weekFromNow }
      })
    ]);

    return {
      total,
      pending,
      completed,
      overdue,
      upcomingWeek
    };
  }

  // Bulk create reminders (for templates)
  async bulkCreate(reminders: CreateReminderData[]): Promise<IReminder[]> {
    const docs = reminders.map(r => ({
      ...r,
      status: 'pending',
      notificationSent: false
    }));

    return Reminder.insertMany(docs);
  }
}

export const reminderService = new ReminderService();

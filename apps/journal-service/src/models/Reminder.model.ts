// /apps/journal-service/src/models/Reminder.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IReminder extends Document {
  userId: string;
  growId?: string;

  // Reminder details
  title: string;
  description?: string;
  type: 'watering' | 'feeding' | 'transplant' | 'harvest' | 'inspection' | 'custom';

  // Scheduling
  dueDate: Date;
  dueTime?: string; // HH:mm format

  // Recurrence
  isRecurring: boolean;
  recurrencePattern?: 'daily' | 'every_2_days' | 'every_3_days' | 'weekly' | 'biweekly' | 'monthly';
  recurrenceEndDate?: Date;

  // Status
  status: 'pending' | 'completed' | 'skipped' | 'overdue';
  completedAt?: Date;

  // Notifications
  notifyBefore?: number; // minutes before due time
  notificationSent: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const ReminderSchema = new Schema<IReminder>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  growId: {
    type: String,
    index: true
  },

  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['watering', 'feeding', 'transplant', 'harvest', 'inspection', 'custom'],
    default: 'custom',
    index: true
  },

  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  dueTime: String,

  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    type: String,
    enum: ['daily', 'every_2_days', 'every_3_days', 'weekly', 'biweekly', 'monthly']
  },
  recurrenceEndDate: Date,

  status: {
    type: String,
    enum: ['pending', 'completed', 'skipped', 'overdue'],
    default: 'pending',
    index: true
  },
  completedAt: Date,

  notifyBefore: {
    type: Number,
    default: 60 // 1 hour before
  },
  notificationSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
ReminderSchema.index({ userId: 1, dueDate: 1 });
ReminderSchema.index({ userId: 1, status: 1, dueDate: 1 });
ReminderSchema.index({ growId: 1, dueDate: 1 });
ReminderSchema.index({ dueDate: 1, status: 1, notificationSent: 1 }); // For notification worker

export const Reminder = mongoose.model<IReminder>('Reminder', ReminderSchema);

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export type ReminderType = 'watering' | 'feeding' | 'transplant' | 'harvest' | 'inspection' | 'custom';
export type RecurrencePattern = 'daily' | 'every_2_days' | 'every_3_days' | 'weekly' | 'biweekly' | 'monthly';
export type ReminderStatus = 'pending' | 'completed' | 'skipped' | 'overdue';

export interface Reminder {
  _id: string;
  userId: string;
  growId?: string;
  title: string;
  description?: string;
  type: ReminderType;
  dueDate: string;
  dueTime?: string;
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string;
  status: ReminderStatus;
  completedAt?: string;
  notifyBefore?: number;
  createdAt: string;
}

export interface CreateReminderInput {
  title: string;
  description?: string;
  type: ReminderType;
  dueDate: string;
  dueTime?: string;
  growId?: string;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string;
  notifyBefore?: number;
}

export function useCalendarReminders(year: number, month: number) {
  return useQuery({
    queryKey: ['reminders', 'calendar', year, month],
    queryFn: () =>
      api.get<{ calendar: Record<string, Reminder[]>; year: number; month: number }>(
        `/api/journal/reminders/calendar?year=${year}&month=${month}`
      ),
    staleTime: 60 * 1000,
  });
}

export function useUpcomingReminders(days = 7) {
  return useQuery({
    queryKey: ['reminders', 'upcoming', days],
    queryFn: () =>
      api.get<{ reminders: Reminder[] }>(`/api/journal/reminders/upcoming?days=${days}`),
    staleTime: 60 * 1000,
  });
}

export function useOverdueReminders() {
  return useQuery({
    queryKey: ['reminders', 'overdue'],
    queryFn: () => api.get<{ reminders: Reminder[] }>('/api/journal/reminders/overdue'),
    staleTime: 60 * 1000,
  });
}

export function useReminderStats() {
  return useQuery({
    queryKey: ['reminders', 'stats'],
    queryFn: () =>
      api.get<{
        total: number;
        pending: number;
        completed: number;
        overdue: number;
        upcomingWeek: number;
      }>('/api/journal/reminders/stats'),
    staleTime: 60 * 1000,
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReminderInput) =>
      api.post<{ reminder: Reminder }>('/api/journal/reminders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useCompleteReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<{ reminder: Reminder }>(`/api/journal/reminders/${id}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useSkipReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<{ reminder: Reminder }>(`/api/journal/reminders/${id}/skip`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/journal/reminders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

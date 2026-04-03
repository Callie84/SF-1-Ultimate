'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Bell,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  SkipForward,
  Trash2,
  Loader2,
  AlertTriangle,
  Calendar,
  Droplets,
  Leaf,
  Scissors,
  Search,
  Repeat,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import {
  useCalendarReminders,
  useUpcomingReminders,
  useOverdueReminders,
  useReminderStats,
  useCreateReminder,
  useCompleteReminder,
  useSkipReminder,
  useDeleteReminder,
  type Reminder,
  type ReminderType,
  type RecurrencePattern,
} from '@/hooks/use-reminders';
import { toast } from 'sonner';

const TYPE_CONFIG: Record<ReminderType, { label: string; color: string; icon: React.ReactNode }> = {
  watering: { label: 'Gießen', color: 'bg-blue-500', icon: <Droplets className="h-3 w-3" /> },
  feeding: { label: 'Düngen', color: 'bg-green-500', icon: <Leaf className="h-3 w-3" /> },
  transplant: { label: 'Umtopfen', color: 'bg-orange-500', icon: <Scissors className="h-3 w-3" /> },
  harvest: { label: 'Ernte', color: 'bg-purple-500', icon: <Scissors className="h-3 w-3" /> },
  inspection: { label: 'Kontrolle', color: 'bg-yellow-500', icon: <Search className="h-3 w-3" /> },
  custom: { label: 'Aufgabe', color: 'bg-gray-500', icon: <Bell className="h-3 w-3" /> },
};

const STATUS_CONFIG = {
  pending: { label: 'Offen', className: 'text-foreground' },
  completed: { label: 'Erledigt', className: 'text-green-600 line-through' },
  skipped: { label: 'Übersprungen', className: 'text-muted-foreground line-through' },
  overdue: { label: 'Überfällig', className: 'text-destructive' },
};

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function ReminderDot({ type }: { type: ReminderType }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.custom;
  return <span className={`inline-block h-2 w-2 rounded-full ${cfg.color}`} />;
}

function ReminderRow({
  reminder,
  onComplete,
  onSkip,
  onDelete,
  isLoading,
}: {
  reminder: Reminder;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}) {
  const cfg = TYPE_CONFIG[reminder.type] || TYPE_CONFIG.custom;
  const statusCfg = STATUS_CONFIG[reminder.status] || STATUS_CONFIG.pending;
  const isPending = reminder.status === 'pending' || reminder.status === 'overdue';

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white ${cfg.color}`}>
        {cfg.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${statusCfg.className}`}>{reminder.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{cfg.label}</span>
          {reminder.dueTime && <span>· {reminder.dueTime}</span>}
          {reminder.isRecurring && (
            <span className="flex items-center gap-0.5">
              · <Repeat className="h-2.5 w-2.5" />
            </span>
          )}
          {reminder.status === 'overdue' && (
            <span className="flex items-center gap-0.5 text-destructive">
              · <AlertTriangle className="h-2.5 w-2.5" /> Überfällig
            </span>
          )}
        </div>
      </div>
      {isPending && (
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-green-600 hover:text-green-700"
            onClick={() => onComplete(reminder._id)}
            disabled={isLoading}
            title="Erledigt"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onSkip(reminder._id)}
            disabled={isLoading}
            title="Überspringen"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(reminder._id)}
        disabled={isLoading}
        title="Löschen"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function CreateReminderForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ReminderType>('watering');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('daily');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [notifyBefore, setNotifyBefore] = useState('30');
  const [description, setDescription] = useState('');

  const createReminder = useCreateReminder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) return;

    try {
      await createReminder.mutateAsync({
        title,
        type,
        dueDate,
        dueTime: dueTime || undefined,
        description: description || undefined,
        isRecurring,
        recurrencePattern: isRecurring ? recurrencePattern : undefined,
        recurrenceEndDate: isRecurring && recurrenceEndDate ? recurrenceEndDate : undefined,
        notifyBefore: notifyBefore ? parseInt(notifyBefore) : undefined,
      });
      toast.success('Erinnerung erstellt');
      onClose();
    } catch {
      toast.error('Fehler beim Erstellen');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Neue Erinnerung</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Pflanzen gießen"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="type">Typ</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as ReminderType)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notifyBefore">Benachrichtigung (min)</Label>
              <Input
                id="notifyBefore"
                type="number"
                value={notifyBefore}
                onChange={(e) => setNotifyBefore(e.target.value)}
                min="0"
                placeholder="30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Fälligkeitsdatum *</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueTime">Uhrzeit (optional)</Label>
              <Input
                id="dueTime"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            <Label htmlFor="isRecurring" className="cursor-pointer">Wiederholen</Label>
          </div>

          {isRecurring && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Wiederholung</Label>
                <select
                  value={recurrencePattern}
                  onChange={(e) => setRecurrencePattern(e.target.value as RecurrencePattern)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="daily">Täglich</option>
                  <option value="every_2_days">Alle 2 Tage</option>
                  <option value="every_3_days">Alle 3 Tage</option>
                  <option value="weekly">Wöchentlich</option>
                  <option value="biweekly">Alle 2 Wochen</option>
                  <option value="monthly">Monatlich</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="recurrenceEndDate">Enddatum</Label>
                <Input
                  id="recurrenceEndDate"
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={createReminder.isPending || !title || !dueDate}
            >
              {createReminder.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Erstellen
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function RemindersPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: calendarData, isLoading: calLoading } = useCalendarReminders(year, month);
  const { data: upcomingData } = useUpcomingReminders(7);
  const { data: overdueData } = useOverdueReminders();
  const { data: stats } = useReminderStats();

  const completeReminder = useCompleteReminder();
  const skipReminder = useSkipReminder();
  const deleteReminder = useDeleteReminder();

  const calendar = calendarData?.calendar || {};
  const upcoming = upcomingData?.reminders || [];
  const overdue = overdueData?.reminders || [];

  const isActionLoading =
    completeReminder.isPending || skipReminder.isPending || deleteReminder.isPending;

  const handleComplete = async (id: string) => {
    try {
      await completeReminder.mutateAsync(id);
      toast.success('Erledigt!');
    } catch {
      toast.error('Fehler');
    }
  };

  const handleSkip = async (id: string) => {
    try {
      await skipReminder.mutateAsync(id);
      toast.success('Übersprungen');
    } catch {
      toast.error('Fehler');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReminder.mutateAsync(id);
      toast.success('Gelöscht');
    } catch {
      toast.error('Fehler');
    }
  };

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  // Monday-based: 0=Mon, 6=Sun
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const selectedReminders = selectedDate ? (calendar[selectedDate] || []) : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/journal"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Journal
            </Link>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Grow-Kalender</h1>
              <p className="text-sm text-muted-foreground">Erinnerungen & Aufgaben verwalten</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateForm(f => !f)}>
            <Plus className="mr-2 h-4 w-4" />
            Neue Erinnerung
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <CreateReminderForm onClose={() => setShowCreateForm(false)} />
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Gesamt</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-500">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">Offen</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
                <p className="text-xs text-muted-foreground">Erledigt</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
                <p className="text-xs text-muted-foreground">Überfällig</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-orange-500">{stats.upcomingWeek}</div>
                <p className="text-xs text-muted-foreground">Diese Woche</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="font-semibold">
                    {MONTHS[month - 1]} {year}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Weekday Headers */}
                <div className="mb-2 grid grid-cols-7 text-center">
                  {WEEKDAYS.map(d => (
                    <div key={d} className="py-1 text-xs font-medium text-muted-foreground">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                {calLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid grid-cols-7">
                    {Array.from({ length: totalCells }).map((_, i) => {
                      const dayNum = i - startOffset + 1;
                      if (dayNum < 1 || dayNum > daysInMonth) {
                        return <div key={i} className="h-14 border-t border-border/40 p-1 opacity-0" />;
                      }
                      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const dayReminders = calendar[dateStr] || [];
                      const isToday = dateStr === todayStr;
                      const isSelected = dateStr === selectedDate;

                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                          className={`relative h-14 border-t border-border/40 p-1 text-left transition-colors hover:bg-accent ${
                            isSelected ? 'bg-accent' : ''
                          }`}
                        >
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                              isToday
                                ? 'bg-primary text-primary-foreground'
                                : 'text-foreground'
                            }`}
                          >
                            {dayNum}
                          </span>
                          {dayReminders.length > 0 && (
                            <div className="mt-0.5 flex flex-wrap gap-0.5">
                              {dayReminders.slice(0, 3).map((r, ri) => (
                                <ReminderDot key={ri} type={r.type} />
                              ))}
                              {dayReminders.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{dayReminders.length - 3}</span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected Day Reminders */}
            {selectedDate && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('de-DE', {
                      weekday: 'long', day: 'numeric', month: 'long',
                    })}
                    <span className="ml-auto text-sm font-normal text-muted-foreground">
                      {selectedReminders.length} Erinnerung{selectedReminders.length !== 1 ? 'en' : ''}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedReminders.length > 0 ? (
                    <div className="space-y-2">
                      {selectedReminders.map((r) => (
                        <ReminderRow
                          key={r._id}
                          reminder={r}
                          onComplete={handleComplete}
                          onSkip={handleSkip}
                          onDelete={handleDelete}
                          isLoading={isActionLoading}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-4 text-sm text-muted-foreground">
                      Keine Erinnerungen an diesem Tag
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar: Overdue + Upcoming */}
          <div className="space-y-4">
            {/* Überfällige */}
            {overdue.length > 0 && (
              <Card className="border-destructive/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Überfällig ({overdue.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {overdue.map((r) => (
                      <ReminderRow
                        key={r._id}
                        reminder={r}
                        onComplete={handleComplete}
                        onSkip={handleSkip}
                        onDelete={handleDelete}
                        isLoading={isActionLoading}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bald fällig */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Nächste 7 Tage
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcoming.length > 0 ? (
                  <div className="space-y-2">
                    {upcoming.map((r) => (
                      <div key={r._id} className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.dueDate + 'T12:00:00').toLocaleDateString('de-DE', {
                            weekday: 'short', day: 'numeric', month: 'short',
                          })}
                        </p>
                        <ReminderRow
                          reminder={r}
                          onComplete={handleComplete}
                          onSkip={handleSkip}
                          onDelete={handleDelete}
                          isLoading={isActionLoading}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                    <Bell className="mb-2 h-8 w-8 opacity-40" />
                    <p className="text-sm">Keine anstehenden Erinnerungen</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-1 h-auto p-0"
                      onClick={() => setShowCreateForm(true)}
                    >
                      Jetzt erstellen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Droplets,
  Leaf,
  Scissors,
  Eye,
  CheckCircle2,
  SkipForward,
  Trash2,
  Loader2,
  AlertTriangle,
  Clock,
  Sprout,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useCalendarReminders,
  useUpcomingReminders,
  useOverdueReminders,
  useReminderStats,
  useCreateReminder,
  useCompleteReminder,
  useSkipReminder,
  useDeleteReminder,
  Reminder,
  ReminderType,
  RecurrencePattern,
} from '@/hooks/use-reminders';
import { useGrows } from '@/hooks/use-journal';

// Icons & colors per type
const TYPE_CONFIG: Record<
  ReminderType,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  watering: {
    label: 'Gießen',
    icon: <Droplets className="h-3.5 w-3.5" />,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900',
  },
  feeding: {
    label: 'Düngen',
    icon: <Leaf className="h-3.5 w-3.5" />,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900',
  },
  transplant: {
    label: 'Umtopfen',
    icon: <Leaf className="h-3.5 w-3.5" />,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900',
  },
  harvest: {
    label: 'Ernte',
    icon: <Scissors className="h-3.5 w-3.5" />,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900',
  },
  inspection: {
    label: 'Kontrolle',
    icon: <Eye className="h-3.5 w-3.5" />,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900',
  },
  custom: {
    label: 'Sonstiges',
    icon: <CalendarDays className="h-3.5 w-3.5" />,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
  },
};

const STATUS_COLORS: Record<Reminder['status'], string> = {
  pending: 'border-border',
  completed: 'border-green-500 opacity-60',
  skipped: 'border-muted opacity-50',
  overdue: 'border-red-500',
};

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function getDaysInMonth(year: number, month: number): Date[] {
  const firstDay = new Date(year, month - 1, 1);
  // Monday-start: 0=Mo,...,6=So
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();

  const days: Date[] = [];
  // Pad from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    days.push(new Date(year, month - 1, -i));
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month - 1, d));
  }
  // Pad to next month (fill last row)
  while (days.length % 7 !== 0) {
    days.push(new Date(year, month, days.length - daysInMonth - startDow + 1));
  }
  return days;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function ReminderBadge({ reminder, onComplete, onSkip, onDelete }: {
  reminder: Reminder;
  onComplete: () => void;
  onSkip: () => void;
  onDelete: () => void;
}) {
  const cfg = TYPE_CONFIG[reminder.type];
  return (
    <div
      className={cn(
        'group flex items-center gap-1 rounded px-1.5 py-0.5 text-xs border cursor-default select-none',
        cfg.bg, cfg.color, STATUS_COLORS[reminder.status]
      )}
      title={reminder.title}
    >
      {cfg.icon}
      <span className="truncate max-w-[80px]">{reminder.title}</span>
      {reminder.status === 'pending' && (
        <div className="hidden group-hover:flex items-center gap-0.5 ml-auto">
          <button
            onClick={(e) => { e.stopPropagation(); onComplete(); }}
            className="hover:text-green-600"
            title="Erledigt"
          >
            <CheckCircle2 className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSkip(); }}
            className="hover:text-muted-foreground"
            title="Überspringen"
          >
            <SkipForward className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="hover:text-destructive"
            title="Löschen"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [filterGrowId, setFilterGrowId] = useState<string>('');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<ReminderType>('watering');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formRecurring, setFormRecurring] = useState(false);
  const [formPattern, setFormPattern] = useState<RecurrencePattern>('weekly');
  const [formGrowId, setFormGrowId] = useState<string>('');

  // Pre-fill growId from URL params (e.g. /calendar?growId=xxx)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const growId = params.get('growId');
    if (growId) {
      setFilterGrowId(growId);
      setFormGrowId(growId);
    }
  }, []);

  const { data: calData, isLoading: calLoading } = useCalendarReminders(year, month);
  const { data: upcomingData } = useUpcomingReminders(7);
  const { data: overdueData } = useOverdueReminders();
  const { data: stats } = useReminderStats();
  const { data: growsData } = useGrows();
  const grows = (growsData as any)?.grows || [];

  const createReminder = useCreateReminder();
  const completeReminder = useCompleteReminder();
  const skipReminder = useSkipReminder();
  const deleteReminder = useDeleteReminder();

  // Client-side filter calendar by growId
  const rawCalendar = calData?.calendar || {};
  const calendar = filterGrowId
    ? Object.fromEntries(
        Object.entries(rawCalendar).map(([date, reminders]) => [
          date,
          (reminders as Reminder[]).filter((r) => r.growId === filterGrowId),
        ])
      )
    : rawCalendar;
  const days = getDaysInMonth(year, month);
  const todayKey = toDateKey(today);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  function openCreate(dateStr?: string) {
    setFormDate(dateStr || toDateKey(today));
    setFormTitle('');
    setFormType('watering');
    setFormTime('');
    setFormDesc('');
    setFormRecurring(false);
    setFormPattern('weekly');
    // Keep growId pre-selection if filter is active
    if (!formGrowId) setFormGrowId(filterGrowId);
    setShowCreateDialog(true);
  }

  async function handleCreate() {
    if (!formTitle.trim() || !formDate) {
      toast.error('Titel und Datum sind erforderlich');
      return;
    }
    try {
      await createReminder.mutateAsync({
        title: formTitle.trim(),
        type: formType,
        dueDate: new Date(formDate).toISOString(),
        dueTime: formTime || undefined,
        description: formDesc.trim() || undefined,
        isRecurring: formRecurring,
        recurrencePattern: formRecurring ? formPattern : undefined,
        growId: formGrowId || undefined,
      });
      toast.success('Erinnerung erstellt!');
      setShowCreateDialog(false);
    } catch {
      toast.error('Fehler beim Erstellen');
    }
  }

  const overdue = (overdueData?.reminders || []).filter(
    (r) => !filterGrowId || r.growId === filterGrowId
  );
  const upcoming = (upcomingData?.reminders || []).filter(
    (r) => !filterGrowId || r.growId === filterGrowId
  );
  const activeGrow = filterGrowId ? grows.find((g: any) => (g.id || g._id) === filterGrowId) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <CalendarDays className="h-6 w-6 sm:h-8 sm:w-8" />
              Grow-Kalender
            </h1>
            <p className="text-muted-foreground">Erinnerungen und Aufgaben für deine Grows</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Grow Filter */}
            {grows.length > 0 && (
              <Select value={filterGrowId || 'all'} onValueChange={(v) => setFilterGrowId(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Alle Grows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Grows</SelectItem>
                  {grows.map((g: any) => (
                    <SelectItem key={g.id || g._id} value={g.id || g._id}>
                      {g.strainName || g.strain?.name || 'Unbenannt'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={() => openCreate()}>
              <Plus className="h-4 w-4 mr-2" />
              Erinnerung
            </Button>
          </div>
        </div>

        {/* Active Grow Filter Banner */}
        {activeGrow && (
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/30 px-4 py-2 text-sm">
            <Sprout className="h-4 w-4 text-primary" />
            <span className="font-medium">Filter aktiv:</span>
            <span>{activeGrow.strainName || activeGrow.strain?.name || 'Grow'}</span>
            <button
              className="ml-auto text-muted-foreground hover:text-foreground"
              onClick={() => setFilterGrowId('')}
            >
              ✕
            </button>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Gesamt', value: stats.total, color: '' },
              { label: 'Ausstehend', value: stats.pending, color: 'text-blue-600' },
              { label: 'Diese Woche', value: stats.upcomingWeek, color: 'text-green-600' },
              { label: 'Überfällig', value: stats.overdue, color: 'text-red-600' },
              { label: 'Erledigt', value: stats.completed, color: 'text-muted-foreground' },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-3">
                  <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Calendar */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg">
                  {MONTH_NAMES[month - 1]} {year}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              {calLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                  {days.map((day, idx) => {
                    const key = toDateKey(day);
                    const isCurrentMonth = day.getMonth() + 1 === month;
                    const isToday = key === todayKey;
                    const dayReminders = calendar[key] || [];

                    return (
                      <div
                        key={idx}
                        className={cn(
                          'bg-background min-h-[56px] sm:min-h-[80px] p-1 sm:p-1.5 relative',
                          !isCurrentMonth && 'opacity-30',
                          isToday && 'bg-primary/5'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={cn(
                              'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                              isToday && 'bg-primary text-primary-foreground'
                            )}
                          >
                            {day.getDate()}
                          </span>
                          {isCurrentMonth && (
                            <button
                              onClick={() => openCreate(key)}
                              className="opacity-0 hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-foreground"
                              title="Erinnerung hinzufügen"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {dayReminders.slice(0, 3).map((r) => (
                            <ReminderBadge
                              key={r._id}
                              reminder={r}
                              onComplete={() => {
                                completeReminder.mutate(r._id);
                                toast.success('Als erledigt markiert');
                              }}
                              onSkip={() => {
                                skipReminder.mutate(r._id);
                                toast.success('Übersprungen');
                              }}
                              onDelete={() => {
                                deleteReminder.mutate(r._id);
                                toast.success('Gelöscht');
                              }}
                            />
                          ))}
                          {dayReminders.length > 3 && (
                            <span className="text-xs text-muted-foreground pl-1">
                              +{dayReminders.length - 3} mehr
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sidebar: Overdue + Upcoming */}
          <div className="space-y-4">
            {/* Overdue */}
            {overdue.length > 0 && (
              <Card className="border-red-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    Überfällig ({overdue.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {overdue.map((r) => {
                    const cfg = TYPE_CONFIG[r.type];
                    return (
                      <div key={r._id} className="flex items-center gap-2 text-sm">
                        <span className={cn('flex-shrink-0', cfg.color)}>{cfg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{r.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.dueDate).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={() => {
                            completeReminder.mutate(r._id);
                            toast.success('Erledigt!');
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Upcoming */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Nächste 7 Tage
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Keine bevorstehenden Erinnerungen
                  </p>
                ) : (
                  <div className="space-y-2">
                    {upcoming.map((r) => {
                      const cfg = TYPE_CONFIG[r.type];
                      const dueDate = new Date(r.dueDate);
                      const isToday = toDateKey(dueDate) === todayKey;
                      return (
                        <div key={r._id} className="flex items-center gap-2 text-sm">
                          <span className={cn('flex-shrink-0', cfg.color)}>{cfg.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{r.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {isToday ? 'Heute' : dueDate.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                              {r.dueTime && ` · ${r.dueTime}`}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0"
                            onClick={() => {
                              completeReminder.mutate(r._id);
                              toast.success('Erledigt!');
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Legende</p>
                <div className="space-y-1.5">
                  {(Object.entries(TYPE_CONFIG) as [ReminderType, (typeof TYPE_CONFIG)[ReminderType]][]).map(
                    ([type, cfg]) => (
                      <div key={type} className="flex items-center gap-2 text-xs">
                        <span className={cn(cfg.color)}>{cfg.icon}</span>
                        <span>{cfg.label}</span>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Erinnerung</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Titel *</label>
              <Input
                placeholder="z.B. Gießen, Düngen..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Typ</label>
                <Select value={formType} onValueChange={(v) => setFormType(v as ReminderType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TYPE_CONFIG) as [ReminderType, (typeof TYPE_CONFIG)[ReminderType]][]).map(
                      ([t, cfg]) => (
                        <SelectItem key={t} value={t}>
                          {cfg.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Zeit (optional)</label>
                <Input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Datum *</label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            {grows.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1 block">Grow (optional)</label>
                <Select value={formGrowId || 'none'} onValueChange={(v) => setFormGrowId(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kein Grow" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein Grow</SelectItem>
                    {grows.map((g: any) => (
                      <SelectItem key={g.id || g._id} value={g.id || g._id}>
                        {g.strainName || g.strain?.name || 'Unbenannt'}
                        {g.status ? ` (${g.status})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">Notiz (optional)</label>
              <Textarea
                placeholder="Zusätzliche Infos..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={2}
                maxLength={1000}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Wiederholung</label>
              <Select
                value={formRecurring ? formPattern : 'none'}
                onValueChange={(v) => {
                  if (v === 'none') {
                    setFormRecurring(false);
                  } else {
                    setFormRecurring(true);
                    setFormPattern(v as RecurrencePattern);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Wiederholung</SelectItem>
                  <SelectItem value="daily">Täglich</SelectItem>
                  <SelectItem value="every_2_days">Alle 2 Tage</SelectItem>
                  <SelectItem value="every_3_days">Alle 3 Tage</SelectItem>
                  <SelectItem value="weekly">Wöchentlich</SelectItem>
                  <SelectItem value="biweekly">Alle 2 Wochen</SelectItem>
                  <SelectItem value="monthly">Monatlich</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={createReminder.isPending}>
              {createReminder.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Erstellen...
                </>
              ) : (
                'Erstellen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

'use client';

import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useReportContent } from '@/hooks/use-community';
import { toast } from 'sonner';

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'abuse', label: 'Beleidigend / Missbrauch' },
  { value: 'harassment', label: 'Belästigung' },
  { value: 'illegal', label: 'Illegaler Inhalt' },
  { value: 'misinformation', label: 'Falschinformation' },
  { value: 'other', label: 'Sonstiges' },
] as const;

type Reason = typeof REASONS[number]['value'];

interface ReportButtonProps {
  targetId: string;
  targetType: 'thread' | 'reply';
  size?: 'sm' | 'default';
}

export function ReportButton({ targetId, targetType, size = 'sm' }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>('spam');
  const [description, setDescription] = useState('');
  const report = useReportContent();

  const handleSubmit = async () => {
    try {
      await report.mutateAsync({ targetId, targetType, reason, description: description || undefined });
      toast.success('Meldung eingereicht. Danke!');
      setOpen(false);
      setReason('spam');
      setDescription('');
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      if (msg === 'ALREADY_REPORTED') {
        toast.error('Du hast diesen Inhalt bereits gemeldet.');
      } else {
        toast.error('Fehler beim Melden. Bitte erneut versuchen.');
      }
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
      >
        <Flag className="h-3 w-3" />
        Melden
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-3">
      <p className="text-sm font-medium text-destructive">Inhalt melden</p>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Grund</p>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                reason === r.value
                  ? 'bg-destructive text-white border-destructive'
                  : 'border-border text-muted-foreground hover:border-destructive hover:text-destructive'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Beschreibung (optional)</p>
        <Textarea
          placeholder="Weitere Details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={500}
          className="text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={handleSubmit}
          disabled={report.isPending}
          className="h-7 text-xs px-3"
        >
          {report.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Meldung abschicken'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
          className="h-7 text-xs px-3"
        >
          Abbrechen
        </Button>
      </div>
    </div>
  );
}

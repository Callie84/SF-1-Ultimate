'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquare, X, Send, Loader2, CheckCircle, Bug, Lightbulb, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
import api from '@/lib/api-client';

type FeedbackType = 'bug' | 'idee' | 'lob';

const TYPES: { value: FeedbackType; label: string; icon: React.ComponentType<{ className?: string }>; active: string }[] = [
  { value: 'bug',  label: 'Bug',  icon: Bug,        active: 'border-red-500/50 bg-red-500/10 text-red-400' },
  { value: 'idee', label: 'Idee', icon: Lightbulb,  active: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400' },
  { value: 'lob',  label: 'Lob',  icon: Heart,      active: 'border-green-500/50 bg-green-500/10 text-green-400' },
];

export function FeedbackButton() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen]       = useState(false);
  const [sent, setSent]       = useState(false);
  const [sending, setSending] = useState(false);
  const [type, setType]       = useState<FeedbackType>('idee');
  const [message, setMessage] = useState('');
  const [email, setEmail]     = useState('');

  if (pathname?.startsWith('/admin')) return null;

  const handleClose = () => {
    setOpen(false);
    setSent(false);
    setMessage('');
    setEmail('');
    setType('idee');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.length < 10) {
      toast.error('Bitte schreib mindestens 10 Zeichen');
      return;
    }
    const resolvedEmail = user?.email || email;
    if (!resolvedEmail) {
      toast.error('Bitte gib deine E-Mail-Adresse an');
      return;
    }
    setSending(true);
    try {
      await api.post('/api/notifications/contact', {
        name:    user?.username || 'Anonym',
        email:   resolvedEmail,
        subject: `Feedback: ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        message,
      });
      setSent(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Fehler beim Senden. Bitte versuche es später erneut.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:bg-green-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500/50"
        aria-label="Feedback geben"
      >
        <MessageSquare className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center sm:justify-end sm:p-6"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div className="w-full rounded-2xl border border-white/10 bg-[#1a1a2e] p-5 shadow-2xl sm:w-96">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Feedback geben</h2>
              <button
                onClick={handleClose}
                className="text-gray-500 transition-colors hover:text-white"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {sent ? (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle className="mb-3 h-12 w-12 text-green-500" />
                <p className="mb-1 font-medium text-white">Danke für dein Feedback!</p>
                <p className="mb-4 text-sm text-gray-400">Wir schauen es uns an.</p>
                <Button
                  onClick={handleClose}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  Schließen
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  {TYPES.map(({ value, label, icon: Icon, active }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setType(value)}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                        type === value
                          ? active
                          : 'border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Was möchtest du uns mitteilen?"
                  rows={4}
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />

                {!user?.email && (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-Mail (optional)"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  />
                )}

                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-green-600 text-white hover:bg-green-700"
                >
                  {sending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wird gesendet...</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" />Senden</>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

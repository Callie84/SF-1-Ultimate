'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '@/lib/api-client';

const STORAGE_KEY = 'sf1_seen_announcement';

export function AnnouncementModal() {
  const [announcement, setAnnouncement] = useState<{ _id: string; title: string; content: string; version: number; ctaUrl?: string; ctaLabel?: string } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    api.get('/api/community/announcement')
      .then((data: any) => {
        const a = data?.announcement;
        if (!a) return;

        const seenKey = `${a._id}_v${a.version}`;
        if (localStorage.getItem(STORAGE_KEY) === seenKey) return;

        setAnnouncement(a);
        setVisible(true);
      })
      .catch(() => {});
  }, []);

  const close = () => {
    if (!announcement) return;
    const seenKey = `${announcement._id}_v${announcement.version}`;
    localStorage.setItem(STORAGE_KEY, seenKey);
    setVisible(false);
  };

  if (!visible || !announcement) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-xl border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold pr-8">{announcement.title}</h2>
          <button
            onClick={close}
            className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Inhalt */}
        <div className="px-6 py-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {announcement.content}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-3">
          {announcement.ctaUrl && (
            <a
              href={announcement.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {announcement.ctaLabel || 'Jetzt ansehen'}
            </a>
          )}
          <button
            onClick={close}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

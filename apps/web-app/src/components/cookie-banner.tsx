'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('sf1_cookies_accepted');
    if (!accepted) {
      // Kurze Verzögerung damit Seite zuerst lädt
      setTimeout(() => setVisible(true), 800);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('sf1_cookies_accepted', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl bg-card border rounded-xl shadow-2xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Cookie className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Wir verwenden ausschließlich technisch notwendige Cookies für den Login-Betrieb
            (<code className="text-xs bg-muted px-1 rounded">sf1_access_token</code>,{' '}
            <code className="text-xs bg-muted px-1 rounded">sf1_refresh_token</code>).
            Keine Tracking- oder Werbe-Cookies.{' '}
            <Link href="/privacy" className="text-primary hover:underline whitespace-nowrap">
              Datenschutzerklärung
            </Link>
          </p>
        </div>
        <Button onClick={accept} size="sm" className="shrink-0 w-full sm:w-auto">
          Verstanden
        </Button>
      </div>
    </div>
  );
}

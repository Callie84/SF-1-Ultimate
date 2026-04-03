'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Loader2, Sprout } from 'lucide-react';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const refreshToken = params.get('refreshToken');
    const errorParam = params.get('error');

    if (errorParam) {
      const messages: Record<string, string> = {
        oauth_cancelled: 'Anmeldung abgebrochen.',
        oauth_failed: 'Google-Anmeldung fehlgeschlagen. Bitte versuche es erneut.',
        oauth_no_email: 'Dein Google-Konto hat keine E-Mail-Adresse freigegeben.',
        beta_full: 'Alle 50 Beta-Plätze sind vergeben. Der offizielle Launch findet Anfang April statt — komm dann wieder!',
      };
      setError(messages[errorParam] || 'Anmeldung fehlgeschlagen.');
      setTimeout(() => router.replace('/auth/login'), 5000);
      return;
    }

    if (!token || !refreshToken) {
      setError('Ungültige Antwort vom Server.');
      setTimeout(() => router.replace('/auth/login'), 3000);
      return;
    }

    // Tokens als Cookies speichern (gleich wie normaler Login)
    Cookies.set('sf1_access_token', token, { expires: 7 });
    Cookies.set('sf1_refresh_token', refreshToken, { expires: 30 });

    // Zum Dashboard weiterleiten
    router.replace('/dashboard');
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/10 to-background p-4">
        <div className="text-center space-y-4">
          <div className="rounded-full bg-destructive/10 p-4 inline-block">
            <Sprout className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-destructive font-medium">{error}</p>
          <p className="text-sm text-muted-foreground">Du wirst zur Anmeldeseite weitergeleitet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/10 to-background p-4">
      <div className="text-center space-y-4">
        <div className="rounded-full bg-primary/10 p-4 inline-block">
          <Sprout className="h-8 w-8 text-primary" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Anmeldung wird abgeschlossen...</span>
        </div>
      </div>
    </div>
  );
}

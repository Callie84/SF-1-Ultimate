'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Cookies from 'js-cookie';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/providers/auth-provider';
import api from '@/lib/api-client';

const MAX_ATTEMPTS = 3;

// Zwei Modi:
// "login"  — regulärer User hat 2FA aktiviert, verifiziert nach Login (mfa_token aus sessionStorage)
// "admin"  — Admin-Step-up beim ersten Besuch von /admin (JWT reicht, kein mfa_token nötig)

export default function TwoFactorPage() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [mode, setMode] = useState<'login' | 'admin' | null>(null);
  const [nextUrl, setNextUrl] = useState('/dashboard');
  const router = useRouter();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get('mode');
    const urlNext = params.get('next');
    if (urlNext && urlNext.startsWith('/') && !urlNext.startsWith('//')) {
      setNextUrl(urlNext);
    }

    if (urlMode === 'admin') {
      setMode('admin');
    } else {
      // Login-Modus: mfa_token muss in sessionStorage liegen
      const token = sessionStorage.getItem('mfa_token');
      if (!token) {
        router.replace('/auth/login');
        return;
      }
      setMode('login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !mode) return;

    setIsLoading(true);
    try {
      if (mode === 'admin') {
        // Step-up: verifiziert TOTP mit vorhandenem JWT
        await api.post('/api/auth/admin/unlock', { code: code.trim() });
        sessionStorage.setItem('sf1_admin_2fa_ok', '1');
        toast.success('Admin-Zugang freigeschaltet');
        router.push(nextUrl);
      } else {
        // Login-2FA: tauscht mfa_token + TOTP gegen echte Tokens
        const mfaToken = sessionStorage.getItem('mfa_token')!;
        const res = await api.post('/api/auth/2fa/login', {
          mfa_token: mfaToken,
          code: code.trim(),
        }) as any;
        sessionStorage.removeItem('mfa_token');
        Cookies.set('sf1_access_token', res.accessToken, { expires: 7 });
        Cookies.set('sf1_refresh_token', res.refreshToken, { expires: 30 });
        await refreshUser();
        toast.success('Login erfolgreich!');
        router.push(nextUrl);
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Ungültiger Code';
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        toast.error('Zu viele Fehlversuche.');
        if (mode === 'login') {
          sessionStorage.removeItem('mfa_token');
          router.replace('/auth/login');
        } else {
          router.replace('/dashboard');
        }
        return;
      }

      toast.error(`${msg} — noch ${MAX_ATTEMPTS - newAttempts} Versuch${MAX_ATTEMPTS - newAttempts === 1 ? '' : 'e'}`);
      setCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (mode === 'login') {
      sessionStorage.removeItem('mfa_token');
      router.replace('/auth/login');
    } else {
      router.replace('/dashboard');
    }
  };

  if (!mode) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/10 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {mode === 'admin' ? 'Admin-Bereich sichern' : 'Zwei-Faktor-Authentifizierung'}
          </CardTitle>
          <CardDescription>
            {useBackupCode
              ? 'Gib einen deiner Backup-Codes ein'
              : mode === 'admin'
                ? 'Einmalig pro Session: Gib deinen 6-stelligen Authenticator-Code ein'
                : 'Gib den 6-stelligen Code aus deiner Authenticator-App ein'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium">
                {useBackupCode ? 'Backup-Code' : 'Authentifizierungs-Code'}
              </label>
              <Input
                id="code"
                type="text"
                inputMode={useBackupCode ? 'text' : 'numeric'}
                placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={useBackupCode ? 9 : 6}
                className="text-center text-2xl tracking-widest"
                autoComplete="one-time-code"
                autoFocus
                disabled={isLoading}
              />
            </div>

            {attempts > 0 && (
              <p className="text-sm text-destructive text-center">
                {MAX_ATTEMPTS - attempts} Versuch{MAX_ATTEMPTS - attempts === 1 ? '' : 'e'} verbleibend
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || !code.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Prüfe Code...
                </>
              ) : (
                'Bestätigen'
              )}
            </Button>
          </CardContent>
        </form>

        <CardFooter className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => { setUseBackupCode(!useBackupCode); setCode(''); }}
            className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
          >
            {useBackupCode ? 'Authenticator-App verwenden' : 'Backup-Code verwenden'}
          </button>
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
          >
            <ArrowLeft className="h-3 w-3" />
            {mode === 'admin' ? 'Zurück zum Dashboard' : 'Zurück zum Login'}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}

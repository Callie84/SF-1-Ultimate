'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, Sprout, RefreshCw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import api from '@/lib/api-client';
import { toast } from 'sonner';

type State = 'idle' | 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [resending, setResending] = useState(false);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Bei Link-Aufruf mit ?code= → Digits vorausfüllen + auto-submit
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && /^\d{6}$/.test(code)) {
      const newDigits = code.split('');
      setDigits(newDigits);
      // Kurz warten dann auto-submit
      setTimeout(() => submitCode(code), 500);
    }
  }, []);

  const submitCode = async (code: string) => {
    setState('loading');
    try {
      await api.post('/api/auth/verify-email', { code });
      setState('success');
    } catch (err: any) {
      setState('error');
      setErrorMsg(err?.response?.data?.error || 'Ungültiger oder abgelaufener Code');
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    // Nächstes Feld fokussieren
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = () => {
    const code = digits.join('');
    if (code.length !== 6) {
      toast.error('Bitte alle 6 Ziffern eingeben');
      return;
    }
    submitCode(code);
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/api/auth/send-verification-email', {});
      toast.success('Neuer Code gesendet – prüfe dein E-Mail-Postfach');
      setDigits(['', '', '', '', '', '']);
      setState('idle');
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Fehler beim Senden');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/10 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              {state === 'loading' && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
              {state === 'success' && <CheckCircle className="h-8 w-8 text-green-500" />}
              {state === 'error' && <XCircle className="h-8 w-8 text-destructive" />}
              {(state === 'idle') && <Mail className="h-8 w-8 text-primary" />}
            </div>
          </div>
          <CardTitle className="text-2xl">
            {state === 'loading' && 'Code wird geprüft...'}
            {state === 'success' && 'E-Mail bestätigt!'}
            {state === 'error' && 'Code ungültig'}
            {state === 'idle' && 'E-Mail bestätigen'}
          </CardTitle>
          <CardDescription>
            {state === 'loading' && 'Einen Moment bitte...'}
            {state === 'success' && 'Deine E-Mail-Adresse wurde erfolgreich bestätigt. Du kannst jetzt alle Funktionen nutzen.'}
            {state === 'error' && (errorMsg || 'Der Code ist ungültig oder abgelaufen.')}
            {state === 'idle' && 'Gib den 6-stelligen Code aus deiner E-Mail ein.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Erfolgreich */}
          {state === 'success' && (
            <Button asChild className="w-full">
              <Link href="/dashboard">Zum Dashboard</Link>
            </Button>
          )}

          {/* Code-Eingabe (idle + error) */}
          {(state === 'idle' || state === 'error') && (
            <>
              {/* 6 Eingabefelder */}
              <div className="flex justify-center gap-2 sm:gap-3 my-4">
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    className="w-10 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold rounded-lg border-2 bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  />
                ))}
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={digits.join('').length !== 6}
              >
                Code bestätigen
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Keinen Code erhalten?</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Neuen Code senden
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link href="/dashboard">Später</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

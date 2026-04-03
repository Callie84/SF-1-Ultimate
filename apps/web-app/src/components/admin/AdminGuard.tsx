'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import api from '@/lib/api-client';

const SESSION_KEY = 'sf1_admin_unlocked';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    // Kein 2FA eingerichtet → direkt freischalten
    if (!(user as any).totpEnabled) {
      setUnlocked(true);
      setChecking(false);
      return;
    }
    // Prüfen ob diese Session bereits entsperrt wurde
    const token = sessionStorage.getItem(SESSION_KEY);
    if (token) {
      setUnlocked(true);
    }
    setChecking(false);
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!checking && !unlocked) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [checking, unlocked]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    try {
      const res: any = await api.post('/api/auth/admin/unlock', { code: code.trim() });
      sessionStorage.setItem(SESSION_KEY, res.adminSessionToken);
      setUnlocked(true);
      toast.success('Admin-Bereich entsperrt');
    } catch (err: any) {
      toast.error('Ungültiger Code', { description: err.message });
      setCode('');
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-full max-w-sm space-y-6 p-8">
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Admin-Bereich</h1>
            <p className="text-sm text-muted-foreground">
              Gib deinen 2FA-Code ein um fortzufahren
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="totp-code">Authenticator-Code</Label>
              <Input
                id="totp-code"
                ref={inputRef}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000 000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="text-center text-lg tracking-widest font-mono"
                disabled={submitting}
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={submitting || code.length < 6}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Entsperren
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Du bleibst entsperrt bis du dich ausloggst
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

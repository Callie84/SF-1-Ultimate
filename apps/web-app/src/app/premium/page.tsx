'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
import api from '@/lib/api-client';
import {
  Crown,
  Check,
  Sprout,
  Image,
  Bot,
  Bell,
  BarChart3,
  Loader2,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Sprout,
    title: 'Unbegrenzte Grows',
    free: '3 aktive Grows',
    premium: 'Unbegrenzt',
  },
  {
    icon: Image,
    title: 'Fotos pro Grow',
    free: '20 Fotos',
    premium: 'Unbegrenzt',
  },
  {
    icon: Bot,
    title: 'KI-Assistent',
    free: '5 Anfragen / Tag',
    premium: '50 Anfragen / Tag',
  },
  {
    icon: Bell,
    title: 'Preis-Alarme',
    free: '3 Alarme',
    premium: 'Unbegrenzt',
  },
  {
    icon: Crown,
    title: 'Premium-Badge',
    free: '—',
    premium: 'Sichtbar im Profil',
  },
  {
    icon: BarChart3,
    title: 'Grow-Statistiken',
    free: 'Basis',
    premium: 'Erweitert',
  },
];

export default function PremiumPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);

  const handleCheckout = async (plan: 'monthly' | 'yearly') => {
    if (!user) {
      toast.error('Bitte zuerst einloggen');
      router.push('/auth/login?redirect=/premium');
      return;
    }

    setLoading(plan);
    try {
      const data = await api.post('/api/auth/billing/checkout', { plan }) as { url: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Fehler beim Starten des Checkouts';
      toast.error(msg);
      setLoading(null);
    }
  };

  const isPremium = user && (user as any).premium;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-10 py-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-4 py-1.5 text-yellow-700 dark:text-yellow-400 text-sm font-medium">
            <Crown className="h-4 w-4" />
            SeedFinderPro Premium
          </div>
          <h1 className="text-3xl font-bold">Dein Grow. Dein Tempo.</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Unlock das volle Potenzial deiner Grows — mehr Speicher, mehr KI, mehr Kontrolle.
          </p>
        </div>

        {/* Bereits Premium */}
        {isPremium && (
          <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10">
            <CardContent className="flex items-center gap-3 py-4">
              <Crown className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-300">Du bist bereits Premium-Mitglied!</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Abo verwalten oder kündigen:{' '}
                  <button
                    className="underline hover:no-underline"
                    onClick={async () => {
                      try {
                        const data = await api.post('/api/auth/billing/portal', {}) as { url: string };
                        window.location.href = data.url;
                      } catch {
                        toast.error('Fehler beim Öffnen des Kundenportals');
                      }
                    }}
                  >
                    Stripe-Kundenportal öffnen
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preispläne */}
        {!isPremium && (
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Monatlich */}
            <Card className="relative border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-xl">Monatlich</CardTitle>
                <CardDescription>Flexibel, jederzeit kündbar</CardDescription>
                <div className="mt-2">
                  <span className="text-4xl font-bold">4,99€</span>
                  <span className="text-muted-foreground"> / Monat</span>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => handleCheckout('monthly')}
                  disabled={!!loading}
                >
                  {loading === 'monthly' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Weiterleitung...</>
                  ) : (
                    <><Crown className="mr-2 h-4 w-4" />Jetzt starten</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Jährlich */}
            <Card className="relative border-2 border-primary">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground whitespace-nowrap">
                2 Monate gratis
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Jährlich</CardTitle>
                <CardDescription>Beste Ersparnis — 39,99€/Jahr</CardDescription>
                <div className="mt-2">
                  <span className="text-4xl font-bold">3,33€</span>
                  <span className="text-muted-foreground"> / Monat</span>
                </div>
                <p className="text-xs text-muted-foreground">39,99€ jährlich abgerechnet</p>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => handleCheckout('yearly')}
                  disabled={!!loading}
                >
                  {loading === 'yearly' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Weiterleitung...</>
                  ) : (
                    <><Crown className="mr-2 h-4 w-4" />Jetzt starten</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Feature-Vergleich */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Was ist enthalten?</h2>
          <div className="rounded-lg border overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 bg-muted/50 text-sm font-medium px-4 py-3">
              <span>Feature</span>
              <span className="text-center text-muted-foreground">Free</span>
              <span className="text-center text-primary">Premium</span>
            </div>
            {/* Rows */}
            {FEATURES.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`grid grid-cols-3 px-4 py-3 text-sm items-center ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{f.title}</span>
                  </div>
                  <span className="text-center text-muted-foreground">{f.free}</span>
                  <div className="flex items-center justify-center gap-1.5 text-primary font-medium">
                    <Check className="h-4 w-4 flex-shrink-0" />
                    {f.premium}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Sicher bezahlen</strong> — Alle Zahlungen laufen über Stripe.
            Kreditkarte, SEPA-Lastschrift und mehr werden unterstützt.
          </p>
          <p>
            <strong className="text-foreground">Keine Bindung</strong> — Monatliches Abo jederzeit zum Monatsende
            kündbar. Jährliches Abo zum Jahresende.
          </p>
          <p>
            <strong className="text-foreground">Sofortiger Zugang</strong> — Premium-Features sind sofort nach
            erfolgreicher Zahlung freigeschaltet.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Sprout, ArrowRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function PremiumSuccessPage() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // User-Daten neu laden damit Premium-Status sofort sichtbar ist
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  }, [queryClient]);

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto py-16">
        <Card className="text-center border-yellow-300">
          <CardContent className="py-10 space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 p-5">
                <Crown className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Willkommen bei Premium!</h1>
              <p className="text-muted-foreground">
                Dein Abonnement ist aktiv. Alle Premium-Features sind sofort freigeschaltet.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button asChild>
                <Link href="/grows/new">
                  <Sprout className="mr-2 h-4 w-4" />
                  Ersten Grow starten
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">
                  Zum Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Abo verwalten oder kündigen:{' '}
              <Link href="/settings/billing" className="underline hover:no-underline">
                Einstellungen → Abonnement
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

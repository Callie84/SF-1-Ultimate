'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Leaf, Users, Brain, TrendingDown } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/landing">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>

        <h1 className="mb-8 text-4xl font-bold">Über SeedFinderPro</h1>

        <div className="max-w-none space-y-6">
          <p className="text-lg text-muted-foreground">
            SeedFinderPro ist der deutsche Preisvergleich für Cannabis-Samen — mit Strain-Datenbank, KI-Assistent und Growing-Community. Aktuell 11.500+ Samen aus 19 Seedbanks täglich aktualisiert.
          </p>

          <div className="grid gap-6 md:grid-cols-2 mt-8">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Preisvergleich</h3>
              <p className="text-muted-foreground">
                Vergleiche Preise verschiedener Seedbanks und finde die besten Angebote für deine bevorzugten Strains — kostenlos, ohne Anmeldung.
              </p>
            </div>

            <div className="space-y-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Leaf className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Grow-Journal</h3>
              <p className="text-muted-foreground">
                Dokumentiere deine Grows mit detaillierten Einträgen, Fotos und Messwerten. Verfolge den Fortschritt deiner Pflanzen von der Keimung bis zur Ernte.
              </p>
            </div>

            <div className="space-y-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Community</h3>
              <p className="text-muted-foreground">
                Tausche dich mit anderen Growern aus, stelle Fragen und teile dein Wissen in unseren thematisch organisierten Foren.
              </p>
            </div>

            <div className="space-y-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">KI-Assistent</h3>
              <p className="text-muted-foreground">
                Unser KI-Assistent hilft dir bei Problemen, gibt Anbautipps und kann Pflanzenkrankheiten anhand von Fotos diagnostizieren.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t">
            <h3 className="text-xl font-semibold mb-4">Kontakt</h3>
            <p className="text-muted-foreground">
              Hast du Fragen oder Anregungen? Schreib uns eine Nachricht über unsere{' '}
              <Link href="/contact" className="text-primary hover:underline">Kontaktseite</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

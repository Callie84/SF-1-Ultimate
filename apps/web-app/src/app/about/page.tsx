'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

        <h1 className="mb-8 text-4xl font-bold">Über SeedfinderPro</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-lg text-muted-foreground">
            SeedfinderPro (SF-1 Ultimate) ist die umfassende Community-Plattform für Cannabis-Anbauer.
            Wir bieten Werkzeuge, Wissen und eine aktive Gemeinschaft, um deinen Grow auf das nächste Level zu bringen.
          </p>

          <div className="grid gap-6 md:grid-cols-2 mt-8">
            <Card>
              <CardHeader>
                <Leaf className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Grow-Journal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Dokumentiere deine Grows mit detaillierten Einträgen, Fotos und Messwerten.
                  Verfolge den Fortschritt deiner Pflanzen von der Keimung bis zur Ernte.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Community</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Tausche dich mit anderen Growern aus, stelle Fragen und teile dein Wissen
                  in unseren thematisch organisierten Foren.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Brain className="h-8 w-8 text-primary mb-2" />
                <CardTitle>KI-Assistent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Unser KI-gestützter Assistent hilft dir bei Problemen, gibt Anbautipps
                  und kann Pflanzenkrankheiten anhand von Fotos diagnostizieren.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingDown className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Preisvergleich</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Vergleiche Preise verschiedener Seedbanks und finde die besten Angebote
                  für deine bevorzugten Strains.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-8">
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-4">Kontakt</h3>
              <p className="text-muted-foreground">
                Hast du Fragen oder Anregungen? Schreib uns eine Nachricht über unsere{' '}
                <Link href="/contact" className="text-primary hover:underline">Kontaktseite</Link>.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

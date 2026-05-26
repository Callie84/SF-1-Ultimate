import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Metadata } from 'next';
import {
  Sprout,
  Search,
  BookOpen,
  Users,
  Brain,
  TrendingDown,
  Zap,
  Award,
  ArrowRight,
  CheckCircle,
  Leaf,
  ShoppingCart,
  LogIn,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'SeedFinderPro — Cannabis Samen Preisvergleich & Strain-Datenbank',
  description: 'Vergleiche Preise von 2800+ Cannabis Samen aus 12 Seedbanks. Kostenloser Strain-Preisvergleich, Community-Forum und KI-Assistent für Grower.',
};

export default function LandingPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('sf1_access_token');
  if (token) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 to-background py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Leaf className="h-4 w-4" />
              Kostenloser Samen-Preisvergleich
            </div>

            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
              Der deutsche{' '}
              <span className="text-primary">Preisvergleich</span>
              {' '}für Cannabis-Samen
            </h1>

            <p className="mb-8 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
              Vergleiche Preise von <strong>2800+ Samen</strong> aus <strong>12 Seedbanks</strong> —
              kostenlos, ohne Anmeldung. Plus Community-Forum, Grow-Tagebuch und KI-Assistent.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="text-lg gap-2">
                <Link href="/auth/register">
                  <Sprout className="h-5 w-5" />
                  Kostenlos registrieren
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg gap-2">
                <Link href="/auth/login">
                  <LogIn className="h-5 w-5" />
                  Anmelden
                </Link>
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 max-w-2xl mx-auto">
              {[
                { value: '2800+', label: 'Samen' },
                { value: '183', label: 'Strain-Profile' },
                { value: '12', label: 'Seedbanks' },
                { value: '100%', label: 'Kostenlos' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border bg-background/80 p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Alles was du brauchst
            </h2>
            <p className="text-lg text-muted-foreground">
              Preisvergleich, Strain-Info, Community und KI — alles auf einer Plattform
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-primary/20 hover:border-primary transition-colors">
              <CardHeader>
                <TrendingDown className="mb-2 h-10 w-10 text-primary" />
                <CardTitle>Samen-Preisvergleich</CardTitle>
                <CardDescription>
                  2800+ Samen aus 12 Seedbanks täglich aktualisiert. Finde den günstigsten Preis sofort.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-primary/20 hover:border-primary transition-colors">
              <CardHeader>
                <Leaf className="mb-2 h-10 w-10 text-primary" />
                <CardTitle>Strain-Datenbank</CardTitle>
                <CardDescription>
                  183 Cannabis-Profile mit THC/CBD-Werten, Terpenprofil, Wirkungen und Aromen. Inkl. Preisvergleich.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-primary/20 hover:border-primary transition-colors">
              <CardHeader>
                <Brain className="mb-2 h-10 w-10 text-primary" />
                <CardTitle>KI-Assistent</CardTitle>
                <CardDescription>
                  GPT-4o analysiert deine Pflanzen-Fotos, empfiehlt Strains und beantwortet Grow-Fragen sofort.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-primary/20 hover:border-primary transition-colors">
              <CardHeader>
                <Users className="mb-2 h-10 w-10 text-primary" />
                <CardTitle>Community Forum</CardTitle>
                <CardDescription>
                  Reddit-Style Forum mit Kategorien, Upvotes und Direktnachrichten für alle Grower.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-primary/20 hover:border-primary transition-colors">
              <CardHeader>
                <BookOpen className="mb-2 h-10 w-10 text-primary" />
                <CardTitle>Grow-Tagebuch</CardTitle>
                <CardDescription>
                  Dokumentiere deinen Grow mit Timeline, Notizen und Community-Feedback. Mit Exportfunktion.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-primary/20 hover:border-primary transition-colors">
              <CardHeader>
                <Zap className="mb-2 h-10 w-10 text-primary" />
                <CardTitle>Wissenschaftliche Rechner</CardTitle>
                <CardDescription>
                  VPD, EC/PPM, DLI, PPFD, Stromkosten und CO₂ — alle wichtigen Werte präzise berechnet.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Preisvergleich Highlight */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">
                Nie wieder zu viel bezahlen
              </h2>
              <p className="text-muted-foreground mb-6">
                Unser automatischer Preisvergleich durchsucht täglich alle großen deutschen und europäischen
                Seedbanks. Du siehst auf einen Blick, wo du am günstigsten kaufen kannst.
              </p>
              <ul className="space-y-3">
                {[
                  'Preise täglich automatisch aktualisiert',
                  'Lagerbestand direkt angezeigt',
                  'Preis-pro-Samen Berechnung',
                  'Direkt-Links zum Shop',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 gap-2">
                <Link href="/auth/register">
                  Jetzt kostenlos registrieren
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { seedbank: 'Sensi Seeds', price: '€12.50', inStock: true },
                { seedbank: 'Dutch Passion', price: '€11.90', inStock: true },
                { seedbank: 'Royal Queen Seeds', price: '€13.00', inStock: false },
                { seedbank: 'FastBuds', price: '€10.50', inStock: true },
              ].map((item) => (
                <div key={item.seedbank} className="rounded-lg border bg-background p-4">
                  <div className="font-medium text-sm">{item.seedbank}</div>
                  <div className="text-primary font-bold mt-1">{item.price}</div>
                  <div className={`text-xs mt-1 ${item.inStock ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {item.inStock ? 'Auf Lager' : 'Nicht verfügbar'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Grow-Rechner
            </h2>
            <p className="text-lg text-muted-foreground">
              Professionelle Tools für optimale Ergebnisse
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: 'VPD Calculator', desc: 'Vapor Pressure Deficit optimieren', href: '/tools/vpd' },
              { name: 'EC/PPM Calculator', desc: 'Nährstoff-Konzentration berechnen', href: '/tools/ec' },
              { name: 'DLI Calculator', desc: 'Daily Light Integral', href: '/tools/dli' },
              { name: 'PPFD Calculator', desc: 'Lichtintensität optimal einstellen', href: '/tools/ppfd' },
              { name: 'Stromkosten', desc: 'Betriebskosten kalkulieren', href: '/tools/power' },
              { name: 'CO₂ Calculator', desc: 'CO₂-Ergänzung optimieren', href: '/tools/co2' },
            ].map((tool) => (
              <Link
                key={tool.name}
                href={tool.href}
                className="flex items-center gap-3 rounded-lg border bg-background p-4 hover:bg-accent hover:border-primary transition-colors"
              >
                <Zap className="h-6 w-6 text-primary flex-shrink-0" />
                <div>
                  <div className="font-semibold">{tool.name}</div>
                  <div className="text-sm text-muted-foreground">{tool.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-20 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Bereit loszulegen?
          </h2>
          <p className="mb-8 text-lg opacity-90 max-w-xl mx-auto">
            Preisvergleich ist kostenlos und ohne Anmeldung. Für Community, Grow-Tagebuch und KI-Features kostenlos registrieren.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary" className="text-lg gap-2">
              <Link href="/auth/register">
                <Sprout className="h-5 w-5" />
                Kostenlos registrieren
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg gap-2 bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              <Link href="/auth/login">
                <LogIn className="h-5 w-5" />
                Anmelden
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sprout className="h-5 w-5 text-primary" />
              <span>© 2026 SeedFinderPro. Alle Rechte vorbehalten.</span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm justify-center md:justify-end">
              <Link href="/impressum" className="text-muted-foreground hover:text-primary">Impressum</Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-primary">Datenschutz</Link>
              <Link href="/terms" className="text-muted-foreground hover:text-primary">AGB</Link>
              <Link href="/about" className="text-muted-foreground hover:text-primary">Über uns</Link>
              <Link href="/contact" className="text-muted-foreground hover:text-primary">Kontakt</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

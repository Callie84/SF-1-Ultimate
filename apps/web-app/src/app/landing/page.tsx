'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for token in localStorage (client-side)
    const token = localStorage.getItem('sf1_access_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen">
      {/* Hero Section — Full-Bleed + Brand-First */}
      <section className="relative min-h-[70vh] sm:h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10" />
        </div>

        {/* Minimal Content — One Composition */}
        <div className="relative z-10 text-center space-y-6 px-4 max-w-3xl">
          {/* Brand Name — PROMINENT */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight">
            <span className="text-primary">SeedFinderPro</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-medium">
            Der deutsche Preisvergleich für Cannabis-Samen
          </p>

          {/* One Short Sentence */}
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Vergleiche Preise von 11.500+ Samen aus 19 Seedbanks — kostenlos, ohne Anmeldung.
          </p>

          {/* One CTA Group */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild size="lg" className="text-lg gap-2">
              <Link href="/auth/register">
                <Sprout className="h-5 w-5" />
                Kostenlos starten
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg gap-2">
              <Link href="/auth/login">
                <LogIn className="h-5 w-5" />
                Anmelden
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section — Separate, Clean */}
      <section className="py-16 bg-muted/30 border-y">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { value: '11.500+', label: 'Cannabis-Samen' },
              { value: '11.500+', label: 'Strain-Profile' },
              { value: '19', label: 'Seedbanks' },
              { value: '100%', label: 'Kostenlos' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid — Divs instead of Cards */}
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

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Samen-Preisvergleich</h3>
              <p className="text-muted-foreground">
                11.500+ Samen aus 19 Seedbanks täglich aktualisiert. Finde den günstigsten Preis sofort.
              </p>
            </div>

            <div className="space-y-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Leaf className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Strain-Datenbank</h3>
              <p className="text-muted-foreground">
                11.500+ Cannabis-Profile mit THC/CBD-Werten, Terpenprofil, Wirkungen und Aromen. Inkl. Preisvergleich.
              </p>
            </div>

            <div className="space-y-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">KI-Assistent</h3>
              <p className="text-muted-foreground">
                Unser KI-Assistent analysiert deine Pflanzen-Fotos, empfiehlt Strains und beantwortet Grow-Fragen sofort.
              </p>
            </div>

            <div className="space-y-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Community Forum</h3>
              <p className="text-muted-foreground">
                Reddit-Style Forum mit Kategorien, Upvotes und Direktnachrichten für alle Grower.
              </p>
            </div>

            <div className="space-y-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Grow-Tagebuch</h3>
              <p className="text-muted-foreground">
                Dokumentiere deinen Grow mit Timeline, Notizen und Community-Feedback. Mit Exportfunktion.
              </p>
            </div>

            <div className="space-y-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Wissenschaftliche Rechner</h3>
              <p className="text-muted-foreground">
                VPD, EC/PPM, DLI, PPFD, Stromkosten und CO₂ — alle wichtigen Werte präzise berechnet.
              </p>
            </div>
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

      {/* Tools Section — 2-col grid */}
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

          <div className="grid gap-4 md:grid-cols-2 max-w-3xl mx-auto">
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
          <div className="text-center text-xs text-muted-foreground mb-6 max-w-2xl mx-auto">
            Diese Website dient ausschließlich zu Informationszwecken und stellt keine Werbung im Sinne des KCanG dar.
            Alle Inhalte richten sich an Erwachsene (18+). Nur für legale Zwecke in Ihrer Jurisdiktion.
          </div>
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

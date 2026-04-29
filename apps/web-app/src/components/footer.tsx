import Link from 'next/link';
import { Leaf } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-muted/50 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">SeedFinderPro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Cannabis Preisvergleich, Strain-Datenbank und Growing Community.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h3 className="font-semibold">Produkt</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/prices" className="text-sm text-muted-foreground hover:text-foreground">
                Preisvergleich
              </Link>
              <Link href="/strains" className="text-sm text-muted-foreground hover:text-foreground">
                Strain-Datenbank
              </Link>
              <Link href="/grows" className="text-sm text-muted-foreground hover:text-foreground">
                Grow-Tagebücher
              </Link>
            </nav>
          </div>

          {/* Community */}
          <div className="space-y-3">
            <h3 className="font-semibold">Community</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/community" className="text-sm text-muted-foreground hover:text-foreground">
                Forum
              </Link>
              <Link href="/journal" className="text-sm text-muted-foreground hover:text-foreground">
                Journal
              </Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="font-semibold">Rechtliches</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                Datenschutz
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
                Nutzungsbedingungen
              </Link>
              <Link href="/impressum" className="text-sm text-muted-foreground hover:text-foreground">
                Impressum
              </Link>
            </nav>
          </div>
        </div>

        <div className="border-t pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground gap-4">
            <p>© 2026 SeedFinderPro. Alle Rechte vorbehalten.</p>
            <p>Nur für legale Zwecke in unterstützten Jurisdiktionen.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

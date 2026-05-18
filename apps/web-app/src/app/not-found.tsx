'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sprout, Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-4 max-w-md">
        <div className="flex justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Sprout className="h-10 w-10 text-primary" />
          </div>
        </div>

        <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-2xl font-semibold mb-3">Seite nicht gefunden</h2>
        <p className="text-muted-foreground mb-8">
          Die Seite, die du suchst, existiert nicht oder wurde verschoben.
          Vielleicht ist der Link falsch oder die Seite wurde gelöscht.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Zur Startseite
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/search">
              <Search className="h-4 w-4" />
              Suche
            </Link>
          </Button>
          <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>
        </div>
      </div>
    </div>
  );
}

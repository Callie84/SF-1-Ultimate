'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/landing">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>

        <h1 className="mb-8 text-4xl font-bold">Nutzungsbedingungen</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Stand: Februar 2026</p>

          <h2 className="text-2xl font-semibold mt-8">1. Geltungsbereich</h2>
          <p>
            Diese Nutzungsbedingungen gelten für die Nutzung der Plattform SeedfinderPro (SF-1 Ultimate).
            Mit der Registrierung akzeptierst du diese Bedingungen.
          </p>

          <h2 className="text-2xl font-semibold mt-8">2. Registrierung</h2>
          <p>
            Für die Nutzung der Plattform ist eine Registrierung erforderlich.
            Du bist für die Sicherheit deines Kontos und Passworts verantwortlich.
            Die Angabe falscher Informationen bei der Registrierung ist nicht gestattet.
          </p>

          <h2 className="text-2xl font-semibold mt-8">3. Nutzungsregeln</h2>
          <p>Bei der Nutzung der Plattform verpflichtest du dich:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Keine illegalen Inhalte zu veröffentlichen</li>
            <li>Andere Nutzer respektvoll zu behandeln</li>
            <li>Keine Spam- oder Werbeinhalte zu verbreiten</li>
            <li>Keine urheberrechtlich geschützten Inhalte ohne Berechtigung hochzuladen</li>
            <li>Die Plattform nicht für den Handel mit illegalen Substanzen zu nutzen</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8">4. Inhalte</h2>
          <p>
            Du behältst die Rechte an deinen erstellten Inhalten (Grow-Journals, Beiträge, Fotos).
            Durch das Veröffentlichen räumst du SeedfinderPro ein nicht-exklusives Recht ein,
            diese Inhalte auf der Plattform darzustellen.
          </p>

          <h2 className="text-2xl font-semibold mt-8">5. Moderation</h2>
          <p>
            Wir behalten uns das Recht vor, Inhalte zu entfernen, die gegen diese Nutzungsbedingungen
            verstoßen. Bei wiederholten Verstößen kann dein Konto gesperrt werden.
          </p>

          <h2 className="text-2xl font-semibold mt-8">6. Haftung</h2>
          <p>
            Die auf der Plattform bereitgestellten Informationen (einschließlich KI-generierter Inhalte)
            dienen nur zu Informationszwecken. Wir übernehmen keine Haftung für Schäden, die aus der
            Nutzung dieser Informationen entstehen.
          </p>

          <h2 className="text-2xl font-semibold mt-8">7. Änderungen</h2>
          <p>
            Wir behalten uns das Recht vor, diese Nutzungsbedingungen jederzeit zu ändern.
            Über wesentliche Änderungen werden registrierte Nutzer per E-Mail informiert.
          </p>

          <h2 className="text-2xl font-semibold mt-8">8. Kontakt</h2>
          <p>
            Fragen zu den Nutzungsbedingungen kannst du über unsere{' '}
            <Link href="/contact" className="text-primary hover:underline">Kontaktseite</Link> stellen.
          </p>
        </div>
      </div>
    </div>
  );
}

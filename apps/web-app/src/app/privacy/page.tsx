'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/landing">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>

        <h1 className="mb-8 text-4xl font-bold">Datenschutzerklärung</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Stand: Februar 2026</p>

          <h2 className="text-2xl font-semibold mt-8">1. Verantwortlicher</h2>
          <p>
            Verantwortlich für die Datenverarbeitung auf dieser Website ist der Betreiber von SeedfinderPro.
            Kontaktmöglichkeiten findest du auf unserer <Link href="/contact" className="text-primary hover:underline">Kontaktseite</Link>.
          </p>

          <h2 className="text-2xl font-semibold mt-8">2. Erhobene Daten</h2>
          <p>Wir erheben und verarbeiten folgende Daten:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Registrierungsdaten (Benutzername, E-Mail-Adresse, Passwort-Hash)</li>
            <li>Profilinformationen (optional: Anzeigename, Avatar, Bio)</li>
            <li>Nutzungsdaten (Grow-Journals, Community-Beiträge, Nachrichten)</li>
            <li>Technische Daten (IP-Adresse, Browser-Typ, Zugriffszeitpunkte)</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8">3. Zweck der Verarbeitung</h2>
          <p>Deine Daten werden verarbeitet für:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Bereitstellung und Betrieb der Plattform</li>
            <li>Benutzerauthentifizierung und Kontosicherheit</li>
            <li>Kommunikation zwischen Nutzern</li>
            <li>Verbesserung unserer Services</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8">4. Datenspeicherung</h2>
          <p>
            Deine Daten werden auf gesicherten Servern in Europa gespeichert.
            Wir setzen technische und organisatorische Maßnahmen ein, um deine Daten zu schützen.
          </p>

          <h2 className="text-2xl font-semibold mt-8">5. Cookies</h2>
          <p>
            Wir verwenden technisch notwendige Cookies für die Authentifizierung (Session-Token).
            Es werden keine Tracking- oder Werbe-Cookies eingesetzt.
          </p>

          <h2 className="text-2xl font-semibold mt-8">6. Deine Rechte</h2>
          <p>Du hast das Recht auf:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Auskunft über deine gespeicherten Daten</li>
            <li>Berichtigung unrichtiger Daten</li>
            <li>Löschung deiner Daten</li>
            <li>Einschränkung der Verarbeitung</li>
            <li>Datenübertragbarkeit</li>
            <li>Widerspruch gegen die Verarbeitung</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-8">7. Kontakt</h2>
          <p>
            Bei Fragen zum Datenschutz wende dich an uns über die{' '}
            <Link href="/contact" className="text-primary hover:underline">Kontaktseite</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Datenschutzerklärung</h1>
          </div>
          <p className="text-muted-foreground">Gültig ab: 1. Mai 2026</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Verantwortlicher</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                <strong>SeedFinderPro</strong><br />
                Cannabis Growing Community Platform<br />
                Deutschland
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Erhobene Daten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold mb-2">Bei der Nutzung der Website:</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>IP-Adresse</li>
                  <li>Browser-Typ und -Version</li>
                  <li>Betriebssystem</li>
                  <li>Besuchte Seiten und Verweildauer</li>
                  <li>Referrer-URL</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Bei der Registrierung:</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Username</li>
                  <li>E-Mail-Adresse</li>
                  <li>Passwort (verschlüsselt)</li>
                  <li>Profilbild (optional)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Zweck der Datenverarbeitung &amp; Rechtsgrundlagen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Ihre Daten werden auf folgenden Rechtsgrundlagen verarbeitet (Art. 6 DSGVO):</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Bereitstellung unserer Dienste &amp; Benutzerauthentifizierung — <strong>Art. 6 Abs. 1b DSGVO</strong> (Vertragserfüllung)</li>
                <li>Website-Analyse / Nutzungsstatistiken — <strong>Art. 6 Abs. 1f DSGVO</strong> (berechtigtes Interesse an der Verbesserung des Angebots)</li>
                <li>Einhaltung gesetzlicher Verpflichtungen — <strong>Art. 6 Abs. 1c DSGVO</strong></li>
                <li>E-Mail-Kommunikation auf Ihre Anfrage — <strong>Art. 6 Abs. 1a DSGVO</strong> (Einwilligung)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Datensicherheit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>Wir verwenden moderne Sicherheitsmaßnahmen zum Schutz Ihrer Daten:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>SSL/TLS-Verschlüsselung für alle Übertragungen</li>
                <li>Sichere Passwort-Hashing-Algorithmen</li>
                <li>Regelmäßige Sicherheitsaudits</li>
                <li>Beschränkter Datenzugriff für Mitarbeiter</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Ihre Rechte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Sie haben das Recht auf:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Auskunft über Ihre gespeicherten Daten</li>
                <li>Berichtigung unrichtiger Daten</li>
                <li>Löschung Ihrer Daten</li>
                <li>Beschränkung der Verarbeitung</li>
                <li>Datenportabilität</li>
                <li>Widerspruch gegen Verarbeitung</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Cookies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>Wir verwenden Cookies für:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Authentifizierung und Sitzungsverwaltung</li>
                <li>Benutzereinstellungen (Theme, Sprache)</li>
                <li>Analytik und Nutzungsstatistiken</li>
              </ul>
              <p className="mt-4">Sie können Cookies in Ihren Browser-Einstellungen ablehnen oder löschen.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Wir verwenden <strong>Plausible Analytics</strong> (plausible.io) zur anonymisierten Auswertung der Website-Nutzung.
                Plausible ist cookielos, speichert keine personenbezogenen Daten und erhebt keine IP-Adressen.
                Der Dienst wird in der EU betrieben und ist vollständig DSGVO-konform.
                Rechtsgrundlage: Art. 6 Abs. 1f DSGVO (berechtigtes Interesse).
              </p>
              <p>
                Datenschutzerklärung Plausible:{' '}
                <a href="https://plausible.io/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                  plausible.io/privacy
                </a>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Datenempfänger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>Ihre Daten werden durch folgende Dienstleister verarbeitet:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong>Hetzner Online GmbH</strong> (Gunzenhausen, Deutschland) — Server-Hosting und Infrastruktur.
                  Daten verbleiben ausschließlich in der EU. Auftragsverarbeitungsvertrag vorhanden.
                </li>
                <li>
                  <strong>Plausible Analytics</strong> (EU-gehostet) — anonymisierte Website-Nutzungsanalyse.
                  Keine personenbezogenen Daten, kein Tracking, kein Profiling.
                </li>
              </ul>
              <p>Darüber hinaus werden Ihre Daten nicht an Dritte weitergegeben, außer bei gesetzlicher Verpflichtung.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Datenspeicherung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>Ihre Daten werden gespeichert solange Ihr Konto aktiv ist. Nach Kontolöschung werden Daten innerhalb von 30 Tagen gelöscht, außer wenn gesetzliche Aufbewahrungspflichten bestehen.</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Server-Logs (IP-Adresse, Browser): automatische Löschung nach <strong>30 Tagen</strong></li>
                <li>Anonymisierte Analytik-Daten: Löschung nach <strong>365 Tagen</strong></li>
                <li>Account-Daten: Löschung innerhalb von <strong>30 Tagen</strong> nach Kontolöschung</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Kontakt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Fragen zur Datenschutzerklärung? Kontaktieren Sie uns unter:<br />
                <strong>privacy@seedfinderpro.de</strong>
              </p>
              <p className="text-xs text-muted-foreground">Letzte Aktualisierung: 1. Mai 2026</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

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
              <CardTitle>3. Zweck der Datenverarbeitung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Ihre Daten werden verarbeitet für:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Bereitstellung unserer Dienste</li>
                <li>Benutzerauthentifizierung</li>
                <li>Verbesserung unserer Website und Services</li>
                <li>Kommunikation mit Ihnen</li>
                <li>Einhaltung gesetzlicher Verpflichtungen</li>
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
              <p>Wir verwenden Plausible Analytics um Website-Nutzung zu analysieren. Keine personenbezogenen Daten werden gespeichert. Die Daten unterliegen EU-Datenschutzstandards.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Dritte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>Ihre Daten werden nicht an Dritte weitergegeben, außer wenn:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Gesetzlich erforderlich</li>
                <li>Sie haben der Weitergabe zugestimmt</li>
                <li>Zur Erbringung unserer Services notwendig</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Datenspeicherung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>Ihre Daten werden gespeichert solange Ihr Konto aktiv ist. Nach Kontolöschung werden Daten innerhalb von 30 Tagen gelöscht, außer wenn gesetzliche Aufbewahrungspflichten bestehen.</p>
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

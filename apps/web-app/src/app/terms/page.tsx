'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Nutzungsbedingungen</h1>
          </div>
          <p className="text-muted-foreground">Gültig ab: 1. Mai 2026</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Angebot und Geltungsbereich</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                SeedFinderPro („Plattform") ist eine Cannabis Growing Community mit Preisvergleich, Strain-Datenbank und Grow-Tagebuch. Diese Nutzungsbedingungen regeln die Nutzung aller Services.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Benutzerkonten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold mb-2">Registrierung:</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Sie müssen mindestens 18 Jahre alt sein</li>
                  <li>Sie müssen vollständige und genaue Informationen bereitstellen</li>
                  <li>Sie sind verantwortlich für die Sicherheit Ihres Passworts</li>
                  <li>Sie akzeptieren alle Aktivitäten unter Ihrem Konto</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Rechtliche Richtlinien</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                SeedFinderPro ist eine Informations- und Community-Plattform. Alle Inhalte dienen ausschließlich legalen Zwecken in Jurisdiktionen, in denen Anbau und Besitz von Cannabis legal ist.
              </p>
              <p className="font-semibold mt-4">Sie erklären sich einverstanden:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Alle geltenden Gesetze zu beachten</li>
                <li>Keine illegalen Aktivitäten zu unterstützen</li>
                <li>Keine kontrollierten Substanzen zu verkaufen oder zu verbreiten</li>
                <li>Die Legalität in Ihrer Region zu überprüfen</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Nutzung der Inhalte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Sie dürfen Inhalte auf der Plattform nicht:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Reproduzieren oder verbreiten ohne Genehmigung</li>
                <li>Für kommerzielle Zwecke nutzen</li>
                <li>Modifizieren oder davon abgeleitete Werke erstellen</li>
                <li>Technische Schutzmaßnahmen umgehen</li>
                <li>Automatisierte Systeme zum Scraping einsetzen</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Nutzergenerierte Inhalte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Durch das Hochladen von Inhalten (Grow-Tagebücher, Fotos, Kommentare) gewähren Sie SeedFinderPro eine Lizenz zur Nutzung, Anzeige und Verbreitung.
              </p>
              <p className="mt-4 font-semibold">Sie garantieren:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Sie besitzen oder haben Rechte am Inhalt</li>
                <li>Der Inhalt verletzt keine Rechte Dritter</li>
                <li>Der Inhalt ist legal und nicht beleidigend</li>
                <li>Der Inhalt enthält keine Malware</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Verbotene Aktivitäten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>Sie dürfen nicht:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Belästigungen oder Spam verbreiten</li>
                <li>Hassrede oder diskriminierende Inhalte posten</li>
                <li>Urheberrechte oder Markenrechte verletzen</li>
                <li>Phishing, Hacking oder Social Engineering betreiben</li>
                <li>Die Plattform überlasten oder sabotieren</li>
                <li>Falsche oder irreführende Informationen verbreiten</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Moderation und Sperrung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                SeedFinderPro behält sich das Recht vor:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Inhalte zu moderieren und zu entfernen</li>
                <li>Benutzer zu warnen oder zu sperren</li>
                <li>Konten dauerhaft zu löschen</li>
                <li>Ohne vorherige Ankündigung zu handeln</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Verfügbarkeit und Fehler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Die Plattform wird „wie vorhanden" bereitgestellt. SeedFinderPro garantiert nicht:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Fehlerfreien Betrieb</li>
                <li>Ununterbrochene Verfügbarkeit</li>
                <li>Datenverlustschutz ohne Backups</li>
                <li>Spezifische Performance-Standards</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Haftungsausschluss</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                <strong>Alle Inhalte werden ohne Gewähr bereitgestellt.</strong> SeedFinderPro haftet nicht für:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Direkte oder indirekte Schäden</li>
                <li>Datenverlust oder -beschädigung</li>
                <li>Geschäftsverluste</li>
                <li>Fehler in Benutzerratschlägen</li>
                <li>Schäden durch Dritte</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Abmeldung und Kontolöschung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Sie können Ihr Konto jederzeit löschen. Nach Löschung können Ihre Daten nicht wiederhergestellt werden.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Änderungen der Bedingungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                SeedFinderPro kann diese Bedingungen jederzeit ändern. Die Nutzung der Plattform nach Änderungen bedeutet Akzeptanz.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12. Kontakt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Fragen zu diesen Bedingungen?<br />
                <strong>legal@seedfinderpro.de</strong>
              </p>
              <p className="text-xs text-muted-foreground">Letzte Aktualisierung: 1. Mai 2026</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

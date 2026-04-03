import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Datenschutzerklärung',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/landing">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>

        <h1 className="mb-2 text-4xl font-bold">Datenschutzerklärung</h1>
        <p className="text-muted-foreground mb-10">Stand: März 2026</p>

        <div className="space-y-10 text-sm leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Verantwortlicher</h2>
            <p>
              Pascal Klingen<br />
              Am Röttchen 5<br />
              41751 Viersen-Dülken<br />
              Deutschland<br />
              E-Mail:{' '}
              <a href="mailto:klingenpascal@gmail.com" className="text-primary hover:underline">
                klingenpascal@gmail.com
              </a>
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">2. Erhobene Daten und Zwecke</h2>

            <h3 className="font-medium mb-2">2.1 Beim Besuch der Website</h3>
            <p className="text-muted-foreground mb-4">
              Bei jedem Seitenaufruf speichert der Webserver automatisch: IP-Adresse, Datum und Uhrzeit
              des Zugriffs, aufgerufene Seite, Browser-Typ und -Version, Betriebssystem. Diese Daten
              sind technisch notwendig und werden nicht mit anderen Daten zusammengeführt.
              Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren Betrieb).
            </p>

            <h3 className="font-medium mb-2">2.2 Registrierung und Nutzerkonto</h3>
            <p className="text-muted-foreground mb-3">
              Bei der Registrierung erheben wir: E-Mail-Adresse, Benutzername, Passwort (nur als
              Argon2-Hash gespeichert, niemals im Klartext). Optional: Anzeigename, Profilbild, Bio.
              Außerdem speichern wir die Bestätigung, dass du mindestens 18 Jahre alt bist
              (<code className="text-xs bg-muted px-1 rounded">ageVerified</code>).
              Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Datenkategorie</th>
                    <th className="text-left py-2 pr-4 font-medium">Konkrete Felder</th>
                    <th className="text-left py-2 font-medium">Speicherort</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="py-2 pr-4">Profil</td>
                    <td className="py-2 pr-4">id, email, username, displayName, bio, avatar, role, ageVerified, createdAt</td>
                    <td className="py-2">PostgreSQL (auth-service)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Grow-Tagebücher</td>
                    <td className="py-2 pr-4">Name, Strain, Medium, Status, Startdatum, Einträge, Fotos</td>
                    <td className="py-2">MongoDB (journal-service)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Fotos</td>
                    <td className="py-2 pr-4">Original, Medium, Thumbnail (3 Größen)</td>
                    <td className="py-2">Hetzner Object Storage (fsn1)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Forum-Beiträge</td>
                    <td className="py-2 pr-4">Threads, Replies, Votes</td>
                    <td className="py-2">MongoDB (community-service)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Direktnachrichten</td>
                    <td className="py-2 pr-4">Konversationen, Nachrichten</td>
                    <td className="py-2">MongoDB (community-service)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Gamification</td>
                    <td className="py-2 pr-4">Punkte, Badges, Achievements, Events</td>
                    <td className="py-2">MongoDB (gamification-service)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Benachrichtigungen</td>
                    <td className="py-2 pr-4">Einstellungen, Geräte (Push), Nachrichten</td>
                    <td className="py-2">MongoDB (notification-service)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="font-medium mb-2">2.3 Nutzungsdaten</h3>
            <p className="text-muted-foreground mb-4">
              Im Rahmen der Plattformnutzung werden von dir erstellte Inhalte gespeichert:
              Grow-Tagebücher, Fotos, Community-Beiträge, Nachrichten, Preisalarme.
              Diese Daten verbleiben unter deiner Kontrolle und können jederzeit gelöscht werden.
              Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
            </p>

            <h3 className="font-medium mb-2">2.4 E-Mail-Kommunikation</h3>
            <p className="text-muted-foreground">
              Wir versenden transaktionale E-Mails (Registrierungsbestätigung, Passwort-Reset,
              Benachrichtigungen). E-Mails werden über den Dienst Brevo (Sendinblue SAS, 7 rue de Madrid,
              75008 Paris, Frankreich) versendet. Brevo ist DSGVO-konform und verarbeitet Daten
              ausschließlich in der EU. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">3. Google OAuth (Anmeldung mit Google)</h2>
            <p className="text-muted-foreground mb-3">
              Du kannst dich optional mit deinem Google-Konto anmelden. Dabei werden folgende Daten
              von Google an uns übermittelt: E-Mail-Adresse, Name, Profilbild-URL, Google-ID.
              Passwörter werden dabei nicht übermittelt oder gespeichert.
            </p>
            <p className="text-muted-foreground mb-3">
              Anbieter: Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland.
              Bei der Nutzung von Google OAuth gelten zusätzlich die Datenschutzbestimmungen von Google:{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline">
                policies.google.com/privacy
              </a>
            </p>
            <p className="text-muted-foreground">
              Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch aktive Nutzung von
              "Mit Google anmelden").
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">4. KI-Assistent (OpenAI)</h2>
            <p className="text-muted-foreground mb-3">
              Die Plattform bietet einen KI-Assistenten (Grow-Berater, Pflanzendiagnose). Eingaben,
              die du an den KI-Assistenten sendest, werden zur Verarbeitung an OpenAI übermittelt.
            </p>
            <p className="text-muted-foreground mb-3">
              Anbieter: OpenAI, LLC, 3180 18th Street, San Francisco, CA 94110, USA.
              Die Datenübertragung in die USA erfolgt auf Grundlage von Standardvertragsklauseln
              (Art. 46 Abs. 2 lit. c DSGVO). Bitte sende keine personenbezogenen Daten an den
              KI-Assistenten, die du nicht teilen möchtest.
            </p>
            <p className="text-muted-foreground">
              Datenschutzerklärung OpenAI:{' '}
              <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline">
                openai.com/privacy
              </a>
              . Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">5. Hosting und Infrastruktur</h2>
            <p className="text-muted-foreground mb-3">
              Die Plattform wird gehostet bei: Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen,
              Deutschland. Alle Daten werden ausschließlich auf Servern in Deutschland verarbeitet und
              gespeichert. Hetzner ist DSGVO-konform.
            </p>
            <p className="text-muted-foreground">
              Datenschutzerklärung Hetzner:{' '}
              <a href="https://www.hetzner.com/rechtliches/datenschutz" target="_blank"
                rel="noopener noreferrer" className="text-primary hover:underline">
                hetzner.com/rechtliches/datenschutz
              </a>
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">6. Cookies</h2>
            <p className="text-muted-foreground mb-4">
              Wir verwenden ausschließlich technisch notwendige Cookies. Es werden keine Tracking-,
              Analyse- oder Werbe-Cookies eingesetzt.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Cookie</th>
                    <th className="text-left py-2 pr-4 font-medium">Zweck</th>
                    <th className="text-left py-2 pr-4 font-medium">Laufzeit</th>
                    <th className="text-left py-2 font-medium">Rechtsgrundlage</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="py-2 pr-4 font-mono">sf1_access_token</td>
                    <td className="py-2 pr-4">Authentifizierung (JWT)</td>
                    <td className="py-2 pr-4">7 Tage</td>
                    <td className="py-2">Art. 6 Abs. 1 lit. b DSGVO</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono">sf1_refresh_token</td>
                    <td className="py-2 pr-4">Token-Erneuerung</td>
                    <td className="py-2 pr-4">30 Tage</td>
                    <td className="py-2">Art. 6 Abs. 1 lit. b DSGVO</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground mt-3">
              Diese Cookies sind für den Betrieb der Plattform technisch unbedingt erforderlich und
              können nicht deaktiviert werden, ohne die Funktionalität einzuschränken.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">7. Affiliate-Links</h2>
            <p className="text-muted-foreground">
              Die Preisvergleichsfunktion enthält Affiliate-Links zu externen Samenbanken. Beim Klick
              auf einen Affiliate-Link wirst du auf die Website des jeweiligen Anbieters weitergeleitet.
              Dabei können vom Anbieter Cookies gesetzt werden, die dem Affiliate-Tracking dienen.
              Auf diese Datenverarbeitung haben wir keinen Einfluss. Es gelten die
              Datenschutzbestimmungen des jeweiligen Anbieters.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">8. Speicherdauer</h2>
            <p className="text-muted-foreground mb-3">
              Nutzerdaten werden so lange gespeichert, wie ein Nutzerkonto aktiv ist.
              Nach Löschung des Kontos werden alle personenbezogenen Daten <strong>sofort und vollständig</strong> gelöscht —
              Grows, Gamification-Daten, Direktnachrichten und Benachrichtigungs-Einstellungen werden
              gelöscht, Forum-Beiträge werden anonymisiert (Autor → „Gelöschter Nutzer").
              Server-Logs werden nach 7 Tagen automatisch gelöscht.
              Tägliche Backups werden 7 Tage aufbewahrt.
            </p>
            <p className="text-muted-foreground">
              Sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen, werden alle Daten
              bei Konto-Löschung sofort entfernt.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">9. Deine Rechte (Art. 15–22 DSGVO)</h2>
            <ul className="text-muted-foreground list-disc pl-5 space-y-2 mb-4">
              <li>
                <strong>Auskunft</strong> (Art. 15): Du kannst jederzeit Auskunft über deine gespeicherten Daten verlangen.
              </li>
              <li><strong>Berichtigung</strong> (Art. 16): Unrichtige Daten werden auf Anfrage korrigiert.</li>
              <li>
                <strong>Löschung</strong> (Art. 17): Du kannst die Löschung deiner Daten verlangen.{' '}
                <strong>Self-Service:</strong>{' '}
                <a href="/settings" className="text-primary hover:underline">Einstellungen → Meine Daten → Account löschen</a>
              </li>
              <li><strong>Einschränkung</strong> (Art. 18): Du kannst die Verarbeitung einschränken lassen.</li>
              <li>
                <strong>Datenübertragbarkeit</strong> (Art. 20): Du erhältst deine Daten in einem maschinenlesbaren Format (JSON).{' '}
                <strong>Self-Service:</strong>{' '}
                <a href="/settings" className="text-primary hover:underline">Einstellungen → Meine Daten → Daten herunterladen</a>
              </li>
              <li><strong>Widerspruch</strong> (Art. 21): Du kannst der Verarbeitung auf Basis berechtigter Interessen widersprechen.</li>
              <li><strong>Widerruf</strong>: Erteilte Einwilligungen können jederzeit mit Wirkung für die Zukunft widerrufen werden.</li>
            </ul>
            <p className="text-muted-foreground mb-2">
              Viele Rechte kannst du direkt selbst ausüben unter:{' '}
              <a href="/settings" className="text-primary hover:underline">seedfinderpro.de/settings</a> → Tab „Meine Daten"
            </p>
            <p className="text-muted-foreground">
              Für alle weiteren Anfragen per E-Mail an:{' '}
              <a href="mailto:klingenpascal@gmail.com" className="text-primary hover:underline">
                klingenpascal@gmail.com
              </a>
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">10. Beschwerderecht</h2>
            <p className="text-muted-foreground">
              Du hast das Recht, dich bei der zuständigen Datenschutzaufsichtsbehörde zu beschweren.
              Zuständig für Nordrhein-Westfalen ist die Landesbeauftragte für Datenschutz und
              Informationsfreiheit NRW:{' '}
              <a href="https://www.ldi.nrw.de" target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline">
                www.ldi.nrw.de
              </a>
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-semibold mb-3">11. Änderungen dieser Datenschutzerklärung</h2>
            <p className="text-muted-foreground">
              Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen. Die jeweils
              aktuelle Version ist auf dieser Seite abrufbar. Bei wesentlichen Änderungen werden
              registrierte Nutzer per E-Mail informiert.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}

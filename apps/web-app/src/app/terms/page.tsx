import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Allgemeine Geschäftsbedingungen',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/landing">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>

        <h1 className="mb-2 text-4xl font-bold">Allgemeine Geschäftsbedingungen</h1>
        <p className="text-muted-foreground mb-10">Stand: März 2026</p>

        <div className="space-y-10 text-sm leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Geltungsbereich</h2>
            <p className="text-muted-foreground mb-3">
              Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der Online-Plattform
              SeedFinderPro (nachfolgend "Plattform"), betrieben von Pascal Klingen, Am Röttchen 5,
              41751 Viersen-Dülken (nachfolgend "Betreiber").
            </p>
            <p className="text-muted-foreground">
              Mit der Registrierung oder der Nutzung der Plattform erkennst du diese AGB an.
              Abweichende Bedingungen gelten nur, wenn der Betreiber ihnen ausdrücklich schriftlich
              zugestimmt hat.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Leistungsbeschreibung</h2>
            <p className="text-muted-foreground mb-3">
              SeedFinderPro ist eine Community-Plattform für Hobbygärtner. Die Plattform bietet:
            </p>
            <ul className="text-muted-foreground list-disc pl-5 space-y-1">
              <li>Grow-Tagebücher zur Dokumentation eigener Anbauprojekte</li>
              <li>Community-Forum für den Austausch zwischen Nutzern</li>
              <li>Strain-Datenbank mit Informationen zu Cannabis-Sorten</li>
              <li>Preisvergleich für Saatgut bei kooperierenden Händlern (Affiliate)</li>
              <li>KI-Assistent für Anbauberatung und Pflanzendiagnose</li>
              <li>Tools und Rechner für den Anbau (VPD, EC, DLI u.a.)</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              Die Grundfunktionen der Plattform sind kostenlos nutzbar. Der Betreiber behält sich vor,
              kostenpflichtige Zusatzfunktionen (Premium) einzuführen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Mindestalter und Zielgruppe</h2>
            <p className="text-muted-foreground mb-3">
              Die Plattform richtet sich ausschließlich an Personen ab <strong>18 Jahren</strong>.
              Mit der Registrierung bestätigst du, dass du das 18. Lebensjahr vollendet hast.
            </p>
            <p className="text-muted-foreground">
              Die Plattform dient der Information und dem Erfahrungsaustausch von Hobbygärtnern.
              Nutzer sind selbst verantwortlich dafür, die geltenden Gesetze ihres Aufenthaltslandes
              zu kennen und einzuhalten.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Registrierung und Konto</h2>
            <p className="text-muted-foreground mb-3">
              Die Nutzung wesentlicher Funktionen erfordert eine Registrierung. Du bist verpflichtet:
            </p>
            <ul className="text-muted-foreground list-disc pl-5 space-y-1">
              <li>Wahrheitsgemäße Angaben zu machen</li>
              <li>Deine Zugangsdaten sicher zu verwahren</li>
              <li>Unbefugte Nutzung deines Kontos unverzüglich zu melden</li>
              <li>Pro Person nur ein Konto zu nutzen</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              Die Weitergabe von Zugangsdaten an Dritte ist nicht gestattet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Verhaltensregeln und verbotene Inhalte</h2>
            <p className="text-muted-foreground mb-3">Bei der Nutzung der Plattform ist es verboten:</p>
            <ul className="text-muted-foreground list-disc pl-5 space-y-1">
              <li>Inhalte zu veröffentlichen, die zum Kauf oder Verkauf illegaler Substanzen aufrufen</li>
              <li>Andere Nutzer zu beleidigen, belästigen oder zu diskriminieren</li>
              <li>Spam, Werbung oder kommerzielle Inhalte ohne Genehmigung zu verbreiten</li>
              <li>Urheberrechtlich geschützte Inhalte ohne Berechtigung hochzuladen</li>
              <li>Die Plattform zu hacken, zu überlasten oder anderweitig zu stören</li>
              <li>Falsche Identitäten oder mehrfache Konten zu erstellen</li>
              <li>Persönliche Daten anderer Nutzer ohne deren Einwilligung zu veröffentlichen</li>
              <li>Minderjährige anzusprechen oder für die Plattform zu werben</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Eigene Inhalte (User-Generated Content)</h2>
            <p className="text-muted-foreground mb-3">
              Du behältst alle Urheberrechte an deinen selbst erstellten Inhalten (Texte, Fotos,
              Grow-Tagebücher). Mit dem Hochladen räumst du dem Betreiber ein nicht-exklusives,
              weltweites, kostenloses Recht ein, diese Inhalte auf der Plattform darzustellen,
              zu speichern und zu übertragen.
            </p>
            <p className="text-muted-foreground">
              Du versicherst, dass du über alle notwendigen Rechte an den hochgeladenen Inhalten
              verfügst und diese keine Rechte Dritter verletzen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Moderation und Sperrung</h2>
            <p className="text-muted-foreground mb-3">
              Der Betreiber behält sich das Recht vor:
            </p>
            <ul className="text-muted-foreground list-disc pl-5 space-y-1">
              <li>Inhalte, die gegen diese AGB verstoßen, ohne Vorankündigung zu entfernen</li>
              <li>Nutzerkonten bei Verstößen vorübergehend zu sperren oder dauerhaft zu löschen</li>
              <li>Nutzern bei schwerwiegenden Verstößen den Zugang dauerhaft zu verwehren</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              Bei Sperrungen wird der betroffene Nutzer nach Möglichkeit per E-Mail informiert.
              Ein Rechtsanspruch auf Nutzung der Plattform besteht nicht.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Affiliate-Links und Preisvergleich</h2>
            <p className="text-muted-foreground mb-3">
              Der Preisvergleich enthält Affiliate-Links. Klickst du auf einen solchen Link und kaufst
              ein, erhält der Betreiber eine Provision des Händlers — für dich entstehen keine
              zusätzlichen Kosten.
            </p>
            <p className="text-muted-foreground">
              Alle Preisangaben sind ohne Gewähr. Änderungen der Preise durch die Händler können
              verzögert angezeigt werden. Für die Richtigkeit, Vollständigkeit und Aktualität der
              Preisangaben wird keine Haftung übernommen. Die Abwicklung von Käufen erfolgt
              ausschließlich zwischen Käufer und Händler.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. KI-Assistent</h2>
            <p className="text-muted-foreground">
              Die KI-basierten Funktionen (Grow-Berater, Pflanzendiagnose) liefern automatisch
              generierte Antworten auf Basis von Sprachmodellen (OpenAI GPT-4o). Diese Antworten
              dienen ausschließlich der Information und ersetzen keine fachkundige Beratung.
              Der Betreiber übernimmt keine Haftung für Schäden, die auf der Nutzung von
              KI-generierten Inhalten beruhen. Insbesondere wird keine Verantwortung für
              eventuelle Irrtümer oder Fehlinformationen übernommen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Haftungsausschluss</h2>
            <p className="text-muted-foreground mb-3">
              Die Plattform und ihre Inhalte werden "wie besehen" bereitgestellt. Der Betreiber
              übernimmt keine Gewähr für die Richtigkeit, Vollständigkeit oder Aktualität der
              bereitgestellten Inhalte, insbesondere der Strain-Datenbank, der KI-Antworten
              und der Nutzerbeiträge.
            </p>
            <p className="text-muted-foreground mb-3">
              Die Haftung für leichte Fahrlässigkeit ist — soweit gesetzlich zulässig —
              ausgeschlossen, es sei denn, es werden wesentliche Vertragspflichten verletzt.
              Die Haftung für Schäden aus der Verletzung von Leben, Körper und Gesundheit bleibt
              unberührt.
            </p>
            <p className="text-muted-foreground">
              Der Betreiber ist nicht verantwortlich für Inhalte externer Websites, die über
              Links auf der Plattform erreichbar sind.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Kündigung und Kontolöschung</h2>
            <p className="text-muted-foreground mb-3">
              Du kannst dein Konto jederzeit ohne Angabe von Gründen löschen. Nach Löschung werden
              deine personenbezogenen Daten innerhalb von 30 Tagen entfernt. Öffentliche Inhalte
              (Forum-Beiträge, öffentliche Grows) können anonymisiert bestehen bleiben.
            </p>
            <p className="text-muted-foreground">
              Der Betreiber kann das Nutzungsverhältnis jederzeit beenden, insbesondere bei
              Verstoß gegen diese AGB.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Verfügbarkeit</h2>
            <p className="text-muted-foreground">
              Der Betreiber bemüht sich um eine hohe Verfügbarkeit der Plattform, übernimmt jedoch
              keine Garantie für ununterbrochene Verfügbarkeit. Wartungsarbeiten können zu
              vorübergehenden Einschränkungen führen. Ein Anspruch auf Verfügbarkeit besteht nicht.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Änderungen der AGB</h2>
            <p className="text-muted-foreground">
              Der Betreiber behält sich vor, diese AGB mit angemessener Ankündigungsfrist zu ändern.
              Registrierte Nutzer werden per E-Mail über wesentliche Änderungen informiert.
              Die fortgesetzte Nutzung der Plattform nach Inkrafttreten der geänderten AGB gilt
              als Zustimmung.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">14. Anwendbares Recht und Gerichtsstand</h2>
            <p className="text-muted-foreground">
              Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
              Gerichtsstand ist, soweit gesetzlich zulässig, Viersen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">15. Kontakt</h2>
            <p className="text-muted-foreground">
              Bei Fragen zu diesen AGB wende dich an:{' '}
              <a href="mailto:klingenpascal@gmail.com" className="text-primary hover:underline">
                klingenpascal@gmail.com
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Impressum',
  robots: { index: true, follow: true },
};

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/landing">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Link>
        </Button>

        <h1 className="mb-8 text-4xl font-bold">Impressum</h1>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold mb-3">Angaben gemäß § 5 TMG</h2>
            <p>
              Pascal Klingen<br />
              Am Röttchen 5<br />
              41751 Viersen-Dülken<br />
              Deutschland
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Kontakt</h2>
            <p>
              E-Mail:{' '}
              <a href="mailto:klingenpascal@gmail.com" className="text-primary hover:underline">
                klingenpascal@gmail.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
            <p>
              Pascal Klingen<br />
              Am Röttchen 5<br />
              41751 Viersen-Dülken
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Hinweis zu Affiliate-Links</h2>
            <p className="text-muted-foreground">
              Diese Website enthält Affiliate-Links zu externen Samenbanken. Wenn du über einen solchen
              Link einkaufst, erhalten wir eine Provision — für dich entstehen keine zusätzlichen Kosten.
              Alle Preisangaben sind ohne Gewähr und dienen nur der Information. Affiliate-Links sind
              entsprechend gekennzeichnet.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Hinweis zur Plattform</h2>
            <p className="text-muted-foreground">
              SeedFinderPro ist eine Community-Plattform für Hobbygärtner und Grow-Enthusiasten.
              Die Plattform richtet sich ausschließlich an Personen ab 18 Jahren. Sämtliche Inhalte
              dienen nur zu Informationszwecken. Der Betreiber distanziert sich ausdrücklich von
              jeglicher illegalen Nutzung der bereitgestellten Informationen. Die geltenden gesetzlichen
              Bestimmungen des jeweiligen Aufenthaltslands sind zu beachten.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Haftungsausschluss</h2>

            <h3 className="font-medium mb-2">Haftung für Inhalte</h3>
            <p className="text-muted-foreground mb-4">
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten
              nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
              Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
              Informationen zu überwachen. Bei Bekanntwerden von Rechtsverletzungen werden wir diese
              Inhalte umgehend entfernen.
            </p>

            <h3 className="font-medium mb-2">Haftung für Links</h3>
            <p className="text-muted-foreground mb-4">
              Unser Angebot enthält Links zu externen Websites. Auf deren Inhalte haben wir keinen
              Einfluss und übernehmen daher keine Gewähr. Für die Inhalte der verlinkten Seiten ist
              stets der jeweilige Anbieter oder Betreiber verantwortlich.
            </p>

            <h3 className="font-medium mb-2">KI-generierte Inhalte</h3>
            <p className="text-muted-foreground">
              Die auf dieser Plattform verfügbaren KI-Assistenten (Pflanzendiagnose, Grow-Beratung)
              liefern automatisch generierte Antworten. Diese dienen ausschließlich der Information
              und ersetzen keine professionelle Beratung. Für Schäden, die aus der Nutzung
              KI-generierter Inhalte entstehen, wird keine Haftung übernommen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Urheberrecht</h2>
            <p className="text-muted-foreground">
              Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
              dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
              der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen
              Zustimmung des jeweiligen Autors bzw. Erstellers. Nutzer behalten die Rechte an ihren
              selbst erstellten Inhalten (Grow-Tagebücher, Fotos, Beiträge).
            </p>
          </section>

          <p className="text-xs text-muted-foreground pt-4 border-t">
            Stand: März 2026
          </p>
        </div>
      </div>
    </div>
  );
}

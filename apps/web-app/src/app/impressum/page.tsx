'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

export default function ImpressumPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Info className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Impressum</h1>
          </div>
          <p className="text-muted-foreground">Herausgeberdaten und Verantwortlichkeiten</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Herausgeber</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                <strong>Pascal Klingen</strong><br />
                Am Röttchen 5<br />
                41751 Viersen-Dülken<br />
                Deutschland
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kontakt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-semibold mb-2">E-Mail:</p>
                <p>
                  Allgemein: <strong>info@seedfinderpro.de</strong><br />
                  Datenschutz: <strong>privacy@seedfinderpro.de</strong><br />
                  Rechtliches: <strong>legal@seedfinderpro.de</strong>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Haftung für Inhalte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
              </p>
              <p>
                Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte verantwortlich. Nach den §§ 8 bis 10 TMG sind wir jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Haftung für Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Unsere Website enthält Links zu externen Websites. Für die Inhalte dieser externen Websites sind wir nicht verantwortlich. Der jeweilige Betreiber ist für seinen Inhalt selbst verantwortlich.
              </p>
              <p>
                Wir überprüfen die verlinkten Seiten regelmäßig auf illegale Inhalte. Bei Feststellung von Rechtsverletzungen werden wir derartige Links unverzüglich entfernen.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Urheberrecht</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Die durch die Seitenbetreiber erstellten Inhalte unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Datenschutz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Die Nutzung unserer Website ist in der Regel ohne Angabe personenbezogener Daten möglich. Soweit personenbezogene Daten erhoben werden, erfolgt dies immer freiwillig. Diese Daten werden ohne Ihre ausdrückliche Zustimmung nicht an Dritte weitergegeben.
              </p>
              <p>
                Weitere Informationen zum Datenschutz finden Sie in unserer <strong>Datenschutzerklärung</strong>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rechtshinweise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Diese Website und alle Inhalte werden ausschließlich zu Informationszwecken bereitgestellt. SeedFinderPro stellt keine medizinischen, legalen oder anderen professionellen Ratschläge bereit. Benutzer sollten sich immer an Fachleute wenden, bevor sie Entscheidungen treffen.
              </p>
              <p>
                Alle Informationen müssen in Übereinstimmung mit lokalen Gesetzen und Vorschriften verwendet werden.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Streitbeilegung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Es gelten die Gesetze der Bundesrepublik Deutschland. Für Streitigkeiten sind die Gerichte am Ort des Betreibers zuständig.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

# SF-1 Rechtskonformität — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 6 kritische Rechtsmängel beheben — Impressum, Datenschutz (Art. 6 DSGVO), KCanG-Disclaimer, Age-Gate-Modal.

**Architecture:** Reine Text- und UI-Änderungen in bestehenden Next.js-Seiten + eine neue Client-Komponente (`age-gate-modal.tsx`) nach dem Muster von `cookie-banner.tsx`. Kein neuer Service, kein API-Endpunkt.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind, localStorage

---

### Task 1: Impressum — Privatperson-Klarstellung + KCanG-Verweis

**Files:**
- Modify: `apps/web-app/src/app/impressum/page.tsx`

- [ ] **Step 1: Datei lesen (Pflicht vor Edit)**

```bash
cat /root/SF-1-Ultimate-/apps/web-app/src/app/impressum/page.tsx
```

- [ ] **Step 2: Herausgeber-Abschnitt erweitern**

Ersetze den Herausgeber-Block (aktuell nur Name + Adresse) mit:

```tsx
<CardContent className="space-y-4 text-sm">
  <p>
    <strong>Pascal Klingen</strong><br />
    Websitebetreiber (Privatperson)<br />
    Am Röttchen 5<br />
    41751 Viersen-Dülken<br />
    Deutschland
  </p>
  <p className="text-muted-foreground">
    Diese Website wird als Privatperson betrieben. Es besteht keine gewerbliche
    Tätigkeit. Eine Umsatzsteuerpflicht besteht nicht (§ 19 UStG).
  </p>
</CardContent>
```

old_string zum Ersetzen:
```tsx
              <p>
                <strong>Pascal Klingen</strong><br />
                Am Röttchen 5<br />
                41751 Viersen-Dülken<br />
                Deutschland
              </p>
```

new_string:
```tsx
              <p>
                <strong>Pascal Klingen</strong><br />
                Websitebetreiber (Privatperson)<br />
                Am Röttchen 5<br />
                41751 Viersen-Dülken<br />
                Deutschland
              </p>
              <p className="text-muted-foreground">
                Diese Website wird als Privatperson betrieben. Es besteht keine
                gewerbliche Tätigkeit. Eine Umsatzsteuerpflicht besteht nicht (§ 19 UStG).
              </p>
```

- [ ] **Step 3: Neuen Abschnitt "Geltendes Recht" vor dem letzten `</div>` einfügen**

Ersetze die schließende `</div>` am Ende der Cards-Liste:

old_string (letzter Card-Block — Streitbeilegung):
```tsx
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
```

new_string:
```tsx
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

          <Card>
            <CardHeader>
              <CardTitle>Geltendes Recht</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>Diese Website unterliegt dem Recht der Bundesrepublik Deutschland, insbesondere:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Gesetz zum kontrollierten Umgang mit Cannabis (KCanG)</li>
                <li>Telemediengesetz (TMG)</li>
                <li>Jugendmedienschutz-Staatsvertrag (JMStV)</li>
                <li>Datenschutz-Grundverordnung (DSGVO)</li>
                <li>Netzwerkdurchsetzungsgesetz (NetzDG)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
```

- [ ] **Step 4: Prüfen**

```bash
grep -n "Privatperson\|§ 19 UStG\|KCanG\|NetzDG" /root/SF-1-Ultimate-/apps/web-app/src/app/impressum/page.tsx
```

Erwartetes Ergebnis: alle 4 Begriffe gefunden.

- [ ] **Step 5: Commit**

```bash
cd /root/SF-1-Ultimate- && git add apps/web-app/src/app/impressum/page.tsx
git commit -m "fix(legal): impressum — privatperson-klarstellung + KCanG-verweis

§19 UStG, geltendes Recht (KCanG, TMG, JMStV, DSGVO, NetzDG) hinzugefügt.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Datenschutzerklärung — Art. 6 DSGVO + Datenempfänger

**Files:**
- Modify: `apps/web-app/src/app/privacy/page.tsx`

- [ ] **Step 1: Datei lesen**

```bash
cat /root/SF-1-Ultimate-/apps/web-app/src/app/privacy/page.tsx
```

- [ ] **Step 2: Abschnitt 3 "Zweck der Datenverarbeitung" mit Rechtsgrundlagen ersetzen**

old_string:
```tsx
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
```

new_string:
```tsx
          <Card>
            <CardHeader>
              <CardTitle>3. Zweck der Datenverarbeitung & Rechtsgrundlagen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Ihre Daten werden auf folgenden Rechtsgrundlagen verarbeitet (Art. 6 DSGVO):</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Bereitstellung unserer Dienste & Benutzerauthentifizierung — <strong>Art. 6 Abs. 1b DSGVO</strong> (Vertragserfüllung)</li>
                <li>Website-Analyse / Nutzungsstatistiken — <strong>Art. 6 Abs. 1f DSGVO</strong> (berechtigtes Interesse an der Verbesserung des Angebots)</li>
                <li>Einhaltung gesetzlicher Verpflichtungen — <strong>Art. 6 Abs. 1c DSGVO</strong></li>
                <li>E-Mail-Kommunikation auf Ihre Anfrage — <strong>Art. 6 Abs. 1a DSGVO</strong> (Einwilligung)</li>
              </ul>
            </CardContent>
          </Card>
```

- [ ] **Step 3: Abschnitt 7 "Analytics" konkretisieren**

old_string:
```tsx
          <Card>
            <CardHeader>
              <CardTitle>7. Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>Wir verwenden Plausible Analytics um Website-Nutzung zu analysieren. Keine personenbezogenen Daten werden gespeichert. Die Daten unterliegen EU-Datenschutzstandards.</p>
            </CardContent>
          </Card>
```

new_string:
```tsx
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
```

- [ ] **Step 4: Abschnitt 8 "Dritte" konkretisieren**

old_string:
```tsx
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
```

new_string:
```tsx
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
```

- [ ] **Step 5: Abschnitt 9 "Datenspeicherung" Löschfristen ergänzen**

old_string:
```tsx
              <p>Ihre Daten werden gespeichert solange Ihr Konto aktiv ist. Nach Kontolöschung werden Daten innerhalb von 30 Tagen gelöscht, außer wenn gesetzliche Aufbewahrungspflichten bestehen.</p>
```

new_string:
```tsx
              <p>Ihre Daten werden gespeichert solange Ihr Konto aktiv ist. Nach Kontolöschung werden Daten innerhalb von 30 Tagen gelöscht, außer wenn gesetzliche Aufbewahrungspflichten bestehen.</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Server-Logs (IP-Adresse, Browser): automatische Löschung nach <strong>30 Tagen</strong></li>
                <li>Anonymisierte Analytik-Daten: Löschung nach <strong>365 Tagen</strong></li>
                <li>Account-Daten: Löschung innerhalb von <strong>30 Tagen</strong> nach Kontolöschung</li>
              </ul>
```

- [ ] **Step 6: Prüfen**

```bash
grep -n "Art. 6\|Hetzner\|plausible.io\|30 Tagen\|365 Tagen" /root/SF-1-Ultimate-/apps/web-app/src/app/privacy/page.tsx
```

Erwartetes Ergebnis: alle 5 Begriffe gefunden.

- [ ] **Step 7: Commit**

```bash
cd /root/SF-1-Ultimate- && git add apps/web-app/src/app/privacy/page.tsx
git commit -m "fix(legal): datenschutz — art.6 rechtsgrundlagen + datenempfänger + löschfristen

DSGVO-Pflichtangaben nach Art. 13 vollständig gemacht.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: KCanG-Disclaimer auf Preisvergleich + Landing

**Files:**
- Modify: `apps/web-app/src/app/prices/page.tsx`
- Modify: `apps/web-app/src/app/landing/page.tsx`

- [ ] **Step 1: Preisvergleich-Seite lesen**

```bash
sed -n '120,145p' /root/SF-1-Ultimate-/apps/web-app/src/app/prices/page.tsx
```

- [ ] **Step 2: KCanG-Banner auf Preisseite einfügen**

Direkt nach dem öffnenden `<div className="space-y-6">` (Zeile ~124) und vor dem `<div>` mit dem Titel einfügen:

old_string:
```tsx
  return (
    <div className="space-y-6">

      <div>
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold">Preisvergleich</h1>
```

new_string:
```tsx
  return (
    <div className="space-y-6">

      <div className="rounded-lg border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
        <strong>Hinweis:</strong> Diese Seite dient ausschließlich zu Informationszwecken (Preisvergleich)
        und stellt keine Werbung im Sinne des Gesetzes zum kontrollierten Umgang mit Cannabis (KCanG) dar.
        Alle Inhalte richten sich an Erwachsene (18+) in Jurisdiktionen, in denen der Erwerb von Pflanzensamen legal ist.
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold">Preisvergleich</h1>
```

- [ ] **Step 3: KCanG-Hinweis im Landing-Footer einfügen**

old_string in `apps/web-app/src/app/landing/page.tsx`:
```tsx
      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
```

new_string:
```tsx
      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-xs text-muted-foreground mb-6 max-w-2xl mx-auto">
            Diese Website dient ausschließlich zu Informationszwecken und stellt keine Werbung im Sinne des KCanG dar.
            Alle Inhalte richten sich an Erwachsene (18+). Nur für legale Zwecke in Ihrer Jurisdiktion.
          </div>
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
```

- [ ] **Step 4: Prüfen**

```bash
grep -n "KCanG" /root/SF-1-Ultimate-/apps/web-app/src/app/prices/page.tsx /root/SF-1-Ultimate-/apps/web-app/src/app/landing/page.tsx
```

Erwartetes Ergebnis: je 1 Treffer in beiden Dateien.

- [ ] **Step 5: Commit**

```bash
cd /root/SF-1-Ultimate- && git add apps/web-app/src/app/prices/page.tsx apps/web-app/src/app/landing/page.tsx
git commit -m "fix(legal): KCanG-disclaimer auf preisvergleich + landing hinzugefügt

§26 KCanG — Inhalte klar als Information, nicht Werbung markiert.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Age-Gate-Modal — neue Komponente

**Files:**
- Create: `apps/web-app/src/components/age-gate-modal.tsx`

- [ ] **Step 1: Neue Datei erstellen**

Vollständiger Inhalt für `apps/web-app/src/components/age-gate-modal.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

const STORAGE_KEY = 'sf1_age_verified';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage

export function AgeGateModal() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
      return;
    }
    const timestamp = parseInt(stored, 10);
    if (Date.now() - timestamp > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      setVisible(true);
    }
  }, []);

  function handleConfirm() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setVisible(false);
  }

  function handleDeny() {
    window.location.href = 'about:blank';
  }

  if (!mounted || !visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <div className="mx-4 max-w-sm rounded-xl border bg-card p-8 shadow-2xl text-center space-y-6">
        <div className="flex justify-center">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Altersverifikation</h2>
          <p className="text-sm text-muted-foreground">
            Diese Website richtet sich ausschließlich an Erwachsene. Bist du 18 Jahre oder älter?
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button onClick={handleConfirm} className="w-full">
            Ja, ich bin 18 Jahre oder älter
          </Button>
          <Button onClick={handleDeny} variant="ghost" className="w-full text-muted-foreground">
            Nein, ich bin unter 18
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Gemäß § 5 JMStV ist diese Website nur für Personen ab 18 Jahren bestimmt.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Prüfen ob Datei korrekt erstellt**

```bash
grep -n "sf1_age_verified\|handleConfirm\|handleDeny\|TTL_MS" /root/SF-1-Ultimate-/apps/web-app/src/components/age-gate-modal.tsx
```

Erwartetes Ergebnis: alle 4 Begriffe gefunden.

---

### Task 5: Age-Gate-Modal in layout.tsx einbinden

**Files:**
- Modify: `apps/web-app/src/app/layout.tsx`

- [ ] **Step 1: Import hinzufügen**

old_string:
```tsx
import { FeedbackButton } from '@/components/feedback-button';
```

new_string:
```tsx
import { FeedbackButton } from '@/components/feedback-button';
import { AgeGateModal } from '@/components/age-gate-modal';
```

- [ ] **Step 2: Komponente einbinden**

old_string:
```tsx
              <CookieBanner />
              <PwaInstallPrompt />
```

new_string:
```tsx
              <CookieBanner />
              <AgeGateModal />
              <PwaInstallPrompt />
```

- [ ] **Step 3: Prüfen**

```bash
grep -n "AgeGateModal" /root/SF-1-Ultimate-/apps/web-app/src/app/layout.tsx
```

Erwartetes Ergebnis: 2 Zeilen (Import + Verwendung).

- [ ] **Step 4: TypeScript-Check**

```bash
cd /root/SF-1-Ultimate-/apps/web-app && npx tsc --noEmit 2>&1 | grep -i "age-gate\|AgeGate" | head -10
```

Erwartetes Ergebnis: keine Fehler für age-gate-modal.

- [ ] **Step 5: Commit**

```bash
cd /root/SF-1-Ultimate- && git add apps/web-app/src/components/age-gate-modal.tsx apps/web-app/src/app/layout.tsx
git commit -m "feat(legal): age-gate-modal — 18+ altersverifikation beim ersten besuch

§5 JMStV — localStorage-Flag, 30-Tage-TTL, SSR-safe.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Gesamtverifikation

- [ ] **Step 1: Alle Akzeptanz-Kriterien prüfen**

```bash
echo "=== Fix 1: Impressum ===" && grep -c "Privatperson\|§ 19 UStG\|KCanG\|NetzDG" /root/SF-1-Ultimate-/apps/web-app/src/app/impressum/page.tsx
echo "=== Fix 2: Datenschutz ===" && grep -c "Art. 6\|Hetzner\|plausible.io\|30 Tagen\|365 Tagen" /root/SF-1-Ultimate-/apps/web-app/src/app/privacy/page.tsx
echo "=== Fix 3: KCanG-Banner ===" && grep -c "KCanG" /root/SF-1-Ultimate-/apps/web-app/src/app/prices/page.tsx /root/SF-1-Ultimate-/apps/web-app/src/app/landing/page.tsx
echo "=== Fix 4: Age Gate ===" && grep -c "sf1_age_verified\|AgeGateModal" /root/SF-1-Ultimate-/apps/web-app/src/app/layout.tsx
```

Erwartetes Ergebnis: alle Zahlen > 0.

- [ ] **Step 2: Mastertest ausführen — keine Regressions**

```bash
cd /root/SF-1-Ultimate-/tests && npm run mastertest 2>&1 | tail -6
```

Erwartetes Ergebnis:
```
Test Files  11 passed (11)
     Tests  42 passed | 2 skipped (44)
```

---

### Akzeptanz-Checkliste (nach Abschluss aller Tasks)

- [ ] Impressum: "Privatperson", "§ 19 UStG", "KCanG", "NetzDG" vorhanden
- [ ] Datenschutz: Art. 6 Abs. 1b/c/f für alle Verarbeitungen genannt
- [ ] Datenschutz: Hetzner + Plausible als Datenempfänger konkret benannt
- [ ] Datenschutz: Löschfristen (30 Tage Logs, 365 Tage Analytics) genannt
- [ ] Preisseite: KCanG-Banner oben sichtbar
- [ ] Landing: KCanG-Hinweis im Footer-Bereich
- [ ] Age Gate: erscheint beim ersten Besuch (localStorage leer)
- [ ] Age Gate: "Nein"-Button → about:blank
- [ ] Age Gate: zweiter Besuch zeigt kein Modal (localStorage gesetzt)
- [ ] Mastertest: 0 failed

# SF-1 Rechtskonformität — Design Spec

**Datum:** 2026-05-09  
**Status:** Approved

## Ziel

6 kritische Rechtsmängel beheben: Impressum (Privatperson-Klarstellung), Datenschutzerklärung (Art. 6 DSGVO + Datenempfänger), KCanG-Disclaimer auf Preisseiten, Age-Gate-Modal für öffentliche Seiten.

---

## Fix 1 — Impressum (`app/impressum/page.tsx`)

**Problem:** Keine Rollenangabe, keine USt-ID-Aussage, kein KCanG-Verweis.

**Änderungen:**

Herausgeber-Abschnitt erweitern:
```
Pascal Klingen
Websitebetreiber (Privatperson)
Am Röttchen 5
41751 Viersen-Dülken
Deutschland

Hinweis: Diese Website wird als Privatperson betrieben. Es besteht keine 
gewerbliche Tätigkeit. Eine Umsatzsteuerpflicht besteht nicht (§ 19 UStG).
```

Neuer Abschnitt "Geltendes Recht" am Ende:
```
Diese Website unterliegt dem Recht der Bundesrepublik Deutschland, insbesondere:
- Gesetz zum kontrollierten Umgang mit Cannabis (KCanG)
- Telemediengesetz (TMG)
- Jugendmedienschutz-Staatsvertrag (JMStV)
- Datenschutz-Grundverordnung (DSGVO)
```

---

## Fix 2 — Datenschutzerklärung (`app/privacy/page.tsx`)

**Problem:** Keine Art.-6-Rechtsgrundlagen, Datenempfänger vage, Plausible unvollständig.

**Änderung A — Abschnitt 3 "Zweck" erweitern mit Rechtsgrundlagen:**
```
- Bereitstellung unserer Dienste (Art. 6 Abs. 1b DSGVO — Vertragserfüllung)
- Benutzerauthentifizierung (Art. 6 Abs. 1b DSGVO — Vertragserfüllung)
- Website-Analyse / Nutzungsstatistiken (Art. 6 Abs. 1f DSGVO — berechtigtes Interesse)
- Einhaltung gesetzlicher Verpflichtungen (Art. 6 Abs. 1c DSGVO)
- E-Mail-Kommunikation auf Anfrage (Art. 6 Abs. 1a DSGVO — Einwilligung)
```

**Änderung B — Abschnitt 8 "Dritte" konkretisieren:**
```
Ihre Daten werden verarbeitet durch folgende Dienstleister:

- Hetzner Online GmbH (Hosting, Deutschland) — Server-Infrastruktur; 
  Daten verbleiben in der EU; Auftragsverarbeitungsvertrag vorhanden.
- Plausible Analytics (EU-gehostet, Irland/Deutschland) — cookielose, 
  anonymisierte Website-Nutzungsanalyse; keine personenbezogenen Daten; 
  DSGVO-konform; kein Tracking über Seiten hinweg.

Darüber hinaus werden keine Daten an Dritte weitergegeben, außer bei 
gesetzlicher Verpflichtung.
```

**Änderung C — Abschnitt 7 "Analytics" konkretisieren:**
```
Wir verwenden Plausible Analytics (plausible.io). Plausible ist cookielos und 
speichert keine personenbezogenen Daten. IP-Adressen werden nicht gespeichert. 
Der Dienst ist vollständig DSGVO-konform und in der EU gehostet. 
Datenschutzerklärung: https://plausible.io/privacy
```

**Änderung D — Abschnitt 9 "Datenspeicherung" Log-Dauer ergänzen:**
```
Server-Logs (IP, Browser) werden nach 30 Tagen automatisch gelöscht.
Analytik-Daten (anonymisiert) werden nach 365 Tagen gelöscht.
Account-Daten: nach Kontolöschung innerhalb von 30 Tagen gelöscht.
```

---

## Fix 3 — KCanG-Disclaimer (`app/prices/page.tsx` + `app/landing/page.tsx`)

**Problem:** Preisvergleich könnte als Werbung i.S.d. § 26 KCanG ausgelegt werden — kein Hinweis vorhanden.

**Komponente:** Inline-Banner (kein eigenes File, ~5 Zeilen JSX) oben auf der Preisseite und im Landing-Footer-Bereich.

**Text:**
```
ℹ️ Diese Seite dient ausschließlich zu Informationszwecken (Preisvergleich) 
und stellt keine Werbung im Sinne des Gesetzes zum kontrollierten Umgang 
mit Cannabis (KCanG) dar. Alle Inhalte richten sich an Erwachsene (18+) 
in Jurisdiktionen, in denen der Erwerb von Pflanzensamen legal ist.
```

**Design:** `bg-muted border rounded-lg p-3 text-xs text-muted-foreground` — unauffällig, aber vorhanden.

---

## Fix 4 — Age Gate Modal (`components/age-gate-modal.tsx` + `app/layout.tsx`)

**Problem:** Öffentliche Seiten (Landing, Preise, Strains etc.) zeigen Cannabis-Inhalte ohne Altersverifikation.

**Architektur:**
- Neue Client-Komponente `components/age-gate-modal.tsx`
- Eingebunden in `app/layout.tsx` direkt nach `<CookieBanner />`
- localStorage-Key: `sf1_age_verified`, Wert: Unix-Timestamp
- Ablauf: 30 Tage (2.592.000 Sekunden)
- SSR-safe: `mounted`-Flag verhindert Hydration-Mismatch

**Verhalten:**
- Beim ersten Besuch: Vollbild-Overlay, z-index > alles
- "Ja, ich bin 18+" → Timestamp setzen, Modal schließen
- "Nein" → `window.location.href = 'about:blank'`
- Bereits verifiziert (localStorage vorhanden + nicht abgelaufen) → kein Modal

**Komponenten-Struktur:**
```tsx
'use client';
// useState(false) für mounted + visible
// useEffect: prüft localStorage nach Hydration
// Dialog/Modal: fixed inset-0 bg-black/80 z-[9999]
// Zwei Buttons: primary "Ja, ich bin 18+" / ghost "Nein"
// Kein Schließen durch Klick außerhalb (kein onOpenChange)
```

---

## Betroffene Dateien

| Datei | Art | Fix |
|-------|-----|-----|
| `apps/web-app/src/app/impressum/page.tsx` | Modify | Fix 1 |
| `apps/web-app/src/app/privacy/page.tsx` | Modify | Fix 2 |
| `apps/web-app/src/app/prices/page.tsx` | Modify | Fix 3 |
| `apps/web-app/src/app/landing/page.tsx` | Modify | Fix 3 |
| `apps/web-app/src/components/age-gate-modal.tsx` | Create | Fix 4 |
| `apps/web-app/src/app/layout.tsx` | Modify | Fix 4 |

---

## Akzeptanz-Kriterien

- [ ] Impressum: "Privatperson", "§ 19 UStG", KCanG-Verweis vorhanden
- [ ] Datenschutz: Art. 6 Abs. 1b/c/f für alle Verarbeitungen genannt
- [ ] Datenschutz: Hetzner + Plausible als Datenempfänger konkret benannt
- [ ] Preisseite: KCanG-Banner sichtbar oben auf der Seite
- [ ] Landing: KCanG-Hinweis im unteren Bereich
- [ ] Age Gate: Erscheint beim ersten Besuch auf jeder öffentlichen Seite
- [ ] Age Gate: localStorage-Flag verhindert erneutes Erscheinen (30 Tage)
- [ ] Age Gate: "Nein"-Button führt zu about:blank
- [ ] Kein Punkt aus der 🔴-Kritisch-Liste des Rechtschecks offen

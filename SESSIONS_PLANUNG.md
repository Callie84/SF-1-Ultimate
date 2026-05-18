# SF-1 Ultimate — Detaillierter Sessionplan (Sessions 30–39)

**Projektname:** seedfinderpro.de
**Stand:** 06.03.2026
**Abgeschlossen:** Sessions 1–29
**Dieses Dokument:** Planung der verbleibenden Sessions bis zum Launch

---

> **Für Nicht-Techniker:** Dieses Dokument erklärt in einfacher Sprache, was in jeder Session gebaut wird, warum es wichtig ist, und wie es nach der Umsetzung aussieht. Technische Fachbegriffe werden immer direkt erklärt.

---

## Was bisher geschah (Sessions 1–29)

In den ersten 29 Sessions wurde die komplette Plattform aufgebaut:
- Die Website selbst (Startseite, Navigation, Design)
- Ein Benutzersystem (Registrierung, Anmeldung, Profil)
- Das Forum (Beiträge schreiben, kommentieren, abstimmen)
- Ein Grow-Tagebuch (eigene Anbauversuche dokumentieren mit Fotos)
- Eine Strain-Datenbank (Sorten suchen, bewerten, vergleichen)
- Ein Preisvergleich (Marktpreise überwachen)
- Ein Benachrichtigungssystem (Nachrichten wenn jemand antwortet)
- Ein Werbezonen-System (Werbebanner auf der Website platzieren)
- Ein automatisches Backup-System (tägliche Datensicherung)

Was jetzt noch fehlt: Sicherheit, E-Mail, externe Speicherung, Stabilität und der Launch.

---

## Session 30 — Forum-Moderations-Workflow

**Ziel:** Nutzer können Regelverstöße melden, Moderatoren können handeln.

### Was ist das Problem?

Im Moment gibt es kein System, wenn jemand im Forum unangemessene Inhalte postet (Beleidigungen, illegale Inhalte, Spam). Jeder Beitrag ist sichtbar und es gibt keine Möglichkeit einzugreifen, ohne direkt in die Datenbank zu gehen — das ist nur für Entwickler möglich.

### Was wird gebaut?

**1. Melden-Button für jeden Beitrag und Kommentar**
- Neben jedem Forum-Beitrag erscheint ein kleines "Melden"-Symbol (Flagge)
- Klickt man darauf, öffnet sich ein kleines Fenster
- Der Nutzer wählt einen Grund aus: "Spam", "Beleidigung", "Falschinformation", "Illegaler Inhalt" oder "Sonstiges"
- Optional kann er einen kurzen Text dazu schreiben
- Die Meldung wird gespeichert und ist unsichtbar für andere normale Nutzer

**2. Moderatoren-Rolle**
- Bisher gibt es nur "normaler Nutzer" und "Administrator" (der hat alle Rechte)
- Es kommt eine neue Stufe dazwischen: der "Moderator"
- Moderatoren können gemeldete Inhalte sehen und handeln, aber keine Systemeinstellungen ändern
- Der Administrator kann im Admin-Bereich Moderatoren ernennen

**3. Admin-Seite für gemeldete Inhalte (/admin/reports)**
- Eine neue Seite im Admin-Bereich zeigt alle gemeldeten Inhalte
- Man sieht: welcher Beitrag, von wem, warum gemeldet, wie oft bereits gemeldet
- Verfügbare Aktionen:
  - **Ignorieren** — die Meldung ist unbegründet, Beitrag bleibt stehen
  - **Beitrag ausblenden** — der Beitrag ist für andere Nutzer nicht mehr sichtbar, aber noch in der Datenbank
  - **Beitrag löschen** — der Beitrag wird dauerhaft entfernt
  - **Nutzer verwarnen** — der Autor bekommt eine offizielle Warnung (sichtbar auf seinem Profil)
  - **Nutzer sperren** — der Account wird gesperrt, Login nicht mehr möglich

**4. Moderatoren-Badge**
- Moderatoren erhalten im Forum ein kleines "Mod"-Abzeichen neben ihrem Namen, damit Nutzer wissen, an wen sie sich wenden können

### Was der Nutzer danach sieht:
- Jeder angemeldete Nutzer sieht bei jedem Beitrag einen Melden-Button
- Moderatoren sehen zusätzlich direkte Aktions-Buttons bei gemeldeten Inhalten
- Der Admin-Bereich hat einen neuen Menüpunkt "Meldungen" mit einem roten Zähler bei unbearbeiteten Fällen

### Technisch (für Entwickler):
- Neues `Report`-Datenmodell in MongoDB (community-service)
- Neue API-Routen: `POST /api/community/reports`, `GET /api/community/reports` (admin), `PATCH /api/community/reports/:id`
- Neue Middleware: `moderatorAuth` (erlaubt Moderatoren UND Admins)
- Frontend: ReportButton-Komponente, /admin/reports Seite
- Rolle "MODERATOR" in auth-service JWT-Payload ergänzen

---

## Session 31 — E-Mail-System (SMTP)

**Ziel:** Die Plattform kann E-Mails verschicken.

### Was ist das Problem?

Im Moment kann die Website keine E-Mails senden. Das bedeutet:
- Neue Nutzer bekommen keine Willkommens-E-Mail
- Wenn man sein Passwort vergisst, gibt es keinen "Passwort vergessen"-Link
- Benachrichtigungen (jemand hat auf deinen Beitrag geantwortet) gibt es nur auf der Website selbst, nicht per E-Mail

### Was ist SMTP?

SMTP (Simple Mail Transfer Protocol) ist der Standard, über den E-Mails versendet werden — so wie ein Postamt, das Briefe weiterschickt. Man braucht einen E-Mail-Anbieter (z.B. Brevo, Mailgun oder einen eigenen Server) und gibt der Website die "Zugangsdaten" dieses Postamts.

### Was wird gebaut?

**1. SMTP-Konfiguration**
- Ein neuer E-Mail-Dienst (entweder als Teil des Auth-Service oder kleiner eigener Service) wird eingerichtet
- Die Zugangsdaten zum E-Mail-Anbieter werden sicher in der Konfigurationsdatei gespeichert
- Empfehlung: **Brevo** (früher Sendinblue) — kostenlos bis 300 E-Mails/Tag, einfache Einrichtung

**2. E-Mail-Vorlagen (Templates)**
- Professionell gestaltete HTML-E-Mails mit dem SF-1-Logo und Design
- Vorlage 1: **Willkommens-E-Mail** nach Registrierung ("Herzlich willkommen bei seedfinderpro.de!")
- Vorlage 2: **Passwort-Reset-E-Mail** mit einem Link zum Zurücksetzen (Link ist 1 Stunde gültig)
- Vorlage 3: **Tägliche Benachrichtigungs-Zusammenfassung** ("Du hast 3 neue Antworten auf deine Beiträge")

**3. Passwort-vergessen-Funktion**
- Auf der Login-Seite erscheint ein "Passwort vergessen?"-Link
- Nutzer gibt seine E-Mail-Adresse ein
- Er bekommt eine E-Mail mit einem einmaligen Link
- Über diesen Link kann er ein neues Passwort setzen
- Der Link verfällt nach 1 Stunde (Sicherheit)

**4. Admin-Testbereich**
- Im Admin-Bereich gibt es eine Seite zum Testen: "Test-E-Mail senden"
- Der Admin gibt eine Empfänger-Adresse ein und wählt ein Template aus
- Er klickt "Senden" und sieht sofort ob es funktioniert hat

**5. E-Mail-Einstellungen für Nutzer**
- Jeder Nutzer kann in seinen Einstellungen festlegen, welche E-Mails er bekommen möchte
- Optionen: "Benachrichtigungs-Zusammenfassung täglich/wöchentlich/nie"

### Was der Nutzer danach sieht:
- Nach der Registrierung kommt eine E-Mail ("Willkommen!")
- Auf der Login-Seite gibt es "Passwort vergessen?" und es funktioniert
- In den Einstellungen gibt es einen neuen Bereich "E-Mail-Benachrichtigungen"

### Technisch (für Entwickler):
- Package: `nodemailer` für den E-Mail-Versand
- Neuer Endpunkt im auth-service: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- PasswordResetToken-Modell in MongoDB (mit TTL-Index für automatisches Ablaufen)
- E-Mail-Templates als HTML-Strings mit Platzhaltern (kein externes Template-System nötig)
- Umgebungsvariablen: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

---

## Session 32 — Hetzner Object Storage (Cloud-Speicher für Fotos)

**Ziel:** Fotos werden sicher in der Cloud gespeichert, nicht mehr auf dem Server.

### Was ist das Problem?

Im Moment werden alle Fotos, die Nutzer in ihr Grow-Tagebuch hochladen, direkt auf dem Server gespeichert — in einem Ordner namens `/app/uploads/`. Das hat mehrere Nachteile:
- Wenn der Server neu gestartet wird (z.B. nach einem Update), können die Fotos verloren gehen
- Der Speicherplatz auf dem Server ist begrenzt
- Es gibt keine Möglichkeit, die Fotos einfach zu sichern

### Was ist Object Storage?

Object Storage (Objektspeicher) ist ein Cloud-Dienst, der wie ein riesiger Online-Ordner funktioniert. Man lädt Dateien hoch und bekommt einen Link. Der Anbieter kümmert sich um Speicherplatz, Backups und Verfügbarkeit. Hetzner bietet einen solchen Dienst an, der günstig ist und in Europa liegt (wichtig für Datenschutz).

### Was wird gebaut?

**1. Hetzner Object Storage einrichten**
- Ein "Bucket" (= Ordner in der Cloud) namens `sf1-uploads` wird erstellt
- Die Zugangsdaten werden sicher in der Konfiguration gespeichert

**2. Foto-Upload auf Cloud umstellen**
- Wenn ein Nutzer ein Foto hochlädt, landet es nicht mehr auf dem Server
- Stattdessen wird es direkt zu Hetzner geschickt
- Hetzner gibt einen Link zurück, der gespeichert wird
- Das Foto ist dann über diesen Link abrufbar

**3. Bestehende Fotos umziehen**
- Alle bereits hochgeladenen Fotos werden einmalig von der Server-Festplatte in die Cloud kopiert
- Die Links in der Datenbank werden aktualisiert
- Danach kann der alte Upload-Ordner auf dem Server gelöscht werden

**4. Sichere Auslieferung (Presigned URLs)**
- Fotos sind nicht einfach für jeden öffentlich zugänglich
- Wenn jemand ein Foto anschauen will, bekommt er einen temporären Link (gültig für z.B. 1 Stunde)
- Das verhindert, dass jemand alle Fotos massenweise herunterlädt

### Was der Nutzer danach sieht:
- Für den normalen Nutzer ändert sich nichts sichtbares — Fotos laden und anzeigen funktioniert genauso
- Fotos gehen nicht mehr verloren, wenn der Server neugestartet wird
- Der Speicherplatz ist praktisch unbegrenzt

### Technisch (für Entwickler):
- Package: `@aws-sdk/client-s3` (Hetzner ist S3-kompatibel)
- journal-service: Upload-Middleware von `multer`-Disk auf `multer`-Memory umstellen
- S3-Upload-Funktion mit `PutObjectCommand`
- Presigned URLs mit `GetObjectCommand` + `getSignedUrl`
- Migrations-Skript: liest alle Journal-Einträge, kopiert lokale Dateien zu S3, aktualisiert URLs
- Umgebungsvariablen: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`

---

## Session 33 — Erweitertes Nutzerprofil

**Ziel:** Nutzerprofile werden persönlicher und informativer.

### Was ist das Problem?

Im Moment zeigt ein Nutzerprofil nur sehr wenig: Name, Registrierungsdatum, vielleicht ein paar Statistiken. Es gibt kein Profilbild, keine persönliche Beschreibung, und das Profil wirkt leer.

### Was wird gebaut?

**1. Profilbild-Upload (Avatar)**
- Jeder Nutzer kann ein Bild von sich (oder einem Maskottchen etc.) hochladen
- Das Bild wird auf Hetzner Object Storage gespeichert (wie in Session 32 gelernt)
- Das Profilbild erscheint überall: im Forum neben dem Namen, im Profil, im Header der Website
- Wenn kein Bild hochgeladen wurde, gibt es einen automatisch generierten Buchstaben-Avatar (wie bei Google)

**2. Persönliche Beschreibung (Bio)**
- Im Profil-Bearbeitungsbereich gibt es ein Textfeld "Über mich"
- Bis zu 500 Zeichen, einfache Formatierung (fett, kursiv, Links)
- Wird öffentlich auf dem Profil angezeigt

**3. Öffentliche Profilseite**
- Jeder Nutzer hat eine öffentliche URL: `seedfinderpro.de/u/benutzername`
- Dort sieht man: Profilbild, Name, Bio, Mitglied seit, Aktivitätsstatistiken
- Statistiken: Anzahl Forum-Beiträge, Grow-Tagebücher, bewertete Strains
- Neueste Forum-Aktivität (letzte 5 Beiträge)
- Lieblings-Strains (optional, kann der Nutzer selbst auswählen)

**4. Profil-Privatsphäre-Einstellungen**
- Der Nutzer kann festlegen, was öffentlich sichtbar ist
- Optionen: "Profil komplett privat", "Nur Statistiken zeigen", "Alles öffentlich"

**5. Verbesserte Follow-Benachrichtigungen**
- Wenn jemand dem Nutzer folgt, bekommt er eine Benachrichtigung (schon vorhanden)
- Neu: Im Profil sieht man "X Follower" und "Y folge ich" mit einer Liste
- Man kann Follower direkt vom Profil aus blocken

### Was der Nutzer danach sieht:
- Ein eigenes Profilbild hochladen in den Einstellungen
- Eine "Über mich"-Beschreibung schreiben
- Das eigene Profil unter `seedfinderpro.de/u/meinname` anschauen und teilen
- Profilbilder anderer Nutzer überall auf der Website

### Technisch (für Entwickler):
- auth-service: Neues Feld `avatarUrl`, `bio`, `isProfilePublic` im User-Modell
- Neuer Endpunkt: `POST /api/auth/upload-avatar` (Multipart-Upload → S3)
- Neue öffentliche Route: `GET /api/auth/profile/:username` (optionale Auth)
- Frontend: `/u/[username]` Seite (Next.js Dynamic Route)
- Profilbild-Komponente in allen relevanten Stellen einbauen (Forum, Header, etc.)

---

## Session 34 — Strain-Community-Features

**Ziel:** Die Strain-Datenbank wird interaktiver und mit der Community verknüpft.

### Was ist das Problem?

Die Strain-Datenbank (Sorten-Übersicht) funktioniert gut zum Suchen und Vergleichen. Aber sie ist noch einseitig — die Nutzer können zwar eine Bewertung abgeben, aber die Verbindung zur Community (Forum, eigene Grows) fehlt.

### Was wird gebaut?

**1. Detailliertere Strain-Bewertungen**
- Bisher: einfache Sternebewertung (1–5)
- Neu: mehrere Kategorien bewertbar:
  - **Ertrag** — wie viel hat die Pflanze produziert? (1–5 Sterne)
  - **Schwierigkeit** — wie einfach/schwer zu kultivieren? (Anfänger / Mittel / Fortgeschritten)
  - **Genetik** — Indica / Sativa / Hybrid (eigene Einschätzung)
  - **Wirkung** — entspannend, energetisch, kreativ, etc. (mehrere auswählbar)
  - **Aroma** — Erdbeer, Zitrus, Kiefer, Erde, etc. (mehrere auswählbar)
  - **Freitext-Erfahrungsbericht** — ausführlicher Text (min. 100 Zeichen)
- Alle Bewertungen werden aggregiert und auf der Strain-Seite als Durchschnitt angezeigt

**2. Strain-Diskussions-Link**
- Auf jeder Strain-Seite gibt es einen Button "Diskussion im Forum"
- Klickt man darauf, gelangt man zu allen Forum-Beiträgen, die diese Strain erwähnen oder taggen
- Alternativ kann man direkt einen neuen Beitrag mit diesem Strain erstellen

**3. "Ich baue das gerade an" — Grow-Markierung**
- Auf jeder Strain-Seite gibt es einen Button "Ich baue das an"
- Nutzer die gerade diese Sorte kultivieren, können sich eintragen
- Auf der Strain-Seite erscheint: "12 Nutzer bauen diese Sorte gerade an"
- Man kann andere Grower direkt anschreiben und Erfahrungen austauschen

**4. Top-Strains Ranking auf der Startseite**
- Ein neuer Bereich auf der Startseite: "Top 10 Strains diese Woche"
- Basierend auf: Bewertungen + Forum-Erwähnungen + aktive Grows
- Aktualisiert sich automatisch jede Woche

**5. Strain-Sammlungen (Wishlist)**
- Nutzer können Strains zu ihrer Wunschliste hinzufügen
- Sichtbar auf dem eigenen Profil: "Meine Wunschliste"
- Optional: Wunschliste mit anderen teilen (per Link)

### Was der Nutzer danach sieht:
- Auf jeder Strain-Seite: ausführliche Community-Bewertungen mit Kategorien
- Button "Ich baue das an" → zeigt wer das gerade kultiviert
- Direkter Link zu Forum-Diskussionen über diese Sorte
- Auf der Startseite: aktuelles Top-10-Ranking

### Technisch (für Entwickler):
- Erweitertes `StrainReview`-Modell (community-service oder price-service): neue Felder für Kategorien
- Neues `StrainGrow`-Modell: userId + strainId + startedAt
- Neues `StrainWishlist`-Modell: userId + [strainIds]
- Aggregations-Pipeline für Ranking (wöchentlich per Cron)
- Frontend: überarbeitete Strain-Detail-Seite mit Tabs (Info / Bewertungen / Diskussion / Grower)

---

## Session 35 — Monitoring & Stabilität

**Ziel:** Die Plattform wird überwacht und erholt sich automatisch von Problemen.

### Was ist das Problem?

Im Moment gibt es keine automatische Benachrichtigung, wenn etwas auf der Website nicht funktioniert. Wenn nachts ein Service abstürzt, merkt das niemand bis am nächsten Morgen — oder bis ein Nutzer Bescheid gibt. Das ist für eine Produktions-Website nicht akzeptabel.

### Was ist Monitoring?

Monitoring (Überwachung) bedeutet: Ein externes System prüft regelmäßig (z.B. jede Minute), ob die Website erreichbar ist. Wenn nicht, sendet es sofort eine Alarm-Nachricht (z.B. per E-Mail oder Telegram).

### Was wird gebaut?

**1. UptimeRobot einrichten (externes Monitoring)**
- UptimeRobot ist ein kostenloser Dienst, der Websites überwacht
- Er prüft alle 5 Minuten: "Ist seedfinderpro.de erreichbar?"
- Wenn die Website antwortet, ist alles gut
- Wenn nicht, kommt sofort eine E-Mail-Benachrichtigung
- Einrichtung für alle wichtigen URLs: Startseite, Forum, API, Admin-Bereich
- Öffentliche Status-Seite einrichten: `status.seedfinderpro.de` — dort können Nutzer selbst prüfen ob es einen Ausfall gibt

**2. Health-Dashboard im Admin-Bereich**
- Eine neue Seite `/admin/health` zeigt alle laufenden Services auf einen Blick
- Für jeden Service: Status (grün/gelb/rot), Antwortzeit, letzter Fehler
- Aktualisiert sich automatisch alle 30 Sekunden
- Anzeige von: CPU-Auslastung, Arbeitsspeicher, Datenbankverbindung, letzte Backup-Zeit

**3. Automatischer Service-Neustart**
- Docker (das Programm, das alle Services verwaltet) hat eine Option: `restart: unless-stopped`
- Das bedeutet: Wenn ein Service abstürzt, startet Docker ihn automatisch neu — innerhalb von Sekunden
- Wird für alle Services geprüft und wo nötig aktiviert

**4. Fehler-Logging verbessern**
- Bisher werden Fehler nur in die Console geschrieben (nur für Entwickler sichtbar)
- Neu: Fehler werden in eine Datei geschrieben mit Zeitstempel, Service-Name, und Fehlermeldung
- Der Admin-Bereich zeigt die letzten 50 Fehler aus allen Services
- Bei kritischen Fehlern (Server-Absturz, Datenbankfehler) kommt sofort eine E-Mail

**5. Performance-Metriken**
- Wie lange dauern API-Anfragen durchschnittlich?
- Welche Endpunkte sind langsam (über 2 Sekunden)?
- Einfaches Dashboard zeigt die Top 10 langsamsten Anfragen der letzten 24 Stunden

### Was der Nutzer danach sieht:
- Normale Nutzer: merken keinen Unterschied — außer dass die Website zuverlässiger läuft
- Admin: Neuer Menüpunkt "System-Status" im Admin-Bereich mit grünen/roten Ampeln
- Bei Ausfällen: sofortige E-Mail-Benachrichtigung an den Admin

### Technisch (für Entwickler):
- UptimeRobot: kostenloser Account, Monitoring per HTTP(S), Alert via E-Mail
- Health-Endpunkt: `GET /api/health` in jedem Service (schon teilweise vorhanden, vereinheitlichen)
- Winston-Logger in allen Services standardisieren, Log-Datei pro Service
- Docker Compose: `restart: unless-stopped` für alle Service-Container prüfen
- Frontend: `/admin/health` Seite mit `useQuery` und 30s Refetch-Interval

---

## Session 36 — PWA & Mobile-Optimierung

**Ziel:** Die Website verhält sich auf dem Smartphone wie eine App.

### Was ist eine PWA?

PWA steht für Progressive Web App. Das bedeutet: Eine normale Website, die sich auf dem Smartphone so verhält wie eine echte App aus dem App Store — aber ohne dass man sie herunterladen muss. Man kann sie zum Startbildschirm hinzufügen, sie startet dann ohne Browser-Leiste, und sie kann sogar Benachrichtigungen schicken (wie eine echte App).

### Was wird gebaut?

**1. Manifest-Datei (App-Steckbrief)**
- Eine kleine Konfigurationsdatei beschreibt: App-Name, Icon, Hintergrundfarbe, Startseite
- Damit weiß das Smartphone, wie die App aussehen soll wenn man sie zum Startbildschirm hinzufügt
- Das SF-1-Logo wird als App-Icon verwendet (verschiedene Größen für verschiedene Geräte)

**2. "Zur Startseite hinzufügen"-Banner**
- Auf Smartphones erscheint ein Banner: "seedfinderpro.de zum Startbildschirm hinzufügen"
- iOS: Nutzer wird durch den manuellen Prozess geführt (Screenshot-Anleitung)
- Android: Automatischer Browser-Dialog erscheint

**3. Service Worker (Offline-Fähigkeit)**
- Ein Service Worker ist ein Programm, das im Hintergrund des Browsers läuft
- Er speichert wichtige Seiten und Ressourcen (Bilder, Schriftarten) lokal
- Wenn die Internetverbindung kurz unterbrochen wird, werden diese gecachten Ressourcen genutzt
- Bei vollständigem Offline-Betrieb: eine schöne Offline-Seite mit der Meldung "Du bist offline"

**4. Web Push Notifications**
- Nutzer können Benachrichtigungen abonnieren (Browser fragt nach Erlaubnis)
- Wenn jemand auf einen Beitrag antwortet, kommt eine Push-Benachrichtigung — auch wenn die Website nicht offen ist
- Das ist eine Alternative zu E-Mail-Benachrichtigungen und direkter/schneller
- Nutzer können in den Einstellungen festlegen, für was sie Pushes bekommen wollen

**5. Mobile-Optimierungen**
- Touch-Gesten verbessern: Wischen zum Zurückgehen
- Bilder werden für mobile Verbindungen kleinere Versionen geladen (spart Daten)
- Ladezeiten auf Mobilgeräten messen und optimieren

### Was der Nutzer danach sieht:
- Auf Android/iOS: "Zum Startbildschirm hinzufügen" Möglichkeit
- Die App startet wie eine echte App (kein Browser-Chrome sichtbar)
- Push-Benachrichtigungen auf dem Sperrbildschirm
- Schnelleres Laden beim zweiten Besuch

### Technisch (für Entwickler):
- `next-pwa` oder manueller Service Worker mit Workbox
- `manifest.json` in `/public/`
- Web Push: `web-push` npm-Package, VAPID-Keys generieren, Subscription in MongoDB speichern
- Neuer Endpunkt: `POST /api/notification/push-subscribe`
- Push-Versand in notification-service bei neuen Benachrichtigungen

---

## Session 37 — Analytics & Admin-Insights

**Ziel:** Der Admin bekommt aussagekräftige Statistiken über die Plattform.

### Was ist das Problem?

Im Moment hat der Admin keine guten Zahlen: Wie viele Nutzer sind aktiv? Welche Inhalte sind beliebt? Wächst die Community? Ohne diese Daten kann man nicht gut entscheiden, was als nächstes verbessert werden soll.

### Was wird gebaut?

**1. Übersichts-Dashboard für den Admin (/admin/analytics)**
- Neue Admin-Seite mit Karten und Grafiken
- Karte "Nutzer heute": Wie viele haben sich heute eingeloggt?
- Karte "Neue Registrierungen": Verlauf der letzten 30 Tage als Liniendiagramm
- Karte "Aktive Nutzer": Wöchentlich aktive Nutzer (haben mindestens eine Aktion durchgeführt)
- Karte "Forum-Aktivität": Beiträge und Kommentare pro Tag

**2. Inhalts-Statistiken**
- Welche Forum-Beiträge haben die meisten Aufrufe?
- Welche Strains werden am häufigsten gesucht?
- Welche Strain-Kategorien sind beliebt?
- Top 10 aktivste Nutzer (Beiträge + Kommentare)

**3. Grow-Statistiken**
- Durchschnittliche Grow-Dauer (von Start bis Ernte)
- Durchschnittliche Erntemenge pro Strain
- Beliebteste Strains in Grow-Tagebüchern
- Wachstumstrend: Werden mehr Grows gestartet als letzten Monat?

**4. Werbeanzeigen-Statistiken**
- Wie oft wurde jede Werbeanzeige angezeigt? (Impressionen)
- Wie oft wurde geklickt? (Klickrate)
- Welche Werbezone (oben, unten, Seitenleiste) performt am besten?
- Einnahmen-Übersicht für gebuchte Anzeigen

**5. Zeitraum-Filter**
- Alle Statistiken können gefiltert werden: Letzte 7 Tage / 30 Tage / 90 Tage / 1 Jahr
- Export als CSV-Datei (kann in Excel geöffnet werden)

### Was der Nutzer danach sieht:
- Normale Nutzer: keine Änderung
- Admin: Neuer Menüpunkt "Analytics" mit übersichtlichen Grafiken und Zahlen

### Technisch (für Entwickler):
- Keine externen Analytics-Dienste (kein Google Analytics) — Datenschutz
- Aggregations-Pipelines in MongoDB für alle Statistiken
- Caching: Statistiken werden stündlich berechnet und in Redis gespeichert
- Chart-Library: `recharts` (schon evtl. installiert) für Linien- und Balkendiagramme
- CSV-Export: einfache String-Konvertierung ohne externe Library

---

## Session 38 — Export, Datenschutz & DSGVO

**Ziel:** Die Plattform erfüllt alle rechtlichen Anforderungen der DSGVO.

### Was ist die DSGVO?

Die DSGVO (Datenschutz-Grundverordnung) ist ein EU-Gesetz, das regelt, wie Websites mit persönlichen Daten umgehen müssen. Wer dagegen verstößt, riskiert hohe Bußgelder. Die wichtigsten Anforderungen für eine Community-Plattform sind:
- Nutzer müssen ihre eigenen Daten herunterladen können
- Nutzer müssen ihren Account löschen können (mit allen Daten)
- Es muss eine verständliche Datenschutzerklärung geben
- Es muss ein Impressum geben (in Deutschland Pflicht)

### Was wird gebaut?

**1. "Meine Daten herunterladen"-Funktion**
- In den Einstellungen gibt es einen Button "Meine Daten herunterladen"
- Das System sammelt alle Daten des Nutzers: Profil, Beiträge, Kommentare, Grows, Bewertungen
- Diese werden als ZIP-Datei zum Download angeboten
- Inhalt: mehrere JSON-Dateien und alle hochgeladenen Fotos
- Der Download wird per E-Mail zugesendet (kann 10-30 Minuten dauern)

**2. "Account löschen"-Funktion**
- In den Einstellungen: "Account unwiderruflich löschen"
- Es erscheint ein Bestätigungsdialog mit Eingabefeld (Nutzer muss "LÖSCHEN" eintippen)
- Nach Bestätigung wird gelöscht: Profil, alle Beiträge und Kommentare, alle Grows, alle Fotos, alle Benachrichtigungen
- Ausnahme: Bewertungen werden anonymisiert gespeichert (keine persönlichen Daten, aber für die Datenbank wichtig)
- Nutzer bekommt eine Abschluss-E-Mail ("Dein Account wurde gelöscht")

**3. Grow-Tagebuch als PDF exportieren**
- Im Grow-Tagebuch: Button "Diesen Grow als PDF exportieren"
- Das PDF enthält: alle Einträge, Fotos, Datum und Notizen, Zusammenfassung
- Schönes Layout mit dem SF-1-Design
- Nützlich für persönliche Aufzeichnungen oder zum Teilen

**4. Datenschutzerklärung & Impressum**
- Eine vollständige, rechtlich korrekte Datenschutzerklärung auf `/datenschutz`
- Ein Impressum auf `/impressum` (in Deutschland für kommerzielle Websites Pflicht: Name, Adresse, E-Mail)
- Beide Seiten im Footer der Website verlinkt
- Cookie-Banner: Falls Cookies genutzt werden, muss Einwilligung eingeholt werden

**5. Einwilligungen verwalten**
- Nutzer können in den Einstellungen sehen, welchen Nutzungsbedingungen sie wann zugestimmt haben
- Bei Änderung der Datenschutzerklärung: Nutzer wird beim nächsten Login um neue Zustimmung gebeten

### Was der Nutzer danach sieht:
- In den Einstellungen: Zwei neue Abschnitte "Meine Daten" und "Account löschen"
- Im Grow-Tagebuch: "Als PDF exportieren"-Button
- Im Footer: Links zu Datenschutz und Impressum
- Cookie-Banner beim ersten Besuch

### Technisch (für Entwickler):
- PDF-Generierung: `puppeteer` (rendert HTML als PDF) oder `pdfkit` (programmatisch)
- Daten-Export: Async-Job (dauert länger), Status via WebSocket oder Polling
- Cascade-Delete: Mongoose-Middleware (`pre('deleteOne')`) in allen betroffenen Services
- Neues Feld im User-Modell: `gdprConsents: [{version, acceptedAt}]`
- Cookie-Banner: einfache React-Komponente ohne externe Library

---

## Session 39 — Launch-Vorbereitung

**Ziel:** Die Plattform ist bereit für echte Nutzer.

### Was passiert in dieser Session?

Das ist die letzte Session vor dem Launch. Sie ist kein großes Feature, sondern ein "Feinschliff"-Sprint: Alles wird zusammengeführt, getestet und auf Launch vorbereitet.

### Was wird gebaut?

**1. Onboarding-Flow für neue Nutzer**
- Wenn sich jemand neu registriert, wird er durch einen kurzen "Willkommens-Assistenten" geführt
- Schritt 1: "Wie heißt du? Wähle deinen Anzeigenamen"
- Schritt 2: "Was interessiert dich? Wähle deine Lieblings-Strain-Kategorien"
- Schritt 3: "Möchtest du dein Profilbild hochladen?"
- Schritt 4: "Hier sind 5 Forum-Beiträge, die für dich interessant sein könnten"
- Am Ende: direkt im Forum-Feed, bereit loszulegen

**2. Social-Sharing (OG-Tags)**
- Wenn jemand einen Link zu einem Forum-Beitrag auf WhatsApp, Twitter oder Facebook teilt, wird eine Vorschau angezeigt
- Vorschau zeigt: Beitragstitel, kurze Beschreibung, Bild (wenn vorhanden)
- Das nennt man "Open Graph Tags" (OG-Tags) — unsichtbare Metadaten im HTML
- Gleiches für Strain-Seiten und Grow-Tagebücher (wenn öffentlich)

**3. Letzter Bug-Fix-Sprint**
- Alle bekannten Bugs aus dem BUG_TRACKER.md werden durchgegangen
- Kritische Bugs (die die Nutzung blockieren) werden behoben
- Kleinere Bugs werden dokumentiert für nach dem Launch

**4. Performance-Optimierung**
- Code-Splitting: Große JavaScript-Dateien werden aufgeteilt, damit die Seite schneller lädt
- Bild-Optimierung: Next.js Image-Komponente konsequent einsetzen (lädt kleinere Bilder je nach Bildschirmgröße)
- Lazy Loading: Inhalte die "unten auf der Seite" sind, werden erst geladen wenn man dorthin scrollt

**5. Produktions-Checkliste abarbeiten**
- SSL-Zertifikat gültig? (HTTPS funktioniert?)
- Alle Umgebungsvariablen gesetzt?
- Backups laufen täglich und werden getestet?
- Alle externen Dienste konfiguriert? (SMTP, Hetzner Storage, UptimeRobot)
- Admin-Account vorhanden und sicher?
- Datenschutz & Impressum vollständig?
- Lasttest: Wie viele gleichzeitige Nutzer kann das System verarbeiten?

**6. Soft-Launch-Vorbereitung**
- Einladungs-System: Erst nur bekannte Nutzer einladen (Beta-Phase)
- Feedback-Button auf der Website: Nutzer können direkt Feedback geben
- Bekannte "erste Inhalte" anlegen: einige Beispiel-Forum-Beiträge damit das Forum nicht leer aussieht

### Was der Nutzer danach sieht:
- Ein reibungsloser Willkommens-Assistent bei der ersten Anmeldung
- Schöne Link-Vorschauen beim Teilen auf WhatsApp & Co.
- Eine schnelle, stabile Website die bereit für echte Nutzer ist

### Technisch (für Entwickler):
- OG-Tags: Next.js Metadata-API (`generateMetadata` in layout.tsx / page.tsx)
- Onboarding: Multi-Step-Form als Modal nach dem ersten Login (localStorage-Flag um es nur einmal zu zeigen)
- Lighthouse-Audit: Performance-Score mindestens 80
- Bundle-Analyse: `@next/bundle-analyzer` um große Pakete zu finden

---

## Zusammenfassung aller Sessions

| Session | Thema | Priorität | Geschätzter Aufwand |
|---------|-------|-----------|---------------------|
| 30 | Forum-Moderations-Workflow | Kritisch | Mittel |
| 31 | E-Mail-System (SMTP) | Kritisch | Mittel |
| 32 | Hetzner Object Storage | Wichtig | Hoch |
| 33 | Erweitertes Nutzerprofil | Wichtig | Mittel |
| 34 | Strain-Community-Features | Wichtig | Hoch |
| 35 | Monitoring & Stabilität | Kritisch | Gering |
| 36 | PWA & Mobile | Nice-to-have | Hoch |
| 37 | Analytics & Insights | Wichtig | Mittel |
| 38 | Export & Datenschutz (DSGVO) | Kritisch (rechtlich) | Hoch |
| 39 | Launch-Vorbereitung | Kritisch | Mittel |

### Empfohlene Reihenfolge nach Priorität:

**Sofort (vor erstem echten Nutzer):**
1. Session 30 — Moderation (Schutz vor Missbrauch)
2. Session 35 — Monitoring (wissen wenn etwas kaputt geht)
3. Session 31 — E-Mail (Passwort-Reset ist essentiell)
4. Session 38 — DSGVO (rechtliche Pflicht)

**Bald (erste Wochen nach Launch):**
5. Session 32 — Cloud-Storage (Datensicherheit)
6. Session 33 — Nutzerprofil (Community-Bindung)
7. Session 37 — Analytics (Wachstum verstehen)

**Mittelfristig:**
8. Session 34 — Strain-Features (Plattform-Tiefe)
9. Session 36 — PWA (Mobile-Nutzung verbessern)
10. Session 39 — Launch-Feinschliff (immer am Schluss)

---

*Dokument erstellt: 06.03.2026 | Nächste Session: 30 (Forum-Moderation)*

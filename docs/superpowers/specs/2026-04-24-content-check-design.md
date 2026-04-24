# Design: Landing Page Aktualisierung + Wöchentlicher Content-Check

**Datum:** 2026-04-24  
**Status:** Approved

---

## Ziel

1. Alle user-sichtbaren Texte einmalig auf aktuellen Stand bringen
2. Automatischen wöchentlichen Check einrichten der Abweichungen per Telegram meldet

---

## Abschnitt 1: Einmalige Aktualisierung

### Betroffene Dateien

| Datei | Inhalt |
|-------|--------|
| `apps/web-app/src/app/landing/page.tsx` | Stats: Samen-Zahl, Strain-Profile, Seedbanks |
| `apps/web-app/src/components/footer.tsx` | Links, Copyright-Jahr |
| `apps/web-app/src/app/about/` | Beschreibung, Feature-Liste |
| `apps/web-app/src/app/impressum/page.tsx` | Rechtliche Angaben, Kontaktdaten |
| `apps/web-app/src/app/privacy/page.tsx` | Datenschutzangaben |
| `apps/web-app/src/app/terms/page.tsx` | AGB |
| `apps/web-app/src/app/contact/page.tsx` | Kontaktinfos |
| `apps/web-app/src/app/layout.tsx` | Meta-Tags (Title, Description) |

### Vorgehensweise

- MongoDB abfragen: tatsächliche Strain-Anzahl, Seedbank-Anzahl, Produkt-Anzahl
- Postgres abfragen: User-Zahlen falls relevant
- Hardcoded-Werte in `.tsx`-Dateien mit DB-Realwerten vergleichen
- Abweichungen direkt korrigieren

---

## Abschnitt 2: Wöchentlicher Content-Check

### Script

**Pfad:** `/root/SF-1-Ultimate-/scripts/content-check.js`  
**Runtime:** Node.js (bereits vorhanden via `node:20-alpine`)

### Was das Script prüft

1. **Zahlen-Check:** MongoDB-Abfrage für Strains, Seedbanks, Produkte → Vergleich mit Hardcoded-Werten in `.tsx`-Dateien (Regex-Parser)
2. **Abweichungs-Schwelle:** > 10% Differenz löst Alarm aus
3. **Telegram-Benachrichtigung** bei Fund

### Telegram-Nachrichtenformat

```
⚠️ SF-1 Content-Check — Abweichung erkannt
[Datum]

Landing Page zeigt: 12 Seedbanks
DB-Realwert: 29 Seedbanks
→ apps/web-app/src/app/landing/page.tsx:89

Bitte Datei manuell aktualisieren.
```

### Konfiguration

- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` aus `/root/SF-1-Ultimate-/.env`
- MongoDB-Verbindung: `sf1-mongodb` Container (Port 27017)

### Cron-Eintrag

```
0 9 * * 1 node /root/SF-1-Ultimate-/scripts/content-check.js >> /var/log/sf1-content-check.log 2>&1
```

Läuft jeden **Montag um 09:00 Uhr**.

---

## Nicht im Scope

- Automatisches Korrigieren der Dateien durch den Check (nur Alarm, kein Auto-Fix)
- Prüfung von dynamisch gerenderten Texten (nur statische `.tsx`-Dateien)
- Prüfung von Bild-Inhalten oder Alt-Texten

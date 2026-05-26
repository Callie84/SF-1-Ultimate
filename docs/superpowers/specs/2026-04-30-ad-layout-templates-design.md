# Design: Ad Layout Templates

**Datum:** 2026-04-30  
**Status:** approved  
**Session:** s8

---

## Ziel

Mehrere benannte Werbezonen-Layouts speichern, zwischen ihnen wechseln und das aktive Layout im laufenden Betrieb anwenden — ohne Neustart.

---

## Datenmodell

### Neues Mongoose-Modell: `AdLayout` (community-service)

```typescript
{
  name: string           // required, z.B. "Sidebar groß", "Mobile-optimiert"
  zones: ZoneConfig[]    // gleiche Struktur wie bisher (id, adType, width, height, isActive, slotCount, slots[])
  sidebarWidth: number   // px, default 256
  isActive: boolean      // genau eines gleichzeitig true
  createdAt: Date
}
```

### Bestehend: `AdZoneConfig`
Bleibt als Legacy-Fallback erhalten. Wird nicht aktiv beschrieben.  
GET `/api/community/ads/zones` liest künftig aus dem aktiven `AdLayout` (Fallback auf `AdZoneConfig` wenn kein Layout aktiv).

---

## API-Endpoints

Alle Admin-Endpoints: Auth-Middleware (admin only).  
Prefix: `/api/community/ads/layouts`

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | `/api/community/ads/layouts` | Alle Layouts (Admin) |
| POST | `/api/community/ads/layouts` | Neues Layout erstellen |
| PUT | `/api/community/ads/layouts/:id` | Name / Zones updaten |
| DELETE | `/api/community/ads/layouts/:id` | Löschen (nicht wenn aktiv) |
| POST | `/api/community/ads/layouts/:id/activate` | Aktivieren (setzt alle anderen isActive→false) |
| POST | `/api/community/ads/layouts/:id/duplicate` | Duplizieren (Name: "Kopie von X") |

### Bestehender Endpoint (Änderung)
`GET /api/community/ads/zones` → liest `AdLayout.findOne({ isActive: true })`, Fallback auf `AdZoneConfig`.

---

## Admin-UI

Neuer Tab **"Layouts"** in `/admin/ads` (4. Tab nach Anzeigen / Buchungen / Zonen-Layout).

### Layout-Liste
- Tabelle: Name | Erstellt | Status (Aktiv-Badge)
- Aktionen pro Zeile: Aktivieren / Duplizieren / Löschen
- Löschen disabled wenn Layout aktiv ist

### Neues Layout erstellen
- Eingabefeld: Name
- Checkbox: "Aktuelle Zonen-Konfiguration übernehmen" (kopiert bestehenden Zustand)
- Alternativ: leeres Layout

### Aktivieren
- Sofort wirksam (kein Neustart nötig)
- Bestätigung: kurzer Toast "Layout 'X' aktiviert"

---

## Fehlerbehandlung

- DELETE auf aktives Layout → 400 "Aktives Layout kann nicht gelöscht werden"
- POST /activate auf nicht-existierendes Layout → 404
- Atomic activate: MongoDB-Transaction oder sequenziell (updateMany isActive→false, dann updateOne isActive→true)

---

## TypeScript

- `AdLayoutDocument` Interface im community-service
- Shared type `AdLayoutResponse` für Frontend (kein Shared-Package nötig, inline definiert)

---

## Nicht im Scope

- Zonen-Editor im Layout-Tab (bestehender Zonen-Layout-Tab bleibt unverändert)
- Layout-Vorschau / Screenshot
- Versionierung / History

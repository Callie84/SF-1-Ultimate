// Kuratierte Whitelist EUROPÄISCHER Breeder-/Züchter-Marken.
//
// Zweck: Der Preisvergleich soll nur europäische Züchter zeigen (User-Wunsch:
// "Europa, nicht Welt"). Es gibt keine Herkunftsdaten pro Breeder in der DB,
// daher diese manuell gepflegte Liste als Single Source of Truth.
//
// ▶ EDITIERBAR: Fehlt eine europäische Marke (oder taucht eine nicht-europäische
//   fälschlich auf)? Einfach hier unten ergänzen/entfernen — sonst nichts nötig.
//
// Matching ist NORMALISIERT (klein, nur a-z0-9). Groß-/Kleinschreibung, Leer-
// und Sonderzeichen sind egal:
//   "Royal Queen Seeds" == "royal queen seeds" == "RoyalQueenSeeds" == "RQS…"? NEIN.
// Abkürzungen (RQS) matchen NICHT automatisch — nur die hier gelisteten Formen.
//
// Über die Env SF1_EUROPE_ONLY=false lässt sich der ganze Filter abschalten.

/** Normalisiert einen Breeder-Namen für den Vergleich (klein, nur a-z0-9). */
export function normalizeBreeder(name: string): string {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Anzeige-Namen (bewusst lesbar, nach Land gruppiert). Beim Set-Aufbau wird
// jeder Eintrag normalisiert. Mehrere Schreibvarianten einer Marke sind ok.
const EUROPEAN_BREEDER_NAMES: string[] = [
  // 🇳🇱 Niederlande
  'Sensi Seeds', 'Dutch Passion', 'Paradise Seeds', 'Green House Seeds',
  'Greenhouse Seed Co', 'Green House Seed Company', 'Serious Seeds',
  'The Flying Dutchmen', 'Flying Dutchmen', 'Spliff Seeds', 'Female Seeds',
  'Nirvana Seeds', 'Nirvana', 'Amsterdam Genetics', 'Zamnesia Seeds',
  'White Label Seeds', 'Soma Seeds', 'Ceres Seeds', 'Magus Genetics',
  'Homegrown Fantaseeds', 'Sagarmatha Seeds', 'Kiwi Seeds', 'TH Seeds',
  'T.H. Seeds', 'DNA Genetics', 'Reserva Privada', 'De Sjamaan',
  // 🇪🇸 Spanien
  'Royal Queen Seeds', 'Sweet Seeds', 'Kannabia', 'Kannabia Seeds',
  'Pyramid Seeds', 'Dinafem', 'Dinafem Seeds', 'Delicious Seeds', 'Eva Seeds',
  'Positronics', 'Medical Seeds', 'Medical Seeds Co', 'Blimburn Seeds',
  'World of Seeds', 'Seedstockers', 'Fast Buds', 'FastBuds', 'BSF Seeds',
  'Elite Seeds', 'Genehtik', 'Genehtik Seeds', 'Reggae Seeds', 'Cannabiogen',
  'Ripper Seeds', 'Buddha Seeds', 'Resin Seeds', 'Philosopher Seeds',
  'Advanced Seeds', 'Humboldt Seed Organization', 'Garden of Green',
  'La Plata Labs', 'Original Sensible Seeds', 'Pev Seeds', 'Sweet Seeds Auto',
  // 🇩🇪 / 🇦🇹 / 🇨🇭 DACH
  'Anesia Seeds', 'Anesia', 'Linda Seeds',
  // 🇬🇧 Vereinigtes Königreich
  "Barney's Farm", 'Barneys Farm', 'Seedsman', 'Seedsman Seeds',
  'Heavyweight Seeds', 'Big Buddha Seeds', 'Sumo Seeds', 'G13 Labs',
  'Pukka Seeds', 'Connoisseur Genetics', 'Short Stuff Seedbank', 'Samsara Seeds',
];

/** Normalisierte Whitelist als Set (O(1)-Lookup). */
export const EUROPEAN_BREEDERS: ReadonlySet<string> = new Set(
  EUROPEAN_BREEDER_NAMES.map(normalizeBreeder).filter((n) => n.length > 0),
);

/** True, wenn der Breeder in der kuratierten Europa-Whitelist steht. */
export function isEuropeanBreeder(name: string): boolean {
  return EUROPEAN_BREEDERS.has(normalizeBreeder(name));
}

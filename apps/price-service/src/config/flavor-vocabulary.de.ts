// Deutsches Flavor-Vokabular für Cannabis-Strains
// Jeder Eintrag: { tag: string, keywords: string[] }
// Keywords werden case-insensitiv gegen Freitext gematcht

export interface FlavorEntry {
  tag: string;
  keywords: string[];
}

export const DE_FLAVOR_VOCABULARY: FlavorEntry[] = [
  { tag: 'erdig',        keywords: ['erdig', 'erde', 'erdige', 'waldboden', 'humus', 'earthy'] },
  { tag: 'fruchtig',     keywords: ['fruchtig', 'frucht', 'früchte', 'obst', 'fruity'] },
  { tag: 'süß',          keywords: ['süß', 'süßlich', 'zucker', 'karamell', 'karamel', 'sweet'] },
  { tag: 'Zitrus',       keywords: ['zitrus', 'zitrone', 'orange', 'grapefruit', 'limette', 'lime', 'citrus', 'zitronig'] },
  { tag: 'Kiefer',       keywords: ['kiefer', 'kiefernnadel', 'pine', 'pinienharz', 'terpentin'] },
  { tag: 'Diesel',       keywords: ['diesel', 'kraftstoff', 'benzin', 'petroleum'] },
  { tag: 'Skunk',        keywords: ['skunk', 'stinkend', 'pungent', 'intensiv', 'scharf riechend'] },
  { tag: 'würzig',       keywords: ['würzig', 'würze', 'pfeffer', 'gewürz', 'spicy', 'scharf'] },
  { tag: 'holzig',       keywords: ['holzig', 'holz', 'holzige', 'wald', 'woody', 'zeder'] },
  { tag: 'Beere',        keywords: ['beere', 'beeren', 'himbeere', 'heidelbeere', 'brombeere', 'berry', 'beerenfrucht'] },
  { tag: 'tropisch',     keywords: ['tropisch', 'mango', 'ananas', 'papaya', 'exotisch', 'tropical'] },
  { tag: 'blumig',       keywords: ['blumig', 'blume', 'lavendel', 'rose', 'jasmin', 'floral'] },
  { tag: 'minzig',       keywords: ['minzig', 'minze', 'menthol', 'kühl', 'mint', 'pfefferminz'] },
  { tag: 'Käse',         keywords: ['käse', 'käsig', 'cheddar', 'cheese'] },
  { tag: 'Kaffee',       keywords: ['kaffee', 'mokka', 'espresso', 'coffee'] },
  { tag: 'Schokolade',   keywords: ['schokolade', 'kakao', 'chocolate', 'cocoa'] },
  { tag: 'Vanille',      keywords: ['vanille', 'vanillig', 'vanilla'] },
  { tag: 'nussig',       keywords: ['haselnuss', 'nuss', 'nussig', 'mandel', 'walnut', 'nutty'] },
  { tag: 'kräuterig',    keywords: ['kräuter', 'krautig', 'oregano', 'thymian', 'salbei', 'herbal', 'herb'] },
  { tag: 'harzig',       keywords: ['harz', 'harzig', 'resinös', 'klebrig', 'resinous'] },
  { tag: 'Lakritz',      keywords: ['lakritz', 'anis', 'fenchel', 'anise', 'licorice'] },
  { tag: 'Sandelholz',   keywords: ['sandelholz', 'kampfer', 'camphor', 'sandalwood'] },
  { tag: 'Ingwer',       keywords: ['ingwer', 'ingwerwurzel', 'ginger'] },
  { tag: 'Pfirsich',     keywords: ['pfirsich', 'aprikose', 'nektarine', 'peach'] },
  { tag: 'Melone',       keywords: ['melone', 'wassermelone', 'melon'] },
  { tag: 'Traube',       keywords: ['traube', 'weintraube', 'wein', 'grape'] },
  { tag: 'Kirsche',      keywords: ['kirsche', 'kirschen', 'cherry'] },
  { tag: 'Lemon',        keywords: ['lemon', 'lemony', 'zitrone', 'zitronig'] },
  { tag: 'Tabak',        keywords: ['tabak', 'tabakig', 'rauch', 'tobacco', 'smoky'] },
  { tag: 'Kokosnuss',    keywords: ['kokosnuss', 'kokos', 'coconut'] },
  { tag: 'Eukalyptus',   keywords: ['eukalyptus', 'eucalyptus'] },
  { tag: 'Erdbeere',     keywords: ['erdbeere', 'erdbeer', 'strawberry'] },
  { tag: 'Heidelbeere',  keywords: ['heidelbeere', 'blaubeere', 'blueberry'] },
  { tag: 'Honig',        keywords: ['honig', 'honigartig', 'honey'] },
  { tag: 'Pflaume',      keywords: ['pflaume', 'zwetschge', 'plum'] },
  { tag: 'Champagner',   keywords: ['champagner', 'sekt', 'spritzig', 'champagne'] },
  { tag: 'Rosmarin',     keywords: ['rosmarin', 'basilikum', 'rosemary'] },
  { tag: 'Zitronengras', keywords: ['zitronengras', 'lemongrass'] },
  { tag: 'Pinie',        keywords: ['pinie', 'piniennadel', 'pine needle'] },
  { tag: 'Apfel',        keywords: ['apfel', 'apfelig', 'apple'] },
];

/**
 * Extrahiere Flavor-Tags aus einem deutschen Freitext
 * Gibt de-duplizierten Array zurück (max 5 Tags)
 */
export function extractFlavorsFromText(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  const textLower = text.toLowerCase();
  const found: string[] = [];

  for (const entry of DE_FLAVOR_VOCABULARY) {
    if (found.length >= 5) break;
    const matches = entry.keywords.some(kw => textLower.includes(kw.toLowerCase()));
    if (matches && !found.includes(entry.tag)) {
      found.push(entry.tag);
    }
  }

  return found;
}

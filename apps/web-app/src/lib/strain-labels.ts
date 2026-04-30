export const TYPE_LABELS: Record<string, string> = {
  indica: 'Indica',
  sativa: 'Sativa',
  hybrid: 'Hybrid',
  autoflower: 'Automatisch blühend',
};

export const SEED_TYPE_LABELS: Record<string, string> = {
  feminized: 'Feminisiert',
  autoflower: 'Automatisch blühend',
  regular: 'Regular',
};

export const CLIMATE_LABELS: Record<string, string> = {
  indoor: 'Innenanbau',
  outdoor: 'Außenanbau',
  both: 'Indoor & Outdoor',
};

export const CBD_LABELS: Record<string, string> = {
  true: 'CBD-reich',
  false: 'THC-dominant',
};

export const EFFECTS_LABELS: Record<string, string> = {
  relaxing: 'Entspannend',
  relaxed: 'Entspannt',
  uplifting: 'Belebend',
  energetic: 'Energetisierend',
  creative: 'Kreativ',
  happy: 'Glücklich',
  focused: 'Fokussiert',
  sleepy: 'Schläfrig',
  euphoric: 'Euphorisch',
  calm: 'Ruhig',
  'stress-relief': 'Stressabbau',
  'pain-relief': 'Schmerzlinderung',
  hungry: 'Hungrig',
  giggly: 'Lachanfall',
  talkative: 'Gesprächig',
  aroused: 'Aufgeregt',
  inspired: 'Inspiriert',
  motivated: 'Motiviert',
  sedated: 'Sediert',
  tingly: 'Kribbelig',
};

export const FLAVORS_LABELS: Record<string, string> = {
  berry: 'Beere',
  sweet: 'Süß',
  earthy: 'Erdig',
  citrus: 'Zitrus',
  pine: 'Kiefer',
  spicy: 'Würzig',
  fruity: 'Fruchtig',
  herbal: 'Kräutig',
  floral: 'Blumig',
  woody: 'Holzig',
  minty: 'Minzig',
  cheese: 'Käsig',
  diesel: 'Diesel',
  skunk: 'Skunk',
  tropical: 'Tropisch',
  vanilla: 'Vanille',
  grape: 'Traube',
  mango: 'Mango',
  blueberry: 'Blaubeere',
  lemon: 'Zitrone',
  pungent: 'Intensiv',
  pepper: 'Pfeffrig',
  hash: 'Haschartig',
  coffee: 'Kaffeeartig',
  lavender: 'Lavendel',
  mint: 'Minze',
  apple: 'Apfel',
  pear: 'Birne',
  peach: 'Pfirsich',
  lime: 'Limette',
};

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

export function climateLabel(climate: string): string {
  return CLIMATE_LABELS[climate] ?? climate;
}

export function seedTypeLabel(seedType: string): string {
  return SEED_TYPE_LABELS[seedType] ?? seedType;
}

export function effectLabel(effect: string): string {
  return EFFECTS_LABELS[effect] ?? effect;
}

export function flavorLabel(flavor: string): string {
  return FLAVORS_LABELS[flavor] ?? flavor;
}

export function aromaLabel(aroma: string): string {
  return FLAVORS_LABELS[aroma] ?? aroma;
}

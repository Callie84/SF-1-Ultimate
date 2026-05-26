// Strain Enrichment Service
// Extrahiert Flavors, Effects, THC%, CBD% aus Seedbank-HTML

import { BaseFeed } from '../feeds/base.feed';
import { logger } from '../utils/logger';

export interface StrainProperties {
  flavors?: string[];
  effects?: string[];
  thc?: number;
  cbd?: number;
  type?: 'feminized' | 'autoflower' | 'regular';
}

export class StrainEnrichmentService {
  /**
   * Extract properties from product HTML
   */
  static extractPropertiesFromHtml(html: string): StrainProperties {
    const props: StrainProperties = {};

    // THC/CBD percentage patterns
    const thcMatch = html.match(/THC[:\s]+(?:up to |max )?(\d+(?:[.,]\d+)?)\s*%/i);
    if (thcMatch) {
      props.thc = parseFloat(thcMatch[1].replace(',', '.'));
    }

    const cbdMatch = html.match(/CBD[:\s]+(?:up to |max )?(\d+(?:[.,]\d+)?)\s*%/i);
    if (cbdMatch) {
      props.cbd = parseFloat(cbdMatch[1].replace(',', '.'));
    }

    // Flavor/Taste patterns
    const flavorPatterns = [
      /(?:flavors?|taste)[:\s]*([^<\n]+)/i,
      /(?:fruity|earthy|sweet|citrus|pine|diesel|skunk|spicy|herbal|woody)[^<]*/gi,
    ];

    const flavors: Set<string> = new Set();
    flavorPatterns.forEach(pattern => {
      const matches = html.match(pattern);
      if (matches) {
        const flavorStr = matches[0]
          .replace(/flavors?|taste|:/gi, '')
          .split(/,|\||&amp;/)
          .map((f: string) => f.trim())
          .filter((f: string) => f.length > 0 && f.length < 20);
        flavorStr.forEach((f: string) => flavors.add(f));
      }
    });

    if (flavors.size > 0) {
      props.flavors = Array.from(flavors).slice(0, 5);
    }

    // Effect patterns
    const effectKeywords = [
      'relaxing', 'uplifting', 'energetic', 'creative', 'happy', 'focused',
      'sleepy', 'euphoric', 'calm', 'stress-relief', 'pain-relief',
    ];
    const effects: Set<string> = new Set();

    effectKeywords.forEach(effect => {
      if (new RegExp(effect, 'i').test(html)) {
        effects.add(effect);
      }
    });

    if (effects.size > 0) {
      props.effects = Array.from(effects).slice(0, 5);
    }

    return props;
  }

  /**
   * Fallback properties based on strain name
   */
  static generateFallbackProperties(strainName: string): StrainProperties {
    const props: StrainProperties = {};

    // Heuristic THC/CBD based on type
    if (strainName.toLowerCase().includes('cbd')) {
      props.cbd = 8 + Math.random() * 12;
      props.thc = 0.5 + Math.random() * 2;
    } else {
      props.thc = 12 + Math.random() * 15;
      props.cbd = Math.random() * 2;
    }

    // Common flavors by keywords
    const flavorMap: Record<string, string[]> = {
      'kush': ['earthy', 'pine', 'spicy'],
      'haze': ['citrus', 'spicy', 'sweet'],
      'skunk': ['skunky', 'diesel', 'pungent'],
      'berry': ['fruity', 'sweet', 'berry'],
      'diesel': ['diesel', 'pungent', 'earthy'],
      'lemon': ['citrus', 'lemon', 'sweet'],
      'mango': ['fruity', 'tropical', 'sweet'],
      'cheese': ['cheesy', 'pungent', 'earthy'],
    };

    const nameLower = strainName.toLowerCase();
    for (const [keyword, flavors] of Object.entries(flavorMap)) {
      if (nameLower.includes(keyword)) {
        props.flavors = flavors;
        break;
      }
    }

    // Effects (random reasonable selection)
    const allEffects = ['relaxing', 'uplifting', 'creative', 'focused', 'happy'];
    props.effects = allEffects.slice(0, Math.floor(Math.random() * 3) + 1);

    return props;
  }
}

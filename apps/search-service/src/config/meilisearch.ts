// /apps/search-service/src/config/meilisearch.ts
import { MeiliSearch } from 'meilisearch';
import { logger } from '../utils/logger';

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
const MEILISEARCH_KEY = process.env.MEILISEARCH_KEY || '';

export const meiliClient = new MeiliSearch({
  host: MEILISEARCH_HOST,
  apiKey: MEILISEARCH_KEY
});

/**
 * Index-Namen
 */
export const INDEXES = {
  STRAINS: 'strains',
  THREADS: 'threads',
  GROWS: 'grows',
  USERS: 'users'
} as const;

/**
 * Index-Konfiguration
 */
export const INDEX_CONFIGS = {
  strains: {
    searchableAttributes: [
      'name',
      'breeder',
      'type',
      'genetics',
      'effects',
      'flavors'
    ],
    filterableAttributes: [
      'type',
      'breeder',
      'thc',
      'cbd',
      'floweringTime',
      'difficulty',
      'indoor',
      'outdoor',
      'lowestPrice',
      'avgPrice',
      'slug'
    ],
    sortableAttributes: [
      'name',
      'thc',
      'cbd',
      'floweringTime',
      'popularity',
      'createdAt',
      'lowestPrice',
      'avgPrice'
    ],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'popularity:desc'
    ],
    distinctAttribute: 'id',
    stopWords: ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'der', 'die', 'das', 'und', 'oder', 'ein', 'eine', 'mit', 'von', 'für'],
  synonyms: {
    // Wirkungen
    entspannend: ['relaxing', 'relaxed'],
    entspannt: ['relaxed', 'relaxing'],
    belebend: ['uplifting'],
    energetisierend: ['energetic'],
    kreativ: ['creative'],
    glücklich: ['happy'],
    fokussiert: ['focused'],
    schläfrig: ['sleepy'],
    euphorisch: ['euphoric'],
    ruhig: ['calm'],
    stressabbau: ['stress-relief'],
    schmerzlinderung: ['pain-relief'],
    hungrig: ['hungry'],
    gesprächig: ['talkative'],
    inspiriert: ['inspired'],
    motiviert: ['motivated'],
    lachanfall: ['giggly'],
    aufgeregt: ['aroused'],
    sediert: ['sedated'],
    kribbelig: ['tingly'],
    // Aromen & Geschmack
    beere: ['berry', 'blueberry'],
    süß: ['sweet'],
    erdig: ['earthy'],
    zitrus: ['citrus', 'lemon'],
    kiefer: ['pine'],
    würzig: ['spicy', 'pepper'],
    fruchtig: ['fruity'],
    kräutig: ['herbal'],
    blumig: ['floral'],
    holzig: ['woody'],
    minzig: ['minty', 'mint'],
    minze: ['mint', 'minty'],
    käsig: ['cheese'],
    tropisch: ['tropical'],
    vanille: ['vanilla'],
    traube: ['grape'],
    mango: ['mango'],
    blaubeere: ['blueberry', 'berry'],
    zitrone: ['lemon', 'citrus'],
    intensiv: ['pungent'],
    pfeffrig: ['pepper', 'spicy'],
    haschartig: ['hash'],
    kaffeeartig: ['coffee'],
    lavendel: ['lavender'],
    apfel: ['apple'],
    birne: ['pear'],
    pfirsich: ['peach'],
    limette: ['lime'],
    // Typen
    automatisch: ['autoflower', 'autoflowering'],
    feminisiert: ['feminized'],
    innenanbau: ['indoor'],
    außenanbau: ['outdoor'],
  }
  },
  
  threads: {
    searchableAttributes: [
      'title',
      'content',
      'tags',
      'category'
    ],
    filterableAttributes: [
      'category',
      'tags',
      'isPinned',
      'isSolved',
      'createdAt'
    ],
    sortableAttributes: [
      'createdAt',
      'replyCount',
      'viewCount',
      'upvotes'
    ],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'upvotes:desc'
    ]
  },
  
  grows: {
    searchableAttributes: [
      'strainName',
      'notes',
      'tags',
      'problems'
    ],
    filterableAttributes: [
      'status',
      'environment',
      'strainId',
      'isPublic',
      'createdAt'
    ],
    sortableAttributes: [
      'createdAt',
      'viewCount',
      'likeCount',
      'yieldDry',
      'efficiency'
    ],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'likeCount:desc'
    ]
  },
  
  users: {
    searchableAttributes: [
      'username',
      'bio',
      'location'
    ],
    filterableAttributes: [
      'role',
      'isPremium',
      'isVerified',
      'level'
    ],
    sortableAttributes: [
      'username',
      'xp',
      'level',
      'createdAt'
    ],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'level:desc'
    ]
  }
};

/**
 * Initialize alle Indexes
 */
export async function initializeIndexes(): Promise<void> {
  try {
    logger.info('[Meilisearch] Initializing indexes...');
    
    for (const [indexName, config] of Object.entries(INDEX_CONFIGS)) {
      try {
        // Index erstellen (wenn nicht existiert)
        await meiliClient.createIndex(indexName, { primaryKey: 'id' });
        logger.info(`[Meilisearch] Created index: ${indexName}`);
      } catch (error: any) {
        if (error.code !== 'index_already_exists') {
          throw error;
        }
        logger.debug(`[Meilisearch] Index already exists: ${indexName}`);
      }
      
      // Settings anwenden
      const index = meiliClient.index(indexName);
      await index.updateSettings(config);
      logger.info(`[Meilisearch] Updated settings for: ${indexName}`);
    }
    
    logger.info('[Meilisearch] All indexes initialized successfully');
  } catch (error) {
    logger.error('[Meilisearch] Failed to initialize:', error);
    throw error;
  }
}

/**
 * Health-Check
 */
export async function checkHealth(): Promise<boolean> {
  try {
    await meiliClient.health();
    return true;
  } catch (error) {
    logger.error('[Meilisearch] Health check failed:', error);
    return false;
  }
}

#!/usr/bin/env node
/**
 * Sync Strains zu Meilisearch
 */

const mongoose = require('mongoose');
const { MeiliSearch } = require('meilisearch');

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://mongodb:27017/sf1_community';
const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://meilisearch:7700';
const MEILISEARCH_KEY = process.env.MEILISEARCH_KEY || '';

// Strain Schema
const strainSchema = new mongoose.Schema({
  name: String,
  slug: String,
  type: String,
  genetics: String,
  description: String,
  thc: Number,
  cbd: Number,
  effects: [String],
  aromas: [String],
  imageUrl: String,
  isActive: Boolean
}, { timestamps: true });

const Strain = mongoose.model('Strain', strainSchema);

async function syncToMeilisearch() {
  try {
    console.log('[Sync] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URL);

    console.log('[Sync] Connecting to Meilisearch...');
    const meili = new MeiliSearch({
      host: MEILISEARCH_HOST,
      apiKey: MEILISEARCH_KEY
    });

    // Strains Index erstellen/holen
    const index = meili.index('strains');

    // Einstellungen setzen
    await index.updateSettings({
      searchableAttributes: ['name', 'description', 'genetics', 'effects', 'aromas'],
      filterableAttributes: ['type', 'thc', 'cbd', 'isActive'],
      sortableAttributes: ['name', 'thc', 'cbd', 'createdAt']
    });

    console.log('[Sync] Fetching strains from MongoDB...');
    const strains = await Strain.find({ isActive: true }).lean();
    console.log(`[Sync] Found ${strains.length} strains`);

    // Konvertieren für Meilisearch (braucht 'id' statt '_id')
    const documents = strains.map(s => ({
      id: s._id.toString(),
      name: s.name,
      slug: s.slug,
      type: s.type,
      genetics: s.genetics,
      description: s.description,
      thc: s.thc,
      cbd: s.cbd,
      effects: s.effects,
      aromas: s.aromas,
      imageUrl: s.imageUrl,
      createdAt: s.createdAt
    }));

    console.log('[Sync] Indexing to Meilisearch...');
    const task = await index.addDocuments(documents);
    console.log(`[Sync] Task ID: ${task.taskUid}`);

    // Warten auf Abschluss
    await meili.waitForTask(task.taskUid);

    // Stats prüfen
    const stats = await index.getStats();
    console.log(`[Sync] ===== COMPLETE =====`);
    console.log(`[Sync] Documents indexed: ${stats.numberOfDocuments}`);

  } catch (error) {
    console.error('[Sync] Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

syncToMeilisearch();

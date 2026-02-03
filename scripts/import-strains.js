#!/usr/bin/env node
/**
 * Strain-Importer für SF1
 * Importiert Strain-Daten von Cannlytics API
 */

const https = require('https');
const { MongoClient } = require('mongodb');

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://sf1_admin:Sf1_MongoDB_SuperSecure_2026!@localhost:27017/sf1_community?authSource=admin';
const CANNLYTICS_API = 'https://cannlytics.com/api/data/strains';

// Strain-Daten von Cannlytics holen
async function fetchStrains() {
  return new Promise((resolve, reject) => {
    console.log('[Import] Fetching strains from Cannlytics API...');

    https.get(CANNLYTICS_API, (res) => {
      let data = '';

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success && json.data) {
            console.log(`[Import] Received ${json.data.length} strains from API`);
            resolve(json.data);
          } else {
            reject(new Error('Invalid API response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Strain in SF1-Format konvertieren
function convertStrain(strain) {
  // Typ bestimmen basierend auf Beschreibung/Name
  let type = 'hybrid';
  const desc = (strain.description || '').toLowerCase();
  const name = (strain.strain_name || strain.id || '').toLowerCase();

  if (desc.includes('indica') || name.includes('indica')) {
    type = 'indica';
  } else if (desc.includes('sativa') || name.includes('sativa')) {
    type = 'sativa';
  } else if (desc.includes('autoflower') || name.includes('auto')) {
    type = 'autoflower';
  }

  // Effekte extrahieren
  const effects = (strain.potential_effects || []).map(e =>
    e.replace('effect_', '').replace(/_/g, ' ')
  );

  // Aromen extrahieren
  const aromas = (strain.potential_aromas || []).map(a =>
    a.replace('aroma_', '').replace(/_/g, ' ')
  );

  // Terpene sammeln
  const terpenes = {};
  if (strain.beta_myrcene) terpenes.myrcene = strain.beta_myrcene;
  if (strain.d_limonene) terpenes.limonene = strain.d_limonene;
  if (strain.alpha_pinene) terpenes.pinene = strain.alpha_pinene;
  if (strain.beta_caryophyllene) terpenes.caryophyllene = strain.beta_caryophyllene;
  if (strain.linalool) terpenes.linalool = strain.linalool;
  if (strain.humulene) terpenes.humulene = strain.humulene;

  return {
    name: strain.strain_name || strain.id,
    slug: (strain.strain_name || strain.id).toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, ''),
    type,
    genetics: strain.description ? extractGenetics(strain.description) : null,
    description: strain.description || `${strain.strain_name || strain.id} Cannabis Strain`,
    thc: strain.delta_9_thc || strain.total_thc || null,
    cbd: strain.cbd || strain.total_cbd || null,
    cbg: strain.cbg || strain.total_cbg || null,
    terpenes,
    totalTerpenes: strain.total_terpenes || null,
    effects,
    aromas,
    flavors: aromas, // Aromen = Flavors
    imageUrl: strain.image_url || null,
    source: 'cannlytics',
    sourceId: strain.id,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Genetik aus Beschreibung extrahieren
function extractGenetics(description) {
  // Suche nach "cross of X and Y" oder "X x Y" Mustern
  const crossMatch = description.match(/cross(?:ed)?\s+(?:of\s+)?([A-Za-z\s]+)\s+(?:and|with|x)\s+([A-Za-z\s]+)/i);
  if (crossMatch) {
    return `${crossMatch[1].trim()} x ${crossMatch[2].trim()}`;
  }
  return null;
}

// Import durchführen
async function importStrains() {
  let client;

  try {
    // MongoDB verbinden
    console.log('[Import] Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URL);
    await client.connect();

    const db = client.db('sf1_community');
    const collection = db.collection('strains');

    // Strains holen
    const rawStrains = await fetchStrains();

    // Konvertieren
    console.log('[Import] Converting strains to SF1 format...');
    const strains = rawStrains.map(convertStrain);

    // Duplikate vermeiden - nur neue einfügen
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const strain of strains) {
      try {
        const result = await collection.updateOne(
          { slug: strain.slug },
          {
            $set: strain,
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          inserted++;
        } else if (result.modifiedCount > 0) {
          updated++;
        } else {
          skipped++;
        }

        if ((inserted + updated) % 100 === 0) {
          console.log(`[Import] Progress: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
        }
      } catch (e) {
        if (e.code === 11000) {
          skipped++;
        } else {
          console.error(`[Import] Error importing ${strain.name}:`, e.message);
        }
      }
    }

    console.log('\n[Import] ===== COMPLETE =====');
    console.log(`[Import] Inserted: ${inserted}`);
    console.log(`[Import] Updated: ${updated}`);
    console.log(`[Import] Skipped: ${skipped}`);
    console.log(`[Import] Total: ${strains.length}`);

    // Index erstellen für Suche
    console.log('[Import] Creating indexes...');
    await collection.createIndex({ name: 'text', description: 'text' });
    await collection.createIndex({ slug: 1 }, { unique: true });
    await collection.createIndex({ type: 1 });
    await collection.createIndex({ thc: 1 });
    await collection.createIndex({ isActive: 1 });

    console.log('[Import] Done!');

  } catch (error) {
    console.error('[Import] Fatal error:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Ausführen
importStrains();

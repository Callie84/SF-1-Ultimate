#!/usr/bin/env node
/**
 * Strain-Importer für SF1 (Mongoose Version)
 * Importiert Strain-Daten von Cannlytics API
 */

const https = require('https');
const mongoose = require('mongoose');

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://mongodb:27017/sf1_community';
const CANNLYTICS_API = 'https://cannlytics.com/api/data/strains';

// Strain Schema
const strainSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  type: { type: String, enum: ['indica', 'sativa', 'hybrid', 'autoflower'], default: 'hybrid' },
  genetics: String,
  description: String,
  thc: Number,
  cbd: Number,
  cbg: Number,
  terpenes: mongoose.Schema.Types.Mixed,
  totalTerpenes: Number,
  effects: [String],
  aromas: [String],
  flavors: [String],
  imageUrl: String,
  source: String,
  sourceId: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

strainSchema.index({ name: 'text', description: 'text' });

const Strain = mongoose.model('Strain', strainSchema);

// Strain-Daten von Cannlytics holen
async function fetchStrains() {
  return new Promise((resolve, reject) => {
    console.log('[Import] Fetching strains from Cannlytics API...');

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    https.get(CANNLYTICS_API, options, (res) => {
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

  const effects = (strain.potential_effects || []).map(e =>
    e.replace('effect_', '').replace(/_/g, ' ')
  );

  const aromas = (strain.potential_aromas || []).map(a =>
    a.replace('aroma_', '').replace(/_/g, ' ')
  );

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
    genetics: extractGenetics(strain.description),
    description: strain.description || `${strain.strain_name || strain.id} Cannabis Strain`,
    thc: strain.delta_9_thc || strain.total_thc || null,
    cbd: strain.cbd || strain.total_cbd || null,
    cbg: strain.cbg || strain.total_cbg || null,
    terpenes,
    totalTerpenes: strain.total_terpenes || null,
    effects,
    aromas,
    flavors: aromas,
    imageUrl: strain.image_url || null,
    source: 'cannlytics',
    sourceId: strain.id,
    isActive: true
  };
}

function extractGenetics(description) {
  if (!description) return null;
  const crossMatch = description.match(/cross(?:ed)?\s+(?:of\s+)?([A-Za-z\s]+)\s+(?:and|with|x)\s+([A-Za-z\s]+)/i);
  if (crossMatch) {
    return `${crossMatch[1].trim()} x ${crossMatch[2].trim()}`;
  }
  return null;
}

// Import durchführen
async function importStrains() {
  try {
    console.log('[Import] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URL);
    console.log('[Import] Connected!');

    const rawStrains = await fetchStrains();
    console.log('[Import] Converting strains to SF1 format...');

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const raw of rawStrains) {
      try {
        const strain = convertStrain(raw);
        const result = await Strain.findOneAndUpdate(
          { slug: strain.slug },
          strain,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          inserted++;
        } else {
          updated++;
        }

        if ((inserted + updated) % 100 === 0) {
          console.log(`[Import] Progress: ${inserted} new, ${updated} updated`);
        }
      } catch (e) {
        errors++;
        if (e.code !== 11000) {
          console.error(`[Import] Error: ${e.message}`);
        }
      }
    }

    console.log('\n[Import] ===== COMPLETE =====');
    console.log(`[Import] New strains: ${inserted}`);
    console.log(`[Import] Updated: ${updated}`);
    console.log(`[Import] Errors: ${errors}`);
    console.log(`[Import] Total processed: ${rawStrains.length}`);

  } catch (error) {
    console.error('[Import] Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

importStrains();

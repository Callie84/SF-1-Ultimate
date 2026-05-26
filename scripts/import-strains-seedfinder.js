#!/usr/bin/env node
/**
 * Seedfinder-Strain-Importer für SF1
 * Importiert/aktualisiert Strain-Daten aus /root/SF-Brain/strain_output/strains_database.json
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URL = process.env.MONGODB_URL ||
  'mongodb://sf1_admin:Sf1_MongoDB_SuperSecure_2026!@localhost:27017/sf1_community?authSource=admin';

const DATA_FILE = '/root/SF-Brain/strain_output/strains_database.json';

function makeSlug(name, breeder) {
  const breederClean = breeder.replace(/_/g, ' ').trim();
  const combined = `${name} ${breederClean}`;
  return combined
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function mapType(strain) {
  const tags = strain.tags || [];
  const strainType = (strain.strain_type || '').toLowerCase();

  if (tags.includes('autoflowering') || strainType === 'autoflowering') return 'autoflower';
  if (tags.includes('indica-dominant')) return 'indica';
  if (tags.includes('sativa-dominant')) return 'sativa';

  // Aus sativa/indica-Prozent ableiten
  const sativa = strain.sativa_percent;
  const indica = strain.indica_percent;
  if (sativa && indica) {
    if (sativa > 65) return 'sativa';
    if (indica > 65) return 'indica';
  }

  return 'hybrid';
}

function mapSeedType(strain) {
  const strainType = strain.strain_type || '';
  const tags = strain.tags || [];

  if (strainType === 'Autoflowering' || tags.includes('autoflowering')) return 'autoflower';
  if (strainType === 'Feminisierte' || tags.includes('feminized')) return 'feminized';
  if (strainType === 'Reguläre') return 'regular';

  return null;
}

function convertStrain(raw) {
  const slug = makeSlug(raw.name, raw.breeder);

  const doc = {
    name: raw.name,
    slug,
    source: 'seedfinder-import',
    sourceId: `${raw.slug}__${raw.breeder_slug}`,
    breeder: raw.breeder.replace(/_/g, ' ').trim(),
    type: mapType(raw),
    isActive: true,
    updatedAt: new Date(),
  };

  // Nur echte Werte setzen
  if (raw.thc_percent != null) doc.thc = raw.thc_percent;
  if (raw.cbd_percent != null) doc.cbd = raw.cbd_percent;
  if (raw.flowering_weeks != null) doc.floweringTime = raw.flowering_weeks;

  const seedType = mapSeedType(raw);
  if (seedType) doc.seedType = seedType;

  if (raw.tags && raw.tags.length > 0) doc.tags = raw.tags;

  // Genetik nur wenn vorhanden
  if (raw.genetics && raw.genetics.trim()) doc.genetics = raw.genetics.trim();

  // Anbau-Infos
  if (raw.yield_indoor != null) doc.yieldIndoor = raw.yield_indoor;
  if (raw.yield_outdoor != null) doc.yieldOutdoor = raw.yield_outdoor;
  if (raw.height_indoor != null) doc.heightIndoor = raw.height_indoor;
  if (raw.height_outdoor != null) doc.heightOutdoor = raw.height_outdoor;

  // Sativa/Indica-Anteile
  if (raw.sativa_percent != null) doc.sativaPercent = raw.sativa_percent;
  if (raw.indica_percent != null) doc.indicaPercent = raw.indica_percent;
  if (raw.ruderalis_percent != null) doc.ruderalisPercent = raw.ruderalis_percent;

  return doc;
}

async function run() {
  console.log('[Seedfinder-Import] Start...');

  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  console.log(`[Seedfinder-Import] ${raw.length} Strains aus Datei geladen`);

  const client = new MongoClient(MONGODB_URL);
  await client.connect();
  const db = client.db('sf1_community');
  const col = db.collection('strains');

  let inserted = 0, updated = 0, errors = 0;

  for (const rawStrain of raw) {
    try {
      const doc = convertStrain(rawStrain);

      const result = await col.updateOne(
        { slug: doc.slug },
        {
          $set: doc,
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) inserted++;
      else if (result.modifiedCount > 0) updated++;

      if ((inserted + updated) % 500 === 0 && (inserted + updated) > 0) {
        console.log(`  ...${inserted + updated} verarbeitet (${inserted} neu, ${updated} aktualisiert)`);
      }
    } catch (e) {
      errors++;
      console.error(`[Fehler] ${rawStrain.name}: ${e.message}`);
    }
  }

  // Indizes sicherstellen
  await col.createIndex({ slug: 1 }, { unique: true, background: true });
  await col.createIndex({ type: 1 }, { background: true });
  await col.createIndex({ isActive: 1 }, { background: true });
  await col.createIndex({ thc: 1 }, { background: true });
  await col.createIndex({ breeder: 1 }, { background: true });

  await client.close();

  console.log('\n[Seedfinder-Import] ===== FERTIG =====');
  console.log(`  Neu eingefügt: ${inserted}`);
  console.log(`  Aktualisiert:  ${updated}`);
  console.log(`  Fehler:        ${errors}`);
  console.log(`  Gesamt:        ${raw.length}`);
}

run().catch(err => {
  console.error('[Fatal]', err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Price-Coverage-Audit  —  Wie viele Community-Strains lassen sich auf Seeds MIT
 * gültigem Preis mappen?
 *
 * Simuliert exakt die Detailseiten-Logik (price.service.searchSeeds:
 * Wort-OR-Regex über Seed.name/breeder) und misst, wie oft dabei mindestens
 * ein Price-Dokument herauskommt — getrennt nach "irgendein Preis" und
 * "gültiger Preis" (inStock + validUntil >= now, so wie ein € im HTML entsteht).
 *
 * READ-ONLY. Verändert nichts. Braucht Zugriff auf BEIDE DBs, daher auf dem
 * Server (oder mit Tunnel) laufen lassen:
 *
 *   MONGODB_COMMUNITY=mongodb://mongodb:27017/sf1-community \
 *   MONGODB_PRICES=mongodb://mongodb:27017/sf1-prices \
 *   node apps/price-service/scripts/price-coverage-audit.js [sampleLimit]
 *
 * Hinweis DB-Namen: Prod nutzt je nach Deploy teils Bindestrich- oder
 * Unterstrich-Varianten (sf1-community / sf1_community, sf1-prices).
 * Zur Not vorher prüfen:  mongosh --quiet --eval 'db.adminCommand("listDatabases").databases.forEach(d=>print(d.name))'
 *
 * sampleLimit = 0 (Default) prüft alle aktiven Strains; z. B. 500 für einen schnellen Stichprobenlauf.
 */
const mongoose = require('mongoose');

const COMMUNITY_URL = process.env.MONGODB_COMMUNITY || 'mongodb://mongodb:27017/sf1-community';
const PRICES_URL    = process.env.MONGODB_PRICES    || 'mongodb://mongodb:27017/sf1-prices';
const SAMPLE = parseInt(process.argv[2] || '0', 10); // 0 = alle

// ---- Wortsplit exakt wie searchSeeds (price.service.ts) ----
function splitWords(query) {
  if (query.includes(' ')) return query.trim().split(/\s+/).filter(Boolean);
  return query.replace(/([A-Z])/g, ' $1').trim().split(/\s+/).filter(Boolean);
}
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

(async () => {
  const comm  = await mongoose.createConnection(COMMUNITY_URL).asPromise();
  const price = await mongoose.createConnection(PRICES_URL).asPromise();

  const Strain = comm.collection('strains');
  const Seed   = price.collection('seeds');
  const Price  = price.collection('prices');

  const now = new Date();
  const totalStrains        = await Strain.countDocuments({ isActive: true });
  const totalSeeds          = await Seed.countDocuments({});
  const seedsWithPriceCount = await Seed.countDocuments({ priceCount: { $gt: 0 } });
  const validPrices         = await Price.countDocuments({ inStock: true, validUntil: { $gte: now } });
  const distinctPricedSeeds = (await Price.distinct('seedId', { inStock: true, validUntil: { $gte: now } })).length;

  console.log('=== Bestand ===');
  console.log('Community-Strains (aktiv):           ', totalStrains);
  console.log('Seeds gesamt:                        ', totalSeeds);
  console.log('Seeds mit priceCount>0 (stale-Zähler):', seedsWithPriceCount);
  console.log('Price-Docs gültig (inStock+valid):   ', validPrices);
  console.log('Seeds mit GÜLTIGEM Preis (distinct): ', distinctPricedSeeds);

  const cursor = Strain.find({ isActive: true }).project({ name: 1, slug: 1 });
  let checked = 0, matchedSeed = 0, matchedValidPrice = 0, matchedAnyPrice = 0;
  const missSamples = [], hitSamples = [];

  for await (const s of cursor) {
    if (SAMPLE && checked >= SAMPLE) break;
    checked++;
    const name = s.name || '';
    if (name.length < 2) continue;

    const words = splitWords(name);
    const wordRx = words.map(w => ({ $regex: esc(w), $options: 'i' }));
    const or = [
      ...wordRx.map(w => ({ name: w })),
      ...wordRx.map(w => ({ breeder: w })),
      { name:    { $regex: esc(name), $options: 'i' } },
      { breeder: { $regex: esc(name), $options: 'i' } },
    ];
    const seeds = await Seed.find({ $or: or }).project({ _id: 1 }).limit(20).toArray();
    if (!seeds.length) { if (missSamples.length < 25) missSamples.push(name); continue; }
    matchedSeed++;

    const ids = seeds.map(x => x._id);
    const anyPrice   = await Price.countDocuments({ seedId: { $in: ids } });
    const validPrice = await Price.countDocuments({ seedId: { $in: ids }, inStock: true, validUntil: { $gte: now } });
    if (anyPrice > 0) matchedAnyPrice++;
    if (validPrice > 0) { matchedValidPrice++; if (hitSamples.length < 25) hitSamples.push(name); }
    else if (missSamples.length < 25) missSamples.push(name + '  (Seed-Treffer, aber kein gültiger Preis)');
  }

  const pct = n => checked ? ((n / checked) * 100).toFixed(1) + '%' : '–';
  console.log('\n=== Coverage (Detailseiten-Logik simuliert) ===');
  console.log('Geprüfte Strains:                 ', checked);
  console.log('… mit Seed-Namenstreffer:         ', matchedSeed,       pct(matchedSeed));
  console.log('… mit IRGENDeinem Price-Doc:      ', matchedAnyPrice,   pct(matchedAnyPrice));
  console.log('… mit GÜLTIGEM Preis (€ im HTML): ', matchedValidPrice, pct(matchedValidPrice));
  console.log('\nBeispiel-HITS:', hitSamples);
  console.log('\nBeispiel-MISSES:', missSamples);

  await comm.close();
  await price.close();
})().catch(e => { console.error(e); process.exit(1); });

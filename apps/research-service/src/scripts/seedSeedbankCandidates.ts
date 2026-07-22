// /apps/research-service/src/scripts/seedSeedbankCandidates.ts
//
// Idempotenter Seed der kuratierten DACH-Seedbank-Kandidatenliste
// (6 primär + 3 sekundär) aus dem Exa-Pilot 2026-07-14 inkl. der manuellen
// Korrekturen (Topcannaseed-Domain, Linda-Seeds-Sitz).
//
// Idempotent: Upsert per `domain` — mehrfaches Ausführen erzeugt keine Duplikate,
// überschreibt aber die kuratierten Felder mit dem hier hinterlegten Sollzustand.
//
// Aufruf:  npm run seed:candidates    (aus apps/research-service)

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectMongoDB } from '../config/mongodb';
import { SeedbankCandidate } from '../models/SeedbankCandidate.model';
import { logger } from '../utils/logger';

const SOURCE = 'Exa-Pilot 2026-07-14 + manuelle Chat-Recherche 2026-07-14';

type SeedRow = {
  name: string;
  website: string;
  domain: string;
  country: string;
  tier: 'primary' | 'secondary';
  isDACH: boolean;
  reason: string;
  corrections?: string[];
};

const CANDIDATES: SeedRow[] = [
  // ---- Primär: verkaufen Cannabis-Samen online ----
  {
    name: 'Bud Voyage',
    website: 'https://bud-voyage.de/',
    domain: 'bud-voyage.de',
    country: 'DE',
    tier: 'primary',
    isDACH: true,
    reason:
      'DE-Onlineshop, laut Eigenbeschreibung „eine der führenden Marken/Onlineshops für Cannabissamen in Deutschland", einsteigerfreundlich — Top-Kandidat.',
  },
  {
    name: 'Cannoptikum KG',
    website: 'https://cannoptikum.com/',
    domain: 'cannoptikum.com',
    country: 'AT',
    tier: 'primary',
    isDACH: true,
    reason:
      'AT (Tirol, gegr. 2020), unabhängig, spezialisiert auf hochwertige Cannabis-Samen für Sammler/Breeder; transparente Genetik-Infos.',
  },
  {
    name: 'Cannaspot',
    website: 'https://cannaspot.de/',
    domain: 'cannaspot.de',
    country: 'DE',
    tier: 'primary',
    isDACH: true,
    reason: 'DE-Shop für Cannabis-Anbau: Samen, Stecklinge, Growbedarf, Zubehör — inkl. Samenverkauf.',
  },
  {
    name: 'Greenfield Shop (BHG Greenfield GmbH)',
    website: 'https://greenfield-shop.com/',
    domain: 'greenfield-shop.com',
    country: 'AT',
    tier: 'primary',
    isDACH: true,
    reason:
      'AT (seit 2016), verkauft CBD-Öl und Cannabis-Samen mit großer Sortenauswahl, schneller/diskreter Versand in Österreich.',
  },
  {
    name: 'Topcannaseed / Topgrowshop',
    website: 'https://topcannaseed.com/',
    domain: 'topcannaseed.com',
    country: 'DE',
    tier: 'primary',
    isDACH: true,
    reason:
      'DE (Erkelenz, seit 2004), Premium-Cannabis-Samen plus Growshop; Schwestershop topgrowshop.de. Sitz DE korrekt.',
    corrections: [
      'Domain-Korrektur 2026-07-14: Exa hatte fälschlich topinfo.help zugeordnet — offizielle Domain ist topcannaseed.com.',
    ],
  },
  {
    name: 'Linda Seeds',
    website: 'https://linda-seeds.com/',
    domain: 'linda-seeds.com',
    country: 'ES',
    tier: 'primary',
    isDACH: false,
    reason:
      'Großer Samen-Onlineshop (>3.000 Sorten, 100+ Seedbanks), Reseller-Modell. Bewusst als primärer Kandidat geführt. DACH-Sitz-Konflikt: erfüllt das Kriterium „Sitz in DE/AT/CH" nicht (isDACH=false).',
    corrections: [
      'Sitz-Korrektur 2026-07-14: Exa hatte fälschlich HQ Berlin / Sitz DE gemeldet — tatsächlicher Sitz Valencia, Spanien (Gerichtsstand/Impressum, spanisches Recht); nur der Gründer stammt aus Köln.',
    ],
  },

  // ---- Sekundär: Growshops (Zubehör-Affiliate, Samen unklar/untergeordnet) ----
  {
    name: 'Canna Commerce GmbH (goGrow)',
    website: 'https://gogrow.de/',
    domain: 'gogrow.de',
    country: 'DE',
    tier: 'secondary',
    isDACH: true,
    reason:
      'DE-Growshop (D2C/B2B): Beleuchtung, Belüftung, Substrate, Headshop — Grow-Equipment-Affiliate, Samen nicht bestätigt.',
  },
  {
    name: 'Azzeo GmbH (grow-shop24)',
    website: 'https://grow-shop24.de/',
    domain: 'grow-shop24.de',
    country: 'DE',
    tier: 'secondary',
    isDACH: true,
    reason:
      'DE (Regensburg, seit 2017), Indoor-Growshop (Growbox-Sets, Beleuchtung) — Equipment, kein bestätigter Samenverkauf.',
  },
  {
    name: 'Medi Grow GmbH (grow-market.ch)',
    website: 'https://grow-market.ch/',
    domain: 'grow-market.ch',
    country: 'CH',
    tier: 'secondary',
    isDACH: true,
    reason: 'CH (Dübendorf), Swiss Growshop mit LED/Growboxen — CH-Marktzugang, Samen unklar.',
  },
];

async function run(): Promise<void> {
  await connectMongoDB();

  let inserted = 0;
  let updated = 0;

  for (const c of CANDIDATES) {
    const res = await SeedbankCandidate.updateOne(
      { domain: c.domain },
      {
        $set: {
          name: c.name,
          website: c.website,
          country: c.country,
          tier: c.tier,
          isDACH: c.isDACH,
          reason: c.reason,
          source: SOURCE,
          corrections: c.corrections ?? [],
        },
        // status nur beim ersten Anlegen setzen — spätere Review-Zustände nicht überschreiben.
        $setOnInsert: { status: 'new' },
      },
      { upsert: true }
    );
    if (res.upsertedCount && res.upsertedCount > 0) inserted++;
    else if (res.modifiedCount && res.modifiedCount > 0) updated++;
  }

  const total = await SeedbankCandidate.countDocuments();
  logger.info(
    `[seed] seedbank_candidates fertig — neu: ${inserted}, aktualisiert: ${updated}, unverändert: ${
      CANDIDATES.length - inserted - updated
    }, gesamt in Collection: ${total}`
  );

  await mongoose.connection.close();
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('[seed] Fehler beim Seeden der Kandidaten', err);
    process.exit(1);
  });

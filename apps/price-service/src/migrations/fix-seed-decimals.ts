// Migration: Fix Seed THC/CBD Decimals
import { Seed } from '../models/Seed.model';
import { connectMongoDB } from '../config/mongodb';
import { logger } from '../utils/logger';

async function fixDecimals() {
  try {
    await connectMongoDB();
    logger.info('[Migration] Starting decimal fix...');

    const seeds = await Seed.find({
      $or: [{ thc: { $exists: true } }, { cbd: { $exists: true } }]
    });

    logger.info(`[Migration] Found ${seeds.length} seeds to process`);

    let updated = 0;
    for (const seed of seeds) {
      let hasChange = false;

      if (seed.thc && seed.thc % 1 !== 0) {
        const decimals = (seed.thc % 1).toString().length;
        if (decimals > 2) {
          seed.thc = Math.round(seed.thc * 10) / 10;
          hasChange = true;
        }
      }

      if (seed.cbd && seed.cbd % 1 !== 0) {
        const decimals = (seed.cbd % 1).toString().length;
        if (decimals > 2) {
          seed.cbd = Math.round(seed.cbd * 10) / 10;
          hasChange = true;
        }
      }

      if (hasChange) {
        await seed.save();
        updated++;
      }
    }

    logger.info(`[Migration] Updated ${updated} seeds ✅`);
    process.exit(0);
  } catch (error) {
    logger.error('[Migration] Error:', error);
    process.exit(1);
  }
}

fixDecimals();

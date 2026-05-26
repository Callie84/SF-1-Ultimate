import { Price } from '../models/Price.model';
import { logger } from '../utils/logger';

export interface SeedbankStaleness {
  seedbank: string;
  lastScraped: Date;
  hoursAgo: number;
}

export interface StaleResult {
  threshold: number;
  checkedAt: Date;
  stale: SeedbankStaleness[];
  ok: SeedbankStaleness[];
}

export class StalenessService {
  async getStaleSeedbanks(thresholdHours: number = 24): Promise<StaleResult> {
    const checkedAt = new Date();

    const rows = await Price.aggregate([
      {
        $group: {
          _id: '$seedbank',
          lastScraped: { $max: '$scrapedAt' },
        },
      },
      { $sort: { lastScraped: 1 } },
    ]);

    const stale: SeedbankStaleness[] = [];
    const ok: SeedbankStaleness[] = [];

    for (const row of rows) {
      const hoursAgo =
        (checkedAt.getTime() - new Date(row.lastScraped).getTime()) / (1000 * 60 * 60);
      const entry: SeedbankStaleness = {
        seedbank: row._id,
        lastScraped: new Date(row.lastScraped),
        hoursAgo: Math.round(hoursAgo * 10) / 10,
      };
      if (hoursAgo > thresholdHours) {
        stale.push(entry);
      } else {
        ok.push(entry);
      }
    }

    logger.info(
      `[StalenessService] ${rows.length} Seedbanken geprüft, ${stale.length} veraltet (>${thresholdHours}h)`
    );

    return { threshold: thresholdHours, checkedAt, stale, ok };
  }
}

export const stalenessService = new StalenessService();

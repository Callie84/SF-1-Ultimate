// Einmal-Reindex des Meilisearch 'strains'-Index aus MongoDB (sf1_price.seeds).
// Aufruf im Container: ./node_modules/.bin/tsx scripts/reindex-strains.ts
// Genutzt vom Host-Cron /root/scripts/sf1-search-reindex.sh (nach Feed-Import).
import { indexingService } from '../src/services/indexing.service';
(async () => {
  try {
    await indexingService.reindexStrains();
    console.log('REINDEX_STRAINS_DONE');
    process.exit(0);
  } catch (e) {
    console.error('REINDEX_STRAINS_FAIL', e);
    process.exit(1);
  }
})();

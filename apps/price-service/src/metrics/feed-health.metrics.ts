// Price Service — Feed-Health-Metriken (Prometheus)
//
// Zweck: Stille Feed-Ausfälle sichtbar machen. Ein Feed, der 0 Produkte liefert,
// wirft heute keinen Fehler — der Import gilt als "erfolgreich", obwohl nichts
// ankommt. Diese Metriken machen genau das für Grafana/Alertmanager erkennbar.
//
// Registriert am Default-Register (prefix sf1_, wie collectDefaultMetrics in index.ts),
// erscheint also automatisch unter GET /metrics.
import promClient from 'prom-client';
import { logger } from '../utils/logger';

const LABELS = ['seedbank'] as const;

// Produktanzahl des letzten Imports je Feed (0 = verdächtig/defekt).
export const feedLastProducts = new promClient.Gauge({
  name: 'sf1_feed_last_products',
  help: 'Anzahl Produkte im letzten Feed-Import je Seedbank',
  labelNames: LABELS,
});

// Zähler: Importe, die 0 Produkte lieferten (stiller Ausfall).
export const feedEmptyImportsTotal = new promClient.Counter({
  name: 'sf1_feed_empty_imports_total',
  help: 'Anzahl Feed-Importe, die 0 Produkte lieferten (stiller Ausfall)',
  labelNames: LABELS,
});

// Zähler: Importe, die mit einem Fehler abbrachen.
export const feedFailuresTotal = new promClient.Counter({
  name: 'sf1_feed_failures_total',
  help: 'Anzahl fehlgeschlagener Feed-Importe (Exception)',
  labelNames: LABELS,
});

// Zeitstempel des letzten Imports mit >0 Produkten (für "seit X h keine Daten"-Alerts).
export const feedLastSuccessTimestamp = new promClient.Gauge({
  name: 'sf1_feed_last_success_timestamp_seconds',
  help: 'Unix-Zeitstempel des letzten Feed-Imports mit mindestens 1 Produkt',
  labelNames: LABELS,
});

export type FeedImportStatus = 'ok' | 'empty' | 'error';

/**
 * Ein Feed-Import-Ergebnis in die Metriken schreiben.
 * - 'ok'    : >0 Produkte importiert → Gauge + Erfolgs-Zeitstempel setzen
 * - 'empty' : 0 Produkte, kein Fehler → stiller Ausfall, Counter + Warn-Log
 * - 'error' : Import warf Exception → Failure-Counter
 */
export function recordFeedImport(
  seedbank: string,
  productCount: number,
  status: FeedImportStatus,
): void {
  feedLastProducts.set({ seedbank }, productCount);

  if (status === 'error') {
    feedFailuresTotal.inc({ seedbank });
    return;
  }

  if (status === 'empty' || productCount === 0) {
    feedEmptyImportsTotal.inc({ seedbank });
    logger.warn(
      `[FeedHealth] ⚠ ALERT: Feed "${seedbank}" lieferte 0 Produkte — vermutlich defekt/blockiert (Parser veraltet, 403/Cloudflare o. tote Domain).`,
    );
    return;
  }

  feedLastSuccessTimestamp.set({ seedbank }, Date.now() / 1000);
}

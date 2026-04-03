import { redis } from '../config/redis';

/**
 * Cache-or-Fetch Utility
 * Gibt gecachten Wert zurück oder führt fetchFn aus, speichert Ergebnis und gibt es zurück.
 * Trackt hits/misses in Redis-Countern für Grafana-Metriken.
 */
export async function cacheOrFetch<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      await redis.incr('cache:hits').catch(() => {});
      return JSON.parse(cached) as T;
    }
  } catch {
    // Cache-Fehler → direkt fetchen
  }

  await redis.incr('cache:misses').catch(() => {});
  const data = await fetchFn();

  try {
    await redis.setEx(key, ttlSeconds, JSON.stringify(data));
  } catch {
    // Cache-Fehler ignorieren
  }

  return data;
}

/**
 * Cache-Keys mit Präfix löschen (z.B. "cache:leaderboard:*")
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch {
    // ignorieren
  }
}

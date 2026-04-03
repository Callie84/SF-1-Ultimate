import { redis } from '../config/redis';

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
    // ignorieren
  }

  return data;
}

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

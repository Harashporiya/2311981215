import { Log } from "./logger";

// Simple in-memory cache as Redis fallback for environments without Redis
// In production, replace with actual Redis (ioredis)
const memoryCache = new Map<string, { value: string; expiry: number }>();

export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

// In-memory cache implementation (dev/test)
const memoryCacheClient: CacheClient = {
  async get(key: string): Promise<string | null> {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value;
  },

  async set(key: string, value: string, ttlSeconds = 60): Promise<void> {
    memoryCache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  },

  async del(key: string): Promise<void> {
    memoryCache.delete(key);
  },

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp("^" + pattern.replace("*", ".*") + "$");
    return Array.from(memoryCache.keys()).filter((k) => regex.test(k));
  },
};

export const cache = memoryCacheClient;

/**
 * Cache helper: Get or fetch with caching
 */
export async function getOrCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 60
): Promise<T> {
  try {
    const cached = await cache.get(key);
    if (cached) {
      await Log("backend", "debug", "cache", `Cache HIT for key: ${key}`);
      return JSON.parse(cached) as T;
    }

    await Log("backend", "debug", "cache", `Cache MISS for key: ${key}, fetching from DB`);
    const result = await fetcher();
    await cache.set(key, JSON.stringify(result), ttlSeconds);
    return result;
  } catch (error) {
    await Log(
      "backend",
      "warn",
      "cache",
      `Cache operation failed for key ${key}, falling back to direct fetch: ${error}`
    );
    return fetcher();
  }
}

/**
 * Invalidate all cache keys matching a pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await cache.keys(pattern);
    await Promise.all(keys.map((k) => cache.del(k)));
    await Log(
      "backend",
      "info",
      "cache",
      `Invalidated ${keys.length} cache keys matching pattern: ${pattern}`
    );
  } catch (error) {
    await Log(
      "backend",
      "warn",
      "cache",
      `Failed to invalidate cache for pattern ${pattern}: ${error}`
    );
  }
}

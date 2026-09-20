/**
 * In-memory TTL cache for master data (sub-kegiatan, kode rekening, jawatan).
 *
 * Master data changes rarely (only when admin approves requests), so caching it
 * for a short window removes most Firestore reads from repeated modal opens and
 * page navigation — cutting read operations dramatically while staying fresh.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<any>>();

/** Default freshness window: 15 minutes. */
export const MASTER_CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Return the cached value when still fresh, otherwise run the loader and cache it.
 * Pass a unique key per data set (e.g. "kegiatan:jawatan-sosial").
 */
export const cachedFetch = async <T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs: number = MASTER_CACHE_TTL_MS
): Promise<T> => {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value as T;
  }
  const value = await loader();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
};

/** Drop one key, or every key starting with a prefix (call after writes). */
export const invalidateCache = (prefix?: string): void => {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};

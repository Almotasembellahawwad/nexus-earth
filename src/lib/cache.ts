// Process-local bounded cache. Coalesces concurrent requests, backs off failures,
// and serves previously validated data for a bounded stale period. No fabricated fallback.
interface Entry<T> {
  value?: T;
  fetchedAt: number | null;
  expiresAt: number;
  staleUntil: number;
  retryAt: number;
  error?: string;
  pending?: Promise<CacheResult<T>>;
}
export interface CacheResult<T> {
  value?: T;
  fetchedAt: number | null;
  status: 'live' | 'stale' | 'unavailable';
  error?: string;
}
export class DataCache {
  private entries = new Map<string, Entry<unknown>>();
  constructor(private maxEntries = 600) {}
  async get<T>(
    key: string,
    ttlMs: number,
    staleMs: number,
    loader: () => Promise<T>,
    now = Date.now(),
  ): Promise<CacheResult<T>> {
    let entry = this.entries.get(key) as Entry<T> | undefined;
    if (entry?.value !== undefined && now < entry.expiresAt)
      return { value: entry.value, fetchedAt: entry.fetchedAt, status: 'live' };
    if (entry?.pending) return entry.pending;
    if (entry && now < entry.retryAt) return this.fallback(entry, now);
    if (!entry) {
      if (this.entries.size >= this.maxEntries) {
        const evictable = [...this.entries].find(([, value]) => !value.pending);
        if (evictable) this.entries.delete(evictable[0]);
      }
      entry = { fetchedAt: null, expiresAt: 0, staleUntil: 0, retryAt: 0 };
      this.entries.set(key, entry);
    }
    const current = entry;
    current.pending = (async () => {
      try {
        const value = await loader();
        const fetchedAt = Date.now();
        Object.assign(current, {
          value,
          fetchedAt,
          expiresAt: fetchedAt + ttlMs,
          staleUntil: fetchedAt + ttlMs + staleMs,
          retryAt: 0,
          error: undefined,
        });
        return { value, fetchedAt, status: 'live' as const };
      } catch (error) {
        current.error = error instanceof Error ? error.message : 'Source request failed';
        if (process.env.NODE_ENV !== 'test') console.warn(`[NEXUS:${key}] ${current.error}`);
        current.retryAt = Date.now() + 60_000;
        return this.fallback(current, Date.now());
      } finally {
        current.pending = undefined;
      }
    })();
    return current.pending;
  }
  private fallback<T>(entry: Entry<T>, now: number): CacheResult<T> {
    return entry.value !== undefined && now < entry.staleUntil
      ? { value: entry.value, fetchedAt: entry.fetchedAt, status: 'stale', error: entry.error }
      : { fetchedAt: entry.fetchedAt, status: 'unavailable', error: entry.error };
  }
}
export const sourceCache = new DataCache();

export async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: {
      Accept: 'application/geo+json, application/json, */*',
      'User-Agent': 'NEXUS-Earth/1.0 (public-data-visualization)',
    },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  const body = await response.text();
  if (body.length > 20_000_000) throw new Error('Source response exceeded size limit');
  return JSON.parse(body) as unknown;
}

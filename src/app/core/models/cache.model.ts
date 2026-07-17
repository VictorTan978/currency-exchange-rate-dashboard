/**
 * Wrapper every cached payload is stored in. Written by {@link CacheService};
 * nothing outside it should build one.
 */
export interface CacheEnvelope<T> {
  /**
   * Schema version of `payload`. Bump {@link CACHE_VERSION} whenever a cached
   * shape changes, so an old entry is discarded instead of revived into a shape
   * the current code no longer understands.
   */
  version: number;
  /** When the entry was written, as epoch milliseconds (Date doesn't survive JSON). */
  cachedAt: number;
  payload: T;
}

/** A cached payload and its age, as handed back to callers. */
export interface CachedEntry<T> {
  payload: T;
  cachedAt: Date;
}

/** Current cache schema version — see {@link CacheEnvelope.version}. */
export const CACHE_VERSION = 1;

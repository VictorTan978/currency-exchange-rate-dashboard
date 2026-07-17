import { Injectable } from '@angular/core';

import { CACHE_VERSION, CacheEnvelope, CachedEntry } from '../models/cache.model';

/** Namespace for every key this app owns, so eviction never touches `cerd-theme`. */
const KEY_PREFIX = 'cerd-cache:';

/**
 * Typed, versioned persistence for API payloads, backing the offline mode.
 *
 * localStorage rather than IndexedDB, deliberately: the whole cache is a few
 * kilobytes against a ~5MB budget, and a synchronous read means services hydrate
 * during construction — panels paint cached data on the first frame instead of
 * flashing empty. The backend is private to this class, so moving to IndexedDB
 * later is a change to one file plus the (already async-friendly) call sites.
 *
 * Scope: this caches *data*, not the app itself. Loading the page with no
 * network still needs the shell to come from the browser's HTTP cache; making
 * that guaranteed is a service worker's job, which is a separate concern.
 *
 * Every operation is best-effort. Storage can be disabled, full, or corrupt, and
 * caching is an enhancement — a failure here degrades to "no cache", never to a
 * broken app.
 */
@Injectable({ providedIn: 'root' })
export class CacheService {
  /**
   * Reads and revives a cached entry.
   *
   * @param revive maps the JSON-parsed payload back to `T`, for shapes that
   *   don't survive a round-trip (a `Date` comes back as a string). Defaults to
   *   an identity cast for plain JSON shapes.
   * @returns the entry, or null when it's absent, unreadable, or was written by
   *   an older schema.
   */
  read<T>(key: string, revive: (payload: unknown) => T = (p) => p as T): CachedEntry<T> | null {
    const raw = this.withStorage((s) => s.getItem(KEY_PREFIX + key)) ?? null;
    if (raw === null) {
      return null;
    }

    try {
      const envelope = JSON.parse(raw) as CacheEnvelope<unknown> | null;
      if (envelope?.version !== CACHE_VERSION || typeof envelope.cachedAt !== 'number') {
        this.remove(key);
        return null;
      }
      return { payload: revive(envelope.payload), cachedAt: new Date(envelope.cachedAt) };
    } catch {
      // Corrupt or hand-edited entry: drop it so it can't fail the same way twice.
      this.remove(key);
      return null;
    }
  }

  /** Writes `payload` under `key`, stamped with the current version and time. */
  write<T>(key: string, payload: T): void {
    const envelope: CacheEnvelope<T> = { version: CACHE_VERSION, cachedAt: Date.now(), payload };
    const serialized = JSON.stringify(envelope);

    this.withStorage((storage) => {
      try {
        storage.setItem(KEY_PREFIX + key, serialized);
      } catch {
        // Almost always the quota: the history cache grows a key per base +
        // currency combination. Drop everything we own and keep the newest entry
        // — a cold cache costs one refetch, a permanently failing write costs
        // the offline mode.
        this.clear();
        try {
          storage.setItem(KEY_PREFIX + key, serialized);
        } catch {
          // Storage is unusable (disabled, or one entry exceeds the quota).
          // Nothing left to try; the app works, it just won't cache.
        }
      }
      return undefined;
    });
  }

  /** Removes one entry. */
  remove(key: string): void {
    this.withStorage((s) => s.removeItem(KEY_PREFIX + key));
  }

  /** Removes every entry this app owns, leaving other keys untouched. */
  clear(): void {
    this.withStorage((storage) => {
      const keys = Object.keys(storage).filter((k) => k.startsWith(KEY_PREFIX));
      keys.forEach((k) => storage.removeItem(k));
      return undefined;
    });
  }

  /**
   * Runs `fn` against localStorage, or returns undefined when it can't be
   * reached at all — it's absent outside a browser, and merely touching it
   * throws in some privacy modes.
   */
  private withStorage<R>(fn: (storage: Storage) => R): R | undefined {
    try {
      if (typeof localStorage === 'undefined') {
        return undefined;
      }
      return fn(localStorage);
    } catch {
      return undefined;
    }
  }
}

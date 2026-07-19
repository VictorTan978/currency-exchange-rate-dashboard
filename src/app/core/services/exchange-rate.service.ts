import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { SKIP_ERROR_DIALOG, loadingMessage, silent } from '../interceptors/api-status.interceptor';
import { CachedEntry } from '../models/cache.model';
import { currencyName } from '../models/currency.model';
import { ExchangeRateApiResponse, Rate, RatesSnapshot } from '../models/rate.model';
import { CacheService } from './cache.service';
import { ConnectivityService } from './connectivity.service';
import { CurrencyService } from './currency.service';

/**
 * Fetches the latest exchange rates from the ExchangeRate-API open endpoint and
 * exposes them as signals. Owns the "live rates" domain state for the app:
 * the rates table and the conversion calculator both read from here.
 *
 * Every successful fetch is cached per base currency. When the network is down
 * or the request fails, the last cached snapshot is served instead and
 * {@link stale} goes true — which is what keeps the table populated and the
 * calculator's local arithmetic answerable with no network at all.
 */
@Injectable({ providedIn: 'root' })
export class ExchangeRateService {
  private readonly http = inject(HttpClient);
  private readonly currencies = inject(CurrencyService);
  private readonly cache = inject(CacheService);
  private readonly connectivity = inject(ConnectivityService);

  private readonly _snapshot = signal<RatesSnapshot | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _cachedAt = signal<Date | null>(null);

  /**
   * All rates for the currently loaded base currency, with display names joined
   * from the provider's `/codes` list. Recomputes when that list resolves, so
   * names upgrade from the static fallback without refetching rates.
   */
  readonly rates = computed<Rate[]>(() => {
    const rates = this._snapshot()?.rates ?? [];
    const names = this.currencies.nameMap();
    return rates.map((r) => ({ ...r, name: names[r.code] ?? r.name }));
  });
  /** The currently loaded base currency code. */
  readonly base = computed(() => this._snapshot()?.base ?? API_CONFIG.defaultBaseCurrency);
  /** When the provider last refreshed these rates. */
  readonly lastUpdated = computed(() => this._snapshot()?.lastUpdated ?? null);
  /** Quick lookup of code → rate, used by the conversion calculator. */
  readonly ratesMap = computed<Record<string, number>>(() =>
    Object.fromEntries(this.rates().map((r) => [r.code, r.rate])),
  );

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  /** When the shown rates were cached, or null if they came from the network. */
  readonly cachedAt = this._cachedAt.asReadonly();
  /** True when the shown rates came from the cache and may be out of date. */
  readonly stale = computed(() => this._cachedAt() !== null);

  /**
   * Pure fetch + map (no side effects) — convenient for unit testing.
   *
   * @param absorbErrors suppresses the global error dialog, for when the caller
   *   has a cached snapshot to fall back on and the user loses nothing.
   */
  fetchRates(base: string, absorbErrors = false): Observable<RatesSnapshot> {
    const context = loadingMessage('Loading exchange rates…');
    if (absorbErrors) {
      context.set(SKIP_ERROR_DIALOG, true);
    }
    return this.requestSnapshot(base, context);
  }

  /**
   * Real-time updates: silently re-fetches the currently loaded base in the
   * background, driven by the rates table's poller. Uses no global dialogs and
   * swallows failures — a routine poll must never flash a spinner or raise an
   * error the user didn't ask for; it just refreshes the numbers in place, or
   * leaves the last good ones untouched until the next tick.
   *
   * Skips entirely while offline (the request can only fail) or while a
   * foreground {@link load} is already in flight (it would race it). The poller
   * further gates on tab visibility, so together these keep API calls to the
   * moments a fresh number can actually reach the user.
   */
  refresh(): void {
    if (this.connectivity.offline() || this._loading()) {
      return;
    }
    const base = this.base();
    this.requestSnapshot(base, silent()).subscribe({
      next: (snapshot) => this.applySnapshot(base, snapshot),
      // Keep the current snapshot; the next tick retries.
      error: () => undefined,
    });
  }

  /** Shared fetch + validate + map for both the foreground and background paths. */
  private requestSnapshot(base: string, context: HttpContext): Observable<RatesSnapshot> {
    const url = `${API_CONFIG.exchangeRateBaseUrl}/${base}`;
    return this.http.get<ExchangeRateApiResponse>(url, { context }).pipe(
      map((res) => {
        if (res.result !== 'success') {
          throw new Error(res['error-type'] ?? 'Failed to load exchange rates');
        }
        return this.toSnapshot(res);
      }),
    );
  }

  /**
   * Loads rates for `base`, preferring the network and falling back to the last
   * cached snapshot for that base. Only errors when neither is available.
   */
  load(base: string = API_CONFIG.defaultBaseCurrency): void {
    const cached = this.readCache(base);

    // Offline with a usable cache: skip a request that can only fail, and the
    // dialogs its failure would raise. Synchronous, so the dashboard paints
    // cached rates on the first frame.
    if (cached && this.connectivity.offline()) {
      this.serveFromCache(cached);
      return;
    }

    this._loading.set(true);
    this._error.set(null);
    this.fetchRates(base, cached !== null).subscribe({
      next: (snapshot) => {
        this.applySnapshot(base, snapshot);
        this._loading.set(false);
      },
      error: (err: Error) => {
        this._loading.set(false);
        // A cached snapshot means the failure is recoverable: show the old rates
        // marked stale rather than an error the user can do nothing about.
        if (cached) {
          this.serveFromCache(cached);
          return;
        }
        this._error.set(err.message || 'Failed to load exchange rates');
      },
    });
  }

  /** Commits a freshly fetched snapshot as the live source of truth and caches it. */
  private applySnapshot(base: string, snapshot: RatesSnapshot): void {
    this._snapshot.set(snapshot);
    this._cachedAt.set(null);
    this.cache.write(this.cacheKey(base), snapshot);
  }

  private serveFromCache(cached: CachedEntry<RatesSnapshot>): void {
    this._snapshot.set(cached.payload);
    this._cachedAt.set(cached.cachedAt);
    this._error.set(null);
    this._loading.set(false);
  }

  /** One entry per base currency — each is a different set of rates. */
  private cacheKey(base: string): string {
    return `rates:${base}`;
  }

  private readCache(base: string): CachedEntry<RatesSnapshot> | null {
    return this.cache.read<RatesSnapshot>(this.cacheKey(base), (payload) => {
      const snapshot = payload as RatesSnapshot;
      // `lastUpdated` is a Date in the model but a string after a JSON round-trip.
      return { ...snapshot, lastUpdated: new Date(snapshot.lastUpdated) };
    });
  }

  private toSnapshot(res: ExchangeRateApiResponse): RatesSnapshot {
    const base = res.base_code;
    const rates: Rate[] = Object.entries(res.rates).map(([code, rate]) => ({
      code,
      name: currencyName(code),
      rate,
      base,
    }));
    return {
      base,
      rates,
      lastUpdated: new Date(res.time_last_update_unix * 1000),
    };
  }
}

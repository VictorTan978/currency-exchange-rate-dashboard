import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { SKIP_ERROR_DIALOG, loadingMessage, silent } from '../interceptors/api-status.interceptor';
import { Currency } from '../models/currency.model';
import { CurrencySeries, FrankfurterTimeSeriesResponse, TrendsOutcome } from '../models/historical.model';
import { CacheService } from './cache.service';
import { ConnectivityService } from './connectivity.service';

/**
 * Fetches historical exchange-rate time-series from the Frankfurter API for the
 * trends chart. Kept as pure Observable methods (no shared signal state) since
 * this data is scoped to the historical-trends feature component.
 *
 * {@link getTrends} adds the cache layer on top of the pure fetch: series are
 * cached per base + currency selection and served back when the network is down
 * or the request fails, so the chart still plots offline.
 */
@Injectable({ providedIn: 'root' })
export class HistoricalService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheService);
  private readonly connectivity = inject(ConnectivityService);

  /** Returns the list of currencies Frankfurter supports (code + name). */
  getCurrencies(): Observable<Currency[]> {
    const cached = this.cache.read<Currency[]>('history-currencies');
    if (cached && this.connectivity.offline()) {
      return of(cached.payload);
    }

    // Silent: populates the chart's picker in the background; the chart's own
    // request is the one worth a dialog.
    return this.http
      .get<Record<string, string>>(`${API_CONFIG.frankfurterBaseUrl}/currencies`, {
        context: silent(),
      })
      .pipe(
        map((res) => Object.entries(res).map(([code, name]) => ({ code, name }))),
        map((currencies) => {
          this.cache.write('history-currencies', currencies);
          return currencies;
        }),
        catchError((err: unknown) =>
          cached ? of(cached.payload) : throwError(() => err),
        ),
      );
  }

  /**
   * Fetches daily rates for `symbols` against `base` between `start` and `end`
   * (inclusive, ISO dates), returning one chronological series per symbol.
   *
   * @param absorbErrors suppresses the global error dialog, for when the caller
   *   has cached series to fall back on.
   */
  getTimeSeries(
    base: string,
    symbols: string[],
    start: string,
    end: string,
    absorbErrors = false,
  ): Observable<CurrencySeries[]> {
    const params = new HttpParams().set('base', base).set('symbols', symbols.join(','));
    const url = `${API_CONFIG.frankfurterBaseUrl}/${start}..${end}`;
    const context = loadingMessage('Loading historical rates…');
    if (absorbErrors) {
      context.set(SKIP_ERROR_DIALOG, true);
    }
    return this.http
      .get<FrankfurterTimeSeriesResponse>(url, { params, context })
      .pipe(map((res) => this.toSeries(res, symbols)));
  }

  /**
   * {@link getTimeSeries}, with the last good result for this base + selection
   * as a fallback. Errors only when there's nothing cached to fall back on.
   */
  getTrends(base: string, symbols: string[], start: string, end: string): Observable<TrendsOutcome> {
    const key = this.cacheKey(base, symbols, start, end);
    const cached = this.cache.read<CurrencySeries[]>(key);

    if (cached && this.connectivity.offline()) {
      return of({ series: cached.payload, cachedAt: cached.cachedAt });
    }

    return this.getTimeSeries(base, symbols, start, end, cached !== null).pipe(
      map((series): TrendsOutcome => {
        this.cache.write(key, series);
        return { series, cachedAt: null };
      }),
      catchError((err: unknown) =>
        cached
          ? of({ series: cached.payload, cachedAt: cached.cachedAt })
          : throwError(() => err),
      ),
    );
  }

  /**
   * Keyed by base + selection + range. The range is user-chosen, so two ranges
   * for the same base + selection are genuinely different data and must not
   * share a cache entry — otherwise offline (or a failed fetch) could serve one
   * range's series under another's request. The default range's end is today,
   * so a cached entry for it won't be reused the next day; that's the cost of
   * correct per-range caching, and the stale notice tells the user it isn't live.
   */
  private cacheKey(base: string, symbols: string[], start: string, end: string): string {
    return `history:${base}|${[...symbols].sort().join(',')}|${start}..${end}`;
  }

  private toSeries(res: FrankfurterTimeSeriesResponse, symbols: string[]): CurrencySeries[] {
    const dates = Object.keys(res.rates).sort(); // ISO dates sort chronologically
    return symbols.map((code) => ({
      code,
      points: dates
        .filter((date) => res.rates[date]?.[code] != null)
        .map((date) => ({ date, value: res.rates[date][code] })),
    }));
  }
}

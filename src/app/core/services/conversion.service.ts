import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { silent } from '../interceptors/api-status.interceptor';
import { ConversionOutcome } from '../models/conversion.model';
import { PairConversionApiResponse } from '../models/rate.model';
import { ConnectivityService } from './connectivity.service';

/**
 * Currency conversion, with two interchangeable paths:
 *
 *  - {@link convertLive} asks the provider's keyed `pair` endpoint to do the
 *    conversion, and falls back to the local path if the network is unavailable
 *    or the request fails.
 *  - {@link convert} is pure arithmetic over an already-fetched rates map. It
 *    stays free of HTTP and framework state so it is trivially unit-testable,
 *    and it is what keeps the calculator working offline.
 *
 * Both paths read the same provider data and agree to floating-point precision;
 * the remote path exists so a result can be attributed to the provider directly.
 */
@Injectable({ providedIn: 'root' })
export class ConversionService {
  private readonly http = inject(HttpClient);
  private readonly connectivity = inject(ConnectivityService);

  /**
   * Converts `amount` from currency `from` to currency `to` using a cross-rate.
   *
   * With rates expressed as "units of X per 1 base":
   *   amount(from) → base = amount / rate[from]
   *   base → to           = × rate[to]
   *
   * @returns the converted amount, or `null` if inputs are invalid / a rate is missing.
   */
  convert(amount: number, from: string, to: string, ratesMap: Record<string, number>): number | null {
    if (!Number.isFinite(amount) || amount < 0) {
      return null;
    }
    const fromRate = ratesMap[from];
    const toRate = ratesMap[to];
    if (!fromRate || !toRate) {
      return null;
    }
    return (amount / fromRate) * toRate;
  }

  /**
   * Converts via the provider's `pair` endpoint, falling back to {@link convert}
   * over `ratesMap` when offline or when the request fails for any reason
   * (quota exhausted, unsupported code, timeout, provider down).
   *
   * Never errors: a failed request degrades to the local path instead.
   */
  convertLive(
    amount: number,
    from: string,
    to: string,
    ratesMap: Record<string, number>,
  ): Observable<ConversionOutcome> {
    // Invalid input can be rejected without spending a request against the quota.
    if (this.connectivity.offline() || !Number.isFinite(amount) || amount < 0) {
      return of(this.convertLocally(amount, from, to, ratesMap));
    }

    const startedAt = performance.now();
    const url = `${API_CONFIG.exchangeRatePairUrl}/${from}/${to}/${amount}`;
    // Silent: a failure here falls back to local arithmetic and still produces a
    // result, so the global dialogs would interrupt a flow that didn't break.
    // The calculator's own `pending` state covers the in-flight case inline.
    return this.http.get<PairConversionApiResponse>(url, { context: silent() }).pipe(
      map((res): ConversionOutcome => {
        if (res.result !== 'success') {
          throw new Error(res['error-type'] ?? 'Pair conversion failed');
        }
        return {
          value: res.conversion_result,
          unitRate: res.conversion_rate,
          source: 'api',
          elapsedMs: performance.now() - startedAt,
        };
      }),
      catchError(() => of(this.convertLocally(amount, from, to, ratesMap))),
    );
  }

  /** Local path, timed from its own start so a failed request isn't charged to it. */
  private convertLocally(
    amount: number,
    from: string,
    to: string,
    ratesMap: Record<string, number>,
  ): ConversionOutcome {
    const startedAt = performance.now();
    const value = this.convert(amount, from, to, ratesMap);
    const unitRate = this.convert(1, from, to, ratesMap);
    return { value, unitRate, source: 'local', elapsedMs: performance.now() - startedAt };
  }
}

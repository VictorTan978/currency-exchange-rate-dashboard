import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { Currency } from '../models/currency.model';
import { CurrencySeries, FrankfurterTimeSeriesResponse } from '../models/historical.model';

/**
 * Fetches historical exchange-rate time-series from the Frankfurter API for the
 * trends chart. Kept as pure Observable methods (no shared signal state) since
 * this data is scoped to the historical-trends feature component.
 */
@Injectable({ providedIn: 'root' })
export class HistoricalService {
  private readonly http = inject(HttpClient);

  /** Returns the list of currencies Frankfurter supports (code + name). */
  getCurrencies(): Observable<Currency[]> {
    return this.http
      .get<Record<string, string>>(`${API_CONFIG.frankfurterBaseUrl}/currencies`)
      .pipe(map((res) => Object.entries(res).map(([code, name]) => ({ code, name }))));
  }

  /**
   * Fetches daily rates for `symbols` against `base` between `start` and `end`
   * (inclusive, ISO dates), returning one chronological series per symbol.
   */
  getTimeSeries(base: string, symbols: string[], start: string, end: string): Observable<CurrencySeries[]> {
    const params = new HttpParams().set('base', base).set('symbols', symbols.join(','));
    const url = `${API_CONFIG.frankfurterBaseUrl}/${start}..${end}`;
    return this.http
      .get<FrankfurterTimeSeriesResponse>(url, { params })
      .pipe(map((res) => this.toSeries(res, symbols)));
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

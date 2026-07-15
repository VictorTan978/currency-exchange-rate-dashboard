import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { currencyName } from '../models/currency.model';
import { ExchangeRateApiResponse, Rate, RatesSnapshot } from '../models/rate.model';

/**
 * Fetches the latest exchange rates from the ExchangeRate-API open endpoint and
 * exposes them as signals. Owns the "live rates" domain state for the app:
 * the rates table and the conversion calculator both read from here.
 */
@Injectable({ providedIn: 'root' })
export class ExchangeRateService {
  private readonly http = inject(HttpClient);

  private readonly _snapshot = signal<RatesSnapshot | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  /** All rates for the currently loaded base currency. */
  readonly rates = computed<Rate[]>(() => this._snapshot()?.rates ?? []);
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

  /** Pure fetch + map (no side effects) — convenient for unit testing. */
  fetchRates(base: string): Observable<RatesSnapshot> {
    const url = `${API_CONFIG.exchangeRateBaseUrl}/${base}`;
    return this.http.get<ExchangeRateApiResponse>(url).pipe(
      map((res) => {
        if (res.result !== 'success') {
          throw new Error(res['error-type'] ?? 'Failed to load exchange rates');
        }
        return this.toSnapshot(res);
      }),
    );
  }

  /** Loads rates for `base` and updates the loading/error/data signals. */
  load(base: string = API_CONFIG.defaultBaseCurrency): void {
    this._loading.set(true);
    this._error.set(null);
    this.fetchRates(base).subscribe({
      next: (snapshot) => {
        this._snapshot.set(snapshot);
        this._loading.set(false);
      },
      error: (err: Error) => {
        this._error.set(err.message || 'Failed to load exchange rates');
        this._loading.set(false);
      },
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

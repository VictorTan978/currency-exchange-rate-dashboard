import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { silent } from '../interceptors/api-status.interceptor';
import {
  COMMON_CURRENCIES,
  CURRENCY_NAMES,
  Currency,
  SupportedCodesResponse,
} from '../models/currency.model';

/**
 * Owns the list of currencies the provider supports, from ExchangeRate-API's
 * `/codes` endpoint. Loaded once at startup and exposed as signals; the static
 * map in `currency.model` is the fallback until it resolves, so every consumer
 * renders immediately and upgrades in place.
 *
 * Note this is the *quotable* set (~160). The trends chart deliberately keeps
 * its own, smaller list from Frankfurter — that's the set it can actually plot.
 */
@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly http = inject(HttpClient);

  private readonly _currencies = signal<readonly Currency[]>(COMMON_CURRENCIES);
  private readonly _loaded = signal(false);

  /** All supported currencies, sorted by code. Falls back to the static list. */
  readonly currencies = this._currencies.asReadonly();

  /** True once `/codes` has resolved successfully. */
  readonly loaded = this._loaded.asReadonly();

  /** Code → display name, for joining against rate sets. */
  readonly nameMap = computed<Record<string, string>>(() =>
    Object.fromEntries(this._currencies().map((c) => [c.code, c.name])),
  );

  /** Pure fetch + map (no side effects) — convenient for unit testing. */
  fetchCodes(): Observable<Currency[]> {
    // Silent: this runs at startup behind a working static fallback, so it has
    // no loading state to show and nothing to tell the user when it fails.
    return this.http
      .get<SupportedCodesResponse>(API_CONFIG.exchangeRateCodesUrl, { context: silent() })
      .pipe(
        map((res) => {
          if (res.result !== 'success') {
            throw new Error(res['error-type'] ?? 'Failed to load supported currencies');
          }
          return res.supported_codes
            .map(([code, name]) => ({ code, name }))
            .sort((a, b) => a.code.localeCompare(b.code));
        }),
      );
  }

  /**
   * Loads the supported list. Non-fatal by design: on failure the static
   * fallback stays in place rather than emptying every currency dropdown.
   */
  load(): void {
    this.fetchCodes().subscribe({
      next: (currencies) => {
        this._currencies.set(currencies);
        this._loaded.set(true);
      },
      error: () => undefined,
    });
  }

  /** Returns a friendly name for a code, falling back to the static map. */
  nameOf(code: string): string {
    return this.nameMap()[code] ?? CURRENCY_NAMES[code] ?? code;
  }
}

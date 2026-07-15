import { Injectable } from '@angular/core';

/**
 * Pure currency-conversion logic. Kept free of HTTP and framework state so it
 * is trivially unit-testable; callers pass in the latest rates map (all rates
 * expressed against a single base, where the base itself has rate 1).
 */
@Injectable({ providedIn: 'root' })
export class ConversionService {
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
}

/** Which path produced a conversion result. */
export type ConversionSource = 'api' | 'local';

/** A conversion result, annotated with where it came from and what it cost. */
export interface ConversionOutcome {
  /** Converted amount, or null when the inputs or rates were unusable. */
  value: number | null;
  /** Unit rate: 1 `from` = `unitRate` `to`. Null when the conversion failed. */
  unitRate: number | null;
  /** `api` = keyed pair endpoint; `local` = cross-rate from the cached snapshot. */
  source: ConversionSource;
  /**
   * Wall-clock milliseconds spent producing `value` — network round-trip
   * included for `api`, arithmetic only for `local`. Surfaced in the UI so the
   * two paths can be compared directly.
   */
  elapsedMs: number;
}

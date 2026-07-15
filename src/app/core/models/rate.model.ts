/** A single currency's exchange rate relative to a base currency. */
export interface Rate {
  /** ISO 4217 currency code, e.g. "EUR". */
  code: string;
  /** Human-readable currency name, e.g. "Euro" (falls back to code if unknown). */
  name: string;
  /** Rate: how many units of `code` equal 1 unit of `base`. */
  rate: number;
  /** Base currency code these rates are expressed against. */
  base: string;
}

/** Raw response shape from the ExchangeRate-API open endpoint. */
export interface ExchangeRateApiResponse {
  result: 'success' | 'error';
  base_code: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  rates: Record<string, number>;
  'error-type'?: string;
}

/** A fully-loaded snapshot of latest rates for one base currency. */
export interface RatesSnapshot {
  base: string;
  rates: Rate[];
  /** When the provider last updated these rates. */
  lastUpdated: Date;
}

/** Aggregation granularity for the historical trends chart. */
export type Aggregation = 'daily' | 'weekly' | 'monthly';

/** Raw response shape from the Frankfurter time-series endpoint. */
export interface FrankfurterTimeSeriesResponse {
  amount: number;
  base: string;
  start_date: string;
  end_date: string;
  /** Keyed by ISO date (YYYY-MM-DD) → { currencyCode: rate }. */
  rates: Record<string, Record<string, number>>;
}

/** A single point in a currency's historical series. */
export interface TrendPoint {
  /** ISO date label for the (possibly aggregated) bucket. */
  date: string;
  value: number;
}

/** A full historical series for one currency, ready to plot. */
export interface CurrencySeries {
  code: string;
  points: TrendPoint[];
}

/** A set of series plus where it came from. */
export interface TrendsOutcome {
  series: CurrencySeries[];
  /** When the series were cached, or null when they came from the network. */
  cachedAt: Date | null;
}

/**
 * Central API configuration.
 *
 * Two data sources are used deliberately (see README "Architecture decisions"):
 *  - ExchangeRate-API open endpoint: free, no key, latest rates only.
 *    Powers the rates table and the conversion calculator.
 *  - Frankfurter: free, no key, provides historical time-series (ECB data).
 *    Powers the historical trends chart only.
 */
export const API_CONFIG = {
  /** ExchangeRate-API free "open access" base (no API key required). */
  exchangeRateBaseUrl: 'https://open.er-api.com/v6/latest',

  /** Frankfurter API base (no API key required). */
  frankfurterBaseUrl: 'https://api.frankfurter.dev/v1',

  /** Default base currency shown on first load. */
  defaultBaseCurrency: 'USD',

  /** Maximum number of currencies that can be compared on the trends chart. */
  maxTrendCurrencies: 3,
} as const;

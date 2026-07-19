/**
 * Central API configuration.
 *
 * Four endpoints across two providers (see README "Architecture decisions"):
 *  - ExchangeRate-API open endpoint: free, no key, latest rates only.
 *    Powers the rates table and the offline conversion fallback.
 *  - ExchangeRate-API keyed "pair" endpoint: server-side conversion.
 *    Powers the calculator's primary (online) path.
 *  - ExchangeRate-API keyed "codes" endpoint: code → name for every supported
 *    currency. Powers display names and the base-currency selectors.
 *  - Frankfurter: free, no key, provides historical time-series (ECB data).
 *    Powers the historical trends chart only. Its currency list stays separate
 *    on purpose — it's the subset the chart can actually plot (~30 of ~160).
 */

/**
 * ExchangeRate-API keyed v6 root.
 *
 * The key is readable by anyone who opens the deployed bundle — a browser app
 * has nowhere to hide it. The free tier is read-only and rate-limited, so the
 * exposure is a quota risk rather than a data risk; a production build would
 * proxy this through a backend that holds the key server-side.
 */
const EXCHANGE_RATE_KEYED_ROOT = 'https://v6.exchangerate-api.com/v6/8686290593f249403f2e44c6';

export const API_CONFIG = {
  /** ExchangeRate-API free "open access" base (no API key required). */
  exchangeRateBaseUrl: 'https://open.er-api.com/v6/latest',

  /** Keyed v6 "pair" endpoint: `{pairUrl}/{from}/{to}/{amount}`. */
  exchangeRatePairUrl: `${EXCHANGE_RATE_KEYED_ROOT}/pair`,

  /** Keyed v6 "codes" endpoint: authoritative code → name list for every
   * currency the provider quotes. Replaces a hand-maintained name map. */
  exchangeRateCodesUrl: `${EXCHANGE_RATE_KEYED_ROOT}/codes`,

  /** Frankfurter API base (no API key required). */
  frankfurterBaseUrl: 'https://api.frankfurter.dev/v1',

  /** Default base currency shown on first load. */
  defaultBaseCurrency: 'USD',

  /** Maximum number of currencies that can be compared on the trends chart. */
  maxTrendCurrencies: 3,

  /**
   * How often the live rates table polls for fresh data, in milliseconds.
   *
   * The open endpoint only recomputes rates about once a day, so this is a
   * responsiveness/quota tradeoff rather than a race for the newest number:
   * short enough that a reopened or long-lived tab reflects a daily update
   * within a minute, long enough not to hammer a free, rate-limited endpoint.
   * The real savings come from the poller itself, which suppresses requests
   * while offline or while the tab is hidden (see RatesTableComponent).
   */
  ratesRefreshIntervalMs: 60_000,
} as const;

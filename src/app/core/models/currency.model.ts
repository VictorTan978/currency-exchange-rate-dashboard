/** A currency option (code + display name) for selectors. */
export interface Currency {
  code: string;
  name: string;
}

/** Shape of the ExchangeRate-API `/codes` response. */
export interface SupportedCodesResponse {
  result: 'success' | 'error';
  'error-type'?: string;
  /** `[code, name]` tuples, e.g. `['AED', 'UAE Dirham']`. */
  supported_codes: [string, string][];
}

/**
 * Static ISO 4217 code → display name fallback, used until (or if) the `/codes`
 * endpoint resolves — rates arrive keyed by code only, so something has to name
 * them on first paint. `CurrencyService` supersedes this with the provider's
 * full list once loaded. Unknown codes fall back to the code itself.
 */
export const CURRENCY_NAMES: Readonly<Record<string, string>> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  JPY: 'Japanese Yen',
  GBP: 'British Pound',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  CHF: 'Swiss Franc',
  CNY: 'Chinese Yuan',
  HKD: 'Hong Kong Dollar',
  NZD: 'New Zealand Dollar',
  SEK: 'Swedish Krona',
  KRW: 'South Korean Won',
  SGD: 'Singapore Dollar',
  NOK: 'Norwegian Krone',
  MXN: 'Mexican Peso',
  INR: 'Indian Rupee',
  RUB: 'Russian Ruble',
  ZAR: 'South African Rand',
  TRY: 'Turkish Lira',
  BRL: 'Brazilian Real',
  TWD: 'New Taiwan Dollar',
  DKK: 'Danish Krone',
  PLN: 'Polish Zloty',
  THB: 'Thai Baht',
  IDR: 'Indonesian Rupiah',
  HUF: 'Hungarian Forint',
  CZK: 'Czech Koruna',
  ILS: 'Israeli New Shekel',
  CLP: 'Chilean Peso',
  PHP: 'Philippine Peso',
  AED: 'UAE Dirham',
  COP: 'Colombian Peso',
  SAR: 'Saudi Riyal',
  MYR: 'Malaysian Ringgit',
  RON: 'Romanian Leu',
  BGN: 'Bulgarian Lev',
  ISK: 'Icelandic Krona',
  VND: 'Vietnamese Dong',
  EGP: 'Egyptian Pound',
  NGN: 'Nigerian Naira',
  PKR: 'Pakistani Rupee',
  BDT: 'Bangladeshi Taka',
  KWD: 'Kuwaiti Dinar',
  QAR: 'Qatari Riyal',
  UAH: 'Ukrainian Hryvnia',
  KES: 'Kenyan Shilling',
  ARS: 'Argentine Peso',
  MAD: 'Moroccan Dirham',
  LKR: 'Sri Lankan Rupee',
  GHS: 'Ghanaian Cedi',
};

/** Returns a friendly name for a currency code, falling back to the code. */
export function currencyName(code: string): string {
  return CURRENCY_NAMES[code] ?? code;
}

/** Fallback base-currency options, sorted by code, for before `/codes` resolves. */
export const COMMON_CURRENCIES: readonly Currency[] = Object.entries(CURRENCY_NAMES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.code.localeCompare(b.code));

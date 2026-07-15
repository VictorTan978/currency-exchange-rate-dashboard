/** A currency option (code + display name) for selectors. */
export interface Currency {
  code: string;
  name: string;
}

/**
 * Static ISO 4217 code → display name map for the common currencies returned
 * by ExchangeRate-API. The API returns rates keyed by code only, so we join
 * against this map for friendly display and search. Unknown codes fall back to
 * the code itself via `currencyName()`.
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

/** Common currencies (code + name), sorted by code — used for base-currency options. */
export const COMMON_CURRENCIES: readonly Currency[] = Object.entries(CURRENCY_NAMES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.code.localeCompare(b.code));

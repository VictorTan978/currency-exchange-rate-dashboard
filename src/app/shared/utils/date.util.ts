/**
 * Pure date helpers. All operations use UTC to keep results deterministic and
 * free of the test runner's local timezone.
 */

/** Formats a Date as an ISO date string (YYYY-MM-DD) in UTC. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parses a YYYY-MM-DD string into a UTC Date (midnight UTC). */
export function parseIsoDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Returns the ISO date `days` days before `from` (default: now). */
export function isoDateDaysAgo(days: number, from: Date = new Date()): string {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() - days);
  return toIsoDate(d);
}

/**
 * Returns the ISO date of the Monday that starts the week containing `dateStr`.
 * Used to bucket daily points into weeks.
 */
export function startOfWeek(dateStr: string): string {
  const date = parseIsoDate(dateStr);
  const day = date.getUTCDay(); // 0 = Sun … 6 = Sat
  const diff = (day + 6) % 7; // days since Monday
  date.setUTCDate(date.getUTCDate() - diff);
  return toIsoDate(date);
}

/** Returns the year-month key (YYYY-MM) for a given ISO date. */
export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

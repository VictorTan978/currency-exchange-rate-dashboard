export type SortDirection = 'asc' | 'desc';

/**
 * Returns a new array sorted by `key`. Handles numbers and strings; strings are
 * compared case-insensitively. Non-mutating (does not touch the input array).
 */
export function sortBy<T>(items: readonly T[], key: keyof T, direction: SortDirection = 'asc'): T[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = a[key];
    const bv = b[key];

    if (typeof av === 'number' && typeof bv === 'number') {
      return (av - bv) * factor;
    }
    return String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' }) * factor;
  });
}

/** Toggles a sort direction. */
export function toggleDirection(direction: SortDirection): SortDirection {
  return direction === 'asc' ? 'desc' : 'asc';
}

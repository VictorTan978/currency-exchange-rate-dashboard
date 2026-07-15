import { Aggregation, TrendPoint } from '../../core/models/historical.model';
import { monthKey, startOfWeek } from './date.util';

/**
 * Aggregates a chronological series of daily points into daily / weekly /
 * monthly buckets. Each bucket's value is the mean of its members, and the
 * bucket is labelled by its start date (weekly → Monday, monthly → YYYY-MM).
 *
 * Pure function: input is not mutated, output stays in chronological order.
 */
export function aggregate(points: readonly TrendPoint[], mode: Aggregation): TrendPoint[] {
  if (mode === 'daily') {
    return [...points];
  }

  const keyOf = mode === 'weekly' ? startOfWeek : monthKey;

  // Preserve first-seen order so buckets stay chronological (input is sorted).
  const buckets = new Map<string, number[]>();
  for (const point of points) {
    const key = keyOf(point.date);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(point.value);
    } else {
      buckets.set(key, [point.value]);
    }
  }

  return Array.from(buckets, ([date, values]) => ({
    date,
    value: mean(values),
  }));
}

function mean(values: number[]): number {
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

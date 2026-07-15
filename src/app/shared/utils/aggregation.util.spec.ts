import { TrendPoint } from '../../core/models/historical.model';
import { aggregate } from './aggregation.util';

describe('aggregate', () => {
  const points: TrendPoint[] = [
    { date: '2024-06-03', value: 1.0 }, // Mon, week of 06-03, month 06
    { date: '2024-06-04', value: 2.0 }, // Tue, week of 06-03
    { date: '2024-06-10', value: 3.0 }, // Mon, week of 06-10
    { date: '2024-07-01', value: 5.0 }, // Mon, month 07
  ];

  it('returns a copy unchanged for daily', () => {
    const result = aggregate(points, 'daily');
    expect(result).toEqual(points);
    expect(result).not.toBe(points);
  });

  it('buckets by ISO week and averages, keeping chronological order', () => {
    const result = aggregate(points, 'weekly');
    expect(result).toEqual([
      { date: '2024-06-03', value: 1.5 }, // mean(1,2)
      { date: '2024-06-10', value: 3.0 },
      { date: '2024-07-01', value: 5.0 }, // 2024-07-01 is a Monday → its own week
    ]);
  });

  it('buckets by month and averages', () => {
    const result = aggregate(points, 'monthly');
    expect(result).toEqual([
      { date: '2024-06', value: 2.0 }, // mean(1,2,3)
      { date: '2024-07', value: 5.0 },
    ]);
  });

  it('handles an empty series', () => {
    expect(aggregate([], 'weekly')).toEqual([]);
  });
});

import {
  isoDateDaysAgo,
  monthKey,
  monthsSpanned,
  parseIsoDate,
  startOfWeek,
  toIsoDate,
  weeksSpanned,
} from './date.util';

describe('date.util', () => {
  it('toIsoDate formats a Date as YYYY-MM-DD (UTC)', () => {
    expect(toIsoDate(new Date(Date.UTC(2024, 5, 3)))).toBe('2024-06-03');
  });

  it('parseIsoDate round-trips with toIsoDate', () => {
    expect(toIsoDate(parseIsoDate('2024-01-09'))).toBe('2024-01-09');
  });

  it('isoDateDaysAgo subtracts days from a reference date', () => {
    const from = new Date(Date.UTC(2024, 6, 15));
    expect(isoDateDaysAgo(30, from)).toBe('2024-06-15');
    expect(isoDateDaysAgo(0, from)).toBe('2024-07-15');
  });

  it('startOfWeek returns the Monday of the week', () => {
    // 2024-06-05 is a Wednesday → Monday is 2024-06-03
    expect(startOfWeek('2024-06-05')).toBe('2024-06-03');
    // A Monday maps to itself
    expect(startOfWeek('2024-06-03')).toBe('2024-06-03');
    // A Sunday maps back to the previous Monday
    expect(startOfWeek('2024-06-09')).toBe('2024-06-03');
  });

  it('monthKey returns the YYYY-MM prefix', () => {
    expect(monthKey('2024-06-27')).toBe('2024-06');
  });

  it('weeksSpanned counts distinct week buckets in an inclusive range', () => {
    // Both dates in the same Mon–Sun week → one bucket.
    expect(weeksSpanned('2024-06-03', '2024-06-07')).toBe(1);
    // Wed one week to Wed the next → two week buckets.
    expect(weeksSpanned('2024-06-05', '2024-06-12')).toBe(2);
    // Sunday to the following Monday straddles two weeks.
    expect(weeksSpanned('2024-06-09', '2024-06-10')).toBe(2);
  });

  it('monthsSpanned counts distinct calendar months in an inclusive range', () => {
    expect(monthsSpanned('2024-06-01', '2024-06-30')).toBe(1);
    expect(monthsSpanned('2024-06-23', '2024-07-23')).toBe(2);
    // Crosses a year boundary.
    expect(monthsSpanned('2023-12-15', '2024-02-01')).toBe(3);
  });
});

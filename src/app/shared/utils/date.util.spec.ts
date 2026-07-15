import { isoDateDaysAgo, monthKey, parseIsoDate, startOfWeek, toIsoDate } from './date.util';

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
});

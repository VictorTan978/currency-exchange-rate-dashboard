import { sortBy, toggleDirection } from './sort.util';

describe('sortBy', () => {
  const rows = [
    { code: 'GBP', rate: 0.79 },
    { code: 'eur', rate: 0.88 },
    { code: 'JPY', rate: 157.2 },
  ];

  it('sorts numbers ascending and descending', () => {
    expect(sortBy(rows, 'rate', 'asc').map((r) => r.rate)).toEqual([0.79, 0.88, 157.2]);
    expect(sortBy(rows, 'rate', 'desc').map((r) => r.rate)).toEqual([157.2, 0.88, 0.79]);
  });

  it('sorts strings case-insensitively', () => {
    expect(sortBy(rows, 'code', 'asc').map((r) => r.code)).toEqual(['eur', 'GBP', 'JPY']);
  });

  it('does not mutate the input array', () => {
    const input = [...rows];
    sortBy(input, 'rate', 'desc');
    expect(input).toEqual(rows);
  });

  it('defaults to ascending', () => {
    expect(sortBy(rows, 'rate').map((r) => r.rate)).toEqual([0.79, 0.88, 157.2]);
  });
});

describe('toggleDirection', () => {
  it('flips direction', () => {
    expect(toggleDirection('asc')).toBe('desc');
    expect(toggleDirection('desc')).toBe('asc');
  });
});

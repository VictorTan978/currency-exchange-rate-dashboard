import { RateFormatPipe } from './rate-format.pipe';

describe('RateFormatPipe', () => {
  const pipe = new RateFormatPipe();

  it('uses 2 decimals for values >= 100', () => {
    expect(pipe.transform(157.199)).toBe('157.20');
  });

  it('uses 4 decimals for values in [1, 100)', () => {
    expect(pipe.transform(3.6725)).toBe('3.6725');
  });

  it('uses 6 decimals for values < 1', () => {
    expect(pipe.transform(0.8757643)).toBe('0.875764');
  });

  it('groups thousands', () => {
    expect(pipe.transform(1474.7)).toBe('1,474.70');
  });

  it('returns an em dash for null / undefined / NaN', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform(NaN)).toBe('—');
  });
});

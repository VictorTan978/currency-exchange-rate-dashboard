import { ConversionService } from './conversion.service';

describe('ConversionService', () => {
  const service = new ConversionService();
  // Rates expressed per 1 USD (base has rate 1).
  const rates = { USD: 1, EUR: 0.8, GBP: 0.75, JPY: 150 };

  it('converts from the base currency', () => {
    expect(service.convert(100, 'USD', 'EUR', rates)).toBeCloseTo(80, 6);
  });

  it('converts to the base currency', () => {
    expect(service.convert(80, 'EUR', 'USD', rates)).toBeCloseTo(100, 6);
  });

  it('converts via a cross-rate between two non-base currencies', () => {
    // 150 JPY → 1 USD → 0.8 EUR
    expect(service.convert(150, 'JPY', 'EUR', rates)).toBeCloseTo(0.8, 6);
  });

  it('returns the same amount when from === to', () => {
    expect(service.convert(42, 'EUR', 'EUR', rates)).toBeCloseTo(42, 6);
  });

  it('returns 0 for a zero amount', () => {
    expect(service.convert(0, 'USD', 'EUR', rates)).toBe(0);
  });

  it('returns null for a negative or non-finite amount', () => {
    expect(service.convert(-5, 'USD', 'EUR', rates)).toBeNull();
    expect(service.convert(NaN, 'USD', 'EUR', rates)).toBeNull();
  });

  it('returns null when a rate is missing', () => {
    expect(service.convert(10, 'USD', 'XYZ', rates)).toBeNull();
    expect(service.convert(10, 'XYZ', 'USD', rates)).toBeNull();
  });
});

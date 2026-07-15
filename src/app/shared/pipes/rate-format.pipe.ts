import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats an exchange rate with precision adapted to its magnitude, since rates
 * span a huge range (e.g. JPY ≈ 150, some crypto/weak currencies ≈ 0.00001).
 * Falls back to an em dash for non-finite input.
 */
@Pipe({ name: 'rateFormat' })
export class RateFormatPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) {
      return '—';
    }
    const decimals = value >= 100 ? 2 : value >= 1 ? 4 : 6;
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
}

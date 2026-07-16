import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { API_CONFIG } from '../config/api.config';
import { ConversionOutcome } from '../models/conversion.model';
import { ConversionService } from './conversion.service';

describe('ConversionService', () => {
  let service: ConversionService;
  let httpMock: HttpTestingController;

  // Rates expressed per 1 USD (base has rate 1).
  const rates = { USD: 1, EUR: 0.8, GBP: 0.75, JPY: 150 };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConversionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('convert (local cross-rate)', () => {
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

  describe('convertLive', () => {
    /** Subscribes and returns the single outcome the observable emits. */
    function capture(obs: ReturnType<ConversionService['convertLive']>): () => ConversionOutcome {
      let outcome: ConversionOutcome | undefined;
      obs.subscribe((o) => (outcome = o));
      return () => {
        expect(outcome).withContext('convertLive did not emit').toBeDefined();
        return outcome!;
      };
    }

    it('uses the provider result when the request succeeds', () => {
      const outcome = capture(service.convertLive(100, 'EUR', 'GBP', rates));

      const req = httpMock.expectOne(`${API_CONFIG.exchangeRatePairUrl}/EUR/GBP/100`);
      expect(req.request.method).toBe('GET');
      req.flush({
        result: 'success',
        base_code: 'EUR',
        target_code: 'GBP',
        conversion_rate: 0.9375,
        conversion_result: 93.75,
      });

      expect(outcome()).toEqual(
        jasmine.objectContaining({ value: 93.75, unitRate: 0.9375, source: 'api' }),
      );
    });

    it('falls back to local math when the request errors', () => {
      const outcome = capture(service.convertLive(100, 'USD', 'EUR', rates));

      httpMock
        .expectOne(`${API_CONFIG.exchangeRatePairUrl}/USD/EUR/100`)
        .error(new ProgressEvent('network error'));

      expect(outcome().source).toBe('local');
      expect(outcome().value).toBeCloseTo(80, 6);
      expect(outcome().unitRate).toBeCloseTo(0.8, 6);
    });

    it('falls back to local math when the provider reports an error result', () => {
      const outcome = capture(service.convertLive(100, 'USD', 'EUR', rates));

      httpMock
        .expectOne(`${API_CONFIG.exchangeRatePairUrl}/USD/EUR/100`)
        .flush({ result: 'error', 'error-type': 'quota-reached' });

      expect(outcome().source).toBe('local');
      expect(outcome().value).toBeCloseTo(80, 6);
    });

    it('skips the request entirely when offline', () => {
      spyOnProperty(navigator, 'onLine', 'get').and.returnValue(false);

      const outcome = capture(service.convertLive(100, 'USD', 'EUR', rates));

      httpMock.expectNone(`${API_CONFIG.exchangeRatePairUrl}/USD/EUR/100`);
      expect(outcome().source).toBe('local');
      expect(outcome().value).toBeCloseTo(80, 6);
    });

    it('does not spend a request on an invalid amount', () => {
      const outcome = capture(service.convertLive(NaN, 'USD', 'EUR', rates));

      httpMock.expectNone(() => true);
      expect(outcome().source).toBe('local');
      expect(outcome().value).toBeNull();
    });
  });
});

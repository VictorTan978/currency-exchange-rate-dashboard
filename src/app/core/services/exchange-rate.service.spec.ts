import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ExchangeRateService } from './exchange-rate.service';
import { ExchangeRateApiResponse, RatesSnapshot } from '../models/rate.model';
import { API_CONFIG } from '../config/api.config';
import { goOffline } from '../../../testing/connectivity';

const successResponse: ExchangeRateApiResponse = {
  result: 'success',
  base_code: 'USD',
  time_last_update_unix: 1_700_000_000,
  time_last_update_utc: 'Tue, 14 Nov 2023 00:00:00 +0000',
  rates: { USD: 1, EUR: 0.8, JPY: 150 },
};

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;
  let httpMock: HttpTestingController;

  /**
   * A second instance sharing the TestBed's injector (and so its HTTP mock),
   * standing in for a fresh page load against an already-warm cache.
   */
  function freshService(): ExchangeRateService {
    return TestBed.runInInjectionContext(() => new ExchangeRateService());
  }

  beforeEach(() => {
    // The offline cache is real localStorage, which outlives a TestBed. Without
    // this, one spec's cached snapshot hydrates the next one's service.
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [ExchangeRateService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ExchangeRateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('maps a successful response into rate rows with names', () => {
    let result: RatesSnapshot | undefined;
    service.fetchRates('USD').subscribe((snap) => (result = snap));

    const req = httpMock.expectOne(`${API_CONFIG.exchangeRateBaseUrl}/USD`);
    expect(req.request.method).toBe('GET');
    req.flush(successResponse);

    expect(result!.base).toBe('USD');
    expect(result!.rates.length).toBe(3);
    const eur = result!.rates.find((r) => r.code === 'EUR')!;
    expect(eur.name).toBe('Euro');
    expect(eur.rate).toBe(0.8);
    expect(result!.lastUpdated).toEqual(new Date(1_700_000_000 * 1000));
  });

  it('load() populates the rates/base/ratesMap signals and clears loading', () => {
    service.load('USD');
    expect(service.loading()).toBeTrue();

    httpMock.expectOne(`${API_CONFIG.exchangeRateBaseUrl}/USD`).flush(successResponse);

    expect(service.loading()).toBeFalse();
    expect(service.base()).toBe('USD');
    expect(service.rates().length).toBe(3);
    expect(service.ratesMap()['EUR']).toBe(0.8);
    expect(service.error()).toBeNull();
  });

  it('surfaces an error when the API returns result "error"', () => {
    service.load('USD');
    httpMock.expectOne(`${API_CONFIG.exchangeRateBaseUrl}/USD`).flush({
      result: 'error',
      'error-type': 'unsupported-code',
    } as ExchangeRateApiResponse);

    expect(service.error()).toBe('unsupported-code');
    expect(service.loading()).toBeFalse();
  });

  it('surfaces an error on a network failure', () => {
    service.load('USD');
    httpMock
      .expectOne(`${API_CONFIG.exchangeRateBaseUrl}/USD`)
      .error(new ProgressEvent('network error'));

    expect(service.error()).toBeTruthy();
    expect(service.loading()).toBeFalse();
  });

  describe('offline cache', () => {
    /** Loads USD rates into the cache via a successful fetch. */
    function warmCache(): void {
      service.load('USD');
      httpMock.expectOne(`${API_CONFIG.exchangeRateBaseUrl}/USD`).flush(successResponse);
    }

    it('does not mark a live snapshot as stale', () => {
      warmCache();

      expect(service.stale()).toBeFalse();
      expect(service.cachedAt()).toBeNull();
    });

    it('serves cached rates without a request when offline', () => {
      warmCache();
      goOffline();

      const fresh = freshService();
      fresh.load('USD');

      httpMock.expectNone(`${API_CONFIG.exchangeRateBaseUrl}/USD`);
      expect(fresh.ratesMap()['EUR']).toBe(0.8);
      expect(fresh.stale()).toBeTrue();
      expect(fresh.cachedAt()).toBeInstanceOf(Date);
      expect(fresh.error()).toBeNull();
      expect(fresh.loading()).toBeFalse();
    });

    it('revives lastUpdated as a Date across the JSON round-trip', () => {
      warmCache();
      goOffline();

      const fresh = freshService();
      fresh.load('USD');

      expect(fresh.lastUpdated()).toEqual(new Date(1_700_000_000 * 1000));
    });

    it('falls back to cached rates instead of erroring when a request fails', () => {
      warmCache();

      const fresh = freshService();
      fresh.load('USD');
      httpMock
        .expectOne(`${API_CONFIG.exchangeRateBaseUrl}/USD`)
        .error(new ProgressEvent('network error'));

      expect(fresh.ratesMap()['EUR']).toBe(0.8);
      expect(fresh.stale()).toBeTrue();
      expect(fresh.error()).toBeNull();
    });

    it('caches per base currency rather than serving one base from another', () => {
      warmCache();
      goOffline();

      const fresh = freshService();
      fresh.load('EUR'); // never fetched, so nothing is cached under this base

      // No cache for EUR, so it still tries the network — `onLine` is only a
      // hint, and a request that fails leaves the user no worse off than the
      // error they'd get anyway.
      httpMock
        .expectOne(`${API_CONFIG.exchangeRateBaseUrl}/EUR`)
        .error(new ProgressEvent('network error'));

      expect(fresh.stale()).toBeFalse();
      expect(fresh.rates()).toEqual([]);
      expect(fresh.error()).toBeTruthy();
    });

    it('drops a cache entry written by an older schema version', () => {
      warmCache();
      const key = 'cerd-cache:rates:USD';
      const envelope = JSON.parse(localStorage.getItem(key)!);
      localStorage.setItem(key, JSON.stringify({ ...envelope, version: envelope.version - 1 }));
      goOffline();

      const fresh = freshService();
      fresh.load('USD');

      // No usable cache, so it attempts the network rather than reviving a stale shape.
      httpMock.expectOne(`${API_CONFIG.exchangeRateBaseUrl}/USD`).flush(successResponse);
      expect(fresh.stale()).toBeFalse();
    });
  });
});

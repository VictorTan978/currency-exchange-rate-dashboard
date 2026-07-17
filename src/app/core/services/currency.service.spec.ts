import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { CurrencyService } from './currency.service';
import { API_CONFIG } from '../config/api.config';
import { SupportedCodesResponse } from '../models/currency.model';
import { goOffline } from '../../../testing/connectivity';

const successResponse: SupportedCodesResponse = {
  result: 'success',
  supported_codes: [
    ['USD', 'United States Dollar'],
    ['AED', 'UAE Dirham'],
    ['AFN', 'Afghan Afghani'],
  ],
};

describe('CurrencyService', () => {
  let service: CurrencyService;
  let httpMock: HttpTestingController;

  /**
   * A second instance sharing the TestBed's injector (and so its HTTP mock),
   * standing in for a fresh page load against an already-warm cache.
   */
  function freshService(): CurrencyService {
    return TestBed.runInInjectionContext(() => new CurrencyService());
  }

  beforeEach(() => {
    // The offline cache is real localStorage, which outlives a TestBed. Without
    // this, one spec's cached codes hydrate the next one's service.
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [CurrencyService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CurrencyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('starts with the static fallback list before /codes resolves', () => {
    expect(service.loaded()).toBeFalse();
    expect(service.currencies().length).toBeGreaterThan(0);
    expect(service.nameOf('EUR')).toBe('Euro');
  });

  it('maps supported_codes tuples into a list sorted by code', () => {
    service.load();

    const req = httpMock.expectOne(API_CONFIG.exchangeRateCodesUrl);
    expect(req.request.method).toBe('GET');
    req.flush(successResponse);

    expect(service.currencies().map((c) => c.code)).toEqual(['AED', 'AFN', 'USD']);
    expect(service.nameOf('AFN')).toBe('Afghan Afghani');
    expect(service.loaded()).toBeTrue();
  });

  it('supersedes the static name for codes the API also returns', () => {
    service.load();
    httpMock.expectOne(API_CONFIG.exchangeRateCodesUrl).flush(successResponse);

    expect(service.nameOf('USD')).toBe('United States Dollar');
  });

  it('keeps the fallback list when the API returns result "error"', () => {
    service.load();
    httpMock.expectOne(API_CONFIG.exchangeRateCodesUrl).flush({
      result: 'error',
      'error-type': 'invalid-key',
    } as SupportedCodesResponse);

    expect(service.loaded()).toBeFalse();
    expect(service.nameOf('EUR')).toBe('Euro');
  });

  it('keeps the fallback list on a network failure', () => {
    service.load();
    httpMock
      .expectOne(API_CONFIG.exchangeRateCodesUrl)
      .error(new ProgressEvent('network error'));

    expect(service.loaded()).toBeFalse();
    expect(service.currencies().length).toBeGreaterThan(0);
  });

  it('falls back to the code itself for an unknown currency', () => {
    expect(service.nameOf('ZZZ')).toBe('ZZZ');
  });

  describe('offline cache', () => {
    it('serves the cached list without a request when offline', () => {
      service.load();
      httpMock.expectOne(API_CONFIG.exchangeRateCodesUrl).flush(successResponse);

      goOffline();
      const fresh = freshService();
      fresh.load();

      httpMock.expectNone(API_CONFIG.exchangeRateCodesUrl);
      expect(fresh.currencies().map((c) => c.code)).toEqual(['AED', 'AFN', 'USD']);
      expect(fresh.loaded()).toBeTrue();
    });

    it('hydrates from cache, then supersedes it with the live list when online', () => {
      service.load();
      httpMock.expectOne(API_CONFIG.exchangeRateCodesUrl).flush(successResponse);

      const fresh = freshService();
      fresh.load();
      // Cache is in place before the request resolves.
      expect(fresh.currencies().map((c) => c.code)).toEqual(['AED', 'AFN', 'USD']);

      httpMock.expectOne(API_CONFIG.exchangeRateCodesUrl).flush({
        result: 'success',
        supported_codes: [['GBP', 'Pound Sterling']],
      } as SupportedCodesResponse);

      expect(fresh.currencies().map((c) => c.code)).toEqual(['GBP']);
    });
  });
});

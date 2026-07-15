import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ExchangeRateService } from './exchange-rate.service';
import { ExchangeRateApiResponse, RatesSnapshot } from '../models/rate.model';
import { API_CONFIG } from '../config/api.config';

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

  beforeEach(() => {
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
});

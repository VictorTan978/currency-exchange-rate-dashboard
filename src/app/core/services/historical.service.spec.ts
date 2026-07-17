import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { HistoricalService } from './historical.service';
import { CurrencySeries, FrankfurterTimeSeriesResponse, TrendsOutcome } from '../models/historical.model';
import { Currency } from '../models/currency.model';
import { API_CONFIG } from '../config/api.config';
import { goOffline } from '../../../testing/connectivity';

describe('HistoricalService', () => {
  let service: HistoricalService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    // The offline cache is real localStorage, which outlives a TestBed.
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [HistoricalService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HistoricalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getCurrencies maps the code→name record into a list', () => {
    let result: Currency[] | undefined;
    service.getCurrencies().subscribe((c) => (result = c));
    httpMock
      .expectOne(`${API_CONFIG.frankfurterBaseUrl}/currencies`)
      .flush({ EUR: 'Euro', GBP: 'British Pound' });

    expect(result).toEqual([
      { code: 'EUR', name: 'Euro' },
      { code: 'GBP', name: 'British Pound' },
    ]);
  });

  it('getTimeSeries builds one chronological series per symbol', () => {
    const response: FrankfurterTimeSeriesResponse = {
      amount: 1,
      base: 'USD',
      start_date: '2024-06-03',
      end_date: '2024-06-05',
      rates: {
        '2024-06-05': { EUR: 0.92, GBP: 0.79 },
        '2024-06-03': { EUR: 0.9, GBP: 0.78 },
      },
    };

    let result: CurrencySeries[] | undefined;
    service.getTimeSeries('USD', ['EUR', 'GBP'], '2024-06-03', '2024-06-05').subscribe((s) => (result = s));

    const req = httpMock.expectOne(
      (r) => r.url === `${API_CONFIG.frankfurterBaseUrl}/2024-06-03..2024-06-05`,
    );
    expect(req.request.params.get('base')).toBe('USD');
    expect(req.request.params.get('symbols')).toBe('EUR,GBP');
    req.flush(response);

    expect(result).toEqual([
      {
        code: 'EUR',
        points: [
          { date: '2024-06-03', value: 0.9 },
          { date: '2024-06-05', value: 0.92 },
        ],
      },
      {
        code: 'GBP',
        points: [
          { date: '2024-06-03', value: 0.78 },
          { date: '2024-06-05', value: 0.79 },
        ],
      },
    ]);
  });

  describe('getTrends (offline cache)', () => {
    const response: FrankfurterTimeSeriesResponse = {
      amount: 1,
      base: 'USD',
      start_date: '2024-06-03',
      end_date: '2024-06-05',
      rates: { '2024-06-03': { EUR: 0.9 }, '2024-06-05': { EUR: 0.92 } },
    };

    /** Runs one successful getTrends, leaving its result in the cache. */
    function warmCache(start = '2024-06-03', end = '2024-06-05'): void {
      service.getTrends('USD', ['EUR'], start, end).subscribe();
      httpMock
        .expectOne((r) => r.url === `${API_CONFIG.frankfurterBaseUrl}/${start}..${end}`)
        .flush(response);
    }

    it('reports live series as not cached', () => {
      let outcome: TrendsOutcome | undefined;
      service.getTrends('USD', ['EUR'], '2024-06-03', '2024-06-05').subscribe((o) => (outcome = o));
      httpMock.expectOne((r) => r.url.includes('2024-06-03..2024-06-05')).flush(response);

      expect(outcome!.cachedAt).toBeNull();
      expect(outcome!.series[0].points.length).toBe(2);
    });

    it('serves cached series without a request when offline', () => {
      warmCache();
      goOffline();

      let outcome: TrendsOutcome | undefined;
      service.getTrends('USD', ['EUR'], '2024-06-03', '2024-06-05').subscribe((o) => (outcome = o));

      httpMock.expectNone(() => true);
      expect(outcome!.series[0].points.length).toBe(2);
      expect(outcome!.cachedAt).toBeInstanceOf(Date);
    });

    it('falls back to cached series when the request fails', () => {
      warmCache();

      let outcome: TrendsOutcome | undefined;
      service.getTrends('USD', ['EUR'], '2024-06-03', '2024-06-05').subscribe((o) => (outcome = o));
      httpMock
        .expectOne((r) => r.url.includes('2024-06-03..2024-06-05'))
        .error(new ProgressEvent('network error'));

      expect(outcome!.series[0].points.length).toBe(2);
      expect(outcome!.cachedAt).toBeInstanceOf(Date);
    });

    it('errors when the request fails and nothing is cached', () => {
      let errored = false;
      service
        .getTrends('USD', ['EUR'], '2024-06-03', '2024-06-05')
        .subscribe({ error: () => (errored = true) });
      httpMock
        .expectOne((r) => r.url.includes('2024-06-03..2024-06-05'))
        .error(new ProgressEvent('network error'));

      expect(errored).toBeTrue();
    });

    it('hits the same cache entry when only the date window moves', () => {
      warmCache();
      goOffline();

      // The window is always "the last 30 days", so it slides daily. Keying by
      // date would miss the day after writing — exactly when the cache matters.
      let outcome: TrendsOutcome | undefined;
      service.getTrends('USD', ['EUR'], '2024-06-04', '2024-06-06').subscribe((o) => (outcome = o));

      httpMock.expectNone(() => true);
      expect(outcome!.cachedAt).toBeInstanceOf(Date);
    });

    it('keys on the selection regardless of the order it was picked in', () => {
      service.getTrends('USD', ['GBP', 'EUR'], '2024-06-03', '2024-06-05').subscribe();
      httpMock.expectOne((r) => r.url.includes('2024-06-03..2024-06-05')).flush(response);
      goOffline();

      let outcome: TrendsOutcome | undefined;
      service.getTrends('USD', ['EUR', 'GBP'], '2024-06-03', '2024-06-05').subscribe((o) => (outcome = o));

      httpMock.expectNone(() => true);
      expect(outcome!.cachedAt).toBeInstanceOf(Date);
    });

    it('does not serve one base currency from another base cache', () => {
      warmCache();
      goOffline();

      let errored = false;
      service
        .getTrends('EUR', ['EUR'], '2024-06-03', '2024-06-05')
        .subscribe({ error: () => (errored = true) });
      httpMock
        .expectOne((r) => r.url.includes('2024-06-03..2024-06-05'))
        .error(new ProgressEvent('network error'));

      expect(errored).toBeTrue();
    });
  });
});

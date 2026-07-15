import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { HistoricalService } from './historical.service';
import { CurrencySeries, FrankfurterTimeSeriesResponse } from '../models/historical.model';
import { Currency } from '../models/currency.model';
import { API_CONFIG } from '../config/api.config';

describe('HistoricalService', () => {
  let service: HistoricalService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
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
});

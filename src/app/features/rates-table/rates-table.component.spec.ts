import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';

import { RatesTableComponent } from './rates-table.component';
import { ConnectivityService } from '../../core/services/connectivity.service';
import { ExchangeRateService } from '../../core/services/exchange-rate.service';
import { Rate } from '../../core/models/rate.model';

const RATES: Rate[] = [
  { code: 'USD', name: 'US Dollar', rate: 1, base: 'USD' },
  { code: 'EUR', name: 'Euro', rate: 0.8, base: 'USD' },
];

const CACHED_AT = new Date('2024-06-05T10:30:00Z');

/** Stub exposing just the signals the table reads, plus a no-op load(). */
function fakeExchangeRateService(cachedAt: Date | null) {
  return {
    rates: signal(RATES),
    ratesMap: signal({ USD: 1, EUR: 0.8 }),
    loading: signal(false),
    error: signal<string | null>(null),
    lastUpdated: signal(new Date('2024-06-05T09:00:00Z')),
    cachedAt: signal(cachedAt),
    load: () => undefined,
    refresh: () => undefined,
  };
}

describe('RatesTableComponent (offline UI)', () => {
  let fixture: ComponentFixture<RatesTableComponent>;

  /** Renders the table with the given cache/connection state. */
  function render(cachedAt: Date | null, offline: boolean): void {
    TestBed.configureTestingModule({
      imports: [RatesTableComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(), // CurrencyService supplies the base-currency options.
        { provide: ExchangeRateService, useValue: fakeExchangeRateService(cachedAt) },
        { provide: ConnectivityService, useValue: { offline: signal(offline) } },
      ],
    });
    fixture = TestBed.createComponent(RatesTableComponent);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('shows no stale notice when the rates are live', () => {
    render(null, false);

    expect(fixture.nativeElement.querySelector('app-stale-notice')).toBeNull();
  });

  it('marks cached rates as not live and says when they were saved', () => {
    render(CACHED_AT, true);

    const notice = fixture.nativeElement.querySelector('app-stale-notice');
    expect(notice).not.toBeNull();
    expect(notice.textContent).toContain('Not live');
    expect(notice.textContent).toContain("You're offline");
    // The rates themselves still render alongside the notice.
    expect(fixture.nativeElement.textContent).toContain('EUR');
  });

  it('blames the provider, not the connection, when cached data follows a failure', () => {
    render(CACHED_AT, false);

    const notice = fixture.nativeElement.querySelector('app-stale-notice');
    expect(notice.textContent).toContain('could not be reached');
    expect(notice.textContent).not.toContain("You're offline");
  });
});

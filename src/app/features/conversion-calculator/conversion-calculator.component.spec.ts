import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';

import { ConversionCalculatorComponent } from './conversion-calculator.component';
import { ExchangeRateService } from '../../core/services/exchange-rate.service';
import { Rate } from '../../core/models/rate.model';

/** Must stay >= the component's DEBOUNCE_MS. */
const DEBOUNCE_MS = 300;

/** Minimal stub exposing just the signals the calculator reads. */
function fakeExchangeRateService() {
  const rates: Rate[] = [
    { code: 'USD', name: 'US Dollar', rate: 1, base: 'USD' },
    { code: 'EUR', name: 'Euro', rate: 0.8, base: 'USD' },
    { code: 'JPY', name: 'Japanese Yen', rate: 150, base: 'USD' },
  ];
  return {
    rates: signal(rates),
    ratesMap: signal({ USD: 1, EUR: 0.8, JPY: 150 }),
  };
}

describe('ConversionCalculatorComponent', () => {
  let fixture: ComponentFixture<ConversionCalculatorComponent>;
  let component: ConversionCalculatorComponent;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConversionCalculatorComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ExchangeRateService, useValue: fakeExchangeRateService() },
      ],
    });
    fixture = TestBed.createComponent(ConversionCalculatorComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    // NB: no detectChanges() here — it starts the debounce timer, which each
    // fakeAsync test needs to own so no timer outlives the fake zone.
  });

  afterEach(() => httpMock.verify());

  it('builds sorted currency options from the loaded rates', () => {
    expect(component.options().map((c) => c.code)).toEqual(['EUR', 'JPY', 'USD']);
    expect(component.ready()).toBeTrue();
  });

  it('swaps the from/to currencies', () => {
    component.from.set('USD');
    component.to.set('JPY');
    component.swap();
    expect(component.from()).toBe('JPY');
    expect(component.to()).toBe('USD');
  });

  it('shows the converted amount and unit rate from the API', fakeAsync(() => {
    component.amount.set(100);
    component.from.set('USD');
    component.to.set('EUR');
    fixture.detectChanges();
    tick(DEBOUNCE_MS);

    httpMock.expectOne((r) => r.url.endsWith('/pair/USD/EUR/100')).flush({
      result: 'success',
      base_code: 'USD',
      target_code: 'EUR',
      conversion_rate: 0.8,
      conversion_result: 80,
    });
    fixture.detectChanges();

    expect(component.result()).toBeCloseTo(80, 6);
    expect(component.unitRate()).toBeCloseTo(0.8, 6);
    expect(component.source()).toBe('api');
    expect(component.pending()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Live API');
  }));

  it('falls back to local rates when the API request fails', fakeAsync(() => {
    component.amount.set(100);
    component.from.set('USD');
    component.to.set('EUR');
    fixture.detectChanges();
    tick(DEBOUNCE_MS);

    httpMock
      .expectOne((r) => r.url.endsWith('/pair/USD/EUR/100'))
      .error(new ProgressEvent('network error'));
    fixture.detectChanges();

    expect(component.result()).toBeCloseTo(80, 6);
    expect(component.source()).toBe('local');
    expect(fixture.nativeElement.textContent).toContain('Local rates');
  }));

  it('debounces rapid input into a single request', fakeAsync(() => {
    fixture.detectChanges();
    component.amount.set(10);
    fixture.detectChanges();
    tick(100);
    component.amount.set(20);
    fixture.detectChanges();
    tick(100);
    component.amount.set(30);
    fixture.detectChanges();
    tick(DEBOUNCE_MS);

    // Only the final amount is ever requested.
    httpMock.expectOne((r) => r.url.endsWith('/pair/USD/EUR/30')).flush({
      result: 'success',
      base_code: 'USD',
      target_code: 'EUR',
      conversion_rate: 0.8,
      conversion_result: 24,
    });
    fixture.detectChanges();

    expect(component.result()).toBeCloseTo(24, 6);
  }));

  it('shows an error hint for an invalid amount without calling the API', fakeAsync(() => {
    component.amount.set(NaN);
    fixture.detectChanges();
    tick(DEBOUNCE_MS);
    fixture.detectChanges();

    httpMock.expectNone(() => true);
    expect(component.result()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Enter a valid amount');
  }));
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ConversionCalculatorComponent } from './conversion-calculator.component';
import { ExchangeRateService } from '../../core/services/exchange-rate.service';
import { Rate } from '../../core/models/rate.model';

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

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConversionCalculatorComponent],
      providers: [{ provide: ExchangeRateService, useValue: fakeExchangeRateService() }],
    });
    fixture = TestBed.createComponent(ConversionCalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('builds sorted currency options from the loaded rates', () => {
    expect(component.options().map((c) => c.code)).toEqual(['EUR', 'JPY', 'USD']);
    expect(component.ready()).toBeTrue();
  });

  it('computes the converted amount and unit rate', () => {
    component.amount.set(100);
    component.from.set('USD');
    component.to.set('EUR');
    fixture.detectChanges();

    expect(component.result()).toBeCloseTo(80, 6);
    expect(component.unitRate()).toBeCloseTo(0.8, 6);
    expect(fixture.nativeElement.textContent).toContain('EUR');
  });

  it('swaps the from/to currencies', () => {
    component.from.set('USD');
    component.to.set('JPY');
    component.swap();
    expect(component.from()).toBe('JPY');
    expect(component.to()).toBe('USD');
  });

  it('shows an error hint for an invalid amount', () => {
    component.amount.set(NaN);
    fixture.detectChanges();
    expect(component.result()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Enter a valid amount');
  });
});

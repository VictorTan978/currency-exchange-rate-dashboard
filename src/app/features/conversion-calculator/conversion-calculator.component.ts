import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { Currency, currencyName } from '../../core/models/currency.model';
import { ConversionService } from '../../core/services/conversion.service';
import { ExchangeRateService } from '../../core/services/exchange-rate.service';
import { CardComponent } from '../../shared/components/card/card.component';
import { CurrencySelectComponent } from '../../shared/components/currency-select/currency-select.component';
import { RateFormatPipe } from '../../shared/pipes/rate-format.pipe';

/**
 * Feature 3: currency conversion calculator. Uses the latest rates from
 * {@link ExchangeRateService} and the pure {@link ConversionService} to compute
 * a cross-rate between any two loaded currencies.
 */
@Component({
  selector: 'app-conversion-calculator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, CurrencySelectComponent, RateFormatPipe],
  templateUrl: './conversion-calculator.component.html',
  styleUrl: './conversion-calculator.component.scss',
})
export class ConversionCalculatorComponent {
  private readonly rates = inject(ExchangeRateService);
  private readonly conversion = inject(ConversionService);

  readonly amount = signal(1);
  readonly from = signal('USD');
  readonly to = signal('EUR');

  /** Currency options come from the currently loaded rate set (all in the map). */
  readonly options = computed<Currency[]>(() => {
    const rates = this.rates.rates();
    if (rates.length === 0) return [];
    return rates
      .map((r) => ({ code: r.code, name: currencyName(r.code) }))
      .sort((a, b) => a.code.localeCompare(b.code));
  });

  /** Converted amount, or null when inputs are invalid or rates aren't loaded. */
  readonly result = computed<number | null>(() =>
    this.conversion.convert(this.amount(), this.from(), this.to(), this.rates.ratesMap()),
  );

  /** Unit rate: 1 `from` = X `to`. */
  readonly unitRate = computed<number | null>(() =>
    this.conversion.convert(1, this.from(), this.to(), this.rates.ratesMap()),
  );

  readonly ready = computed(() => this.options().length > 0);

  onAmount(event: Event): void {
    const value = Number.parseFloat((event.target as HTMLInputElement).value);
    this.amount.set(Number.isNaN(value) ? NaN : value);
  }

  swap(): void {
    const from = this.from();
    this.from.set(this.to());
    this.to.set(from);
  }
}

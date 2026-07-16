import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { switchMap, timer } from 'rxjs';

import { ConversionOutcome } from '../../core/models/conversion.model';
import { Currency } from '../../core/models/currency.model';
import { ConversionService } from '../../core/services/conversion.service';
import { ExchangeRateService } from '../../core/services/exchange-rate.service';
import { CardComponent } from '../../shared/components/card/card.component';
import { CurrencySelectComponent } from '../../shared/components/currency-select/currency-select.component';
import { RateFormatPipe } from '../../shared/pipes/rate-format.pipe';

/** Idle time after the last keystroke before a conversion is requested. */
const DEBOUNCE_MS = 300;

/**
 * Feature 3: currency conversion calculator. Conversions go to the provider's
 * `pair` endpoint while online and fall back to local cross-rate arithmetic when
 * offline, via {@link ConversionService}. Currency options and the fallback
 * rates both come from {@link ExchangeRateService}.
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

  private readonly _outcome = signal<ConversionOutcome | null>(null);
  private readonly _pending = signal(false);

  /** The latest conversion, or null before the first one resolves. */
  readonly outcome = this._outcome.asReadonly();
  /** True while a conversion is debouncing or in flight. */
  readonly pending = this._pending.asReadonly();

  /** Currency options come from the currently loaded rate set, which already
   * carries provider display names. */
  readonly options = computed<Currency[]>(() =>
    this.rates
      .rates()
      .map((r) => ({ code: r.code, name: r.name }))
      .sort((a, b) => a.code.localeCompare(b.code)),
  );

  /** Converted amount, or null when inputs are invalid or rates aren't loaded. */
  readonly result = computed<number | null>(() => this._outcome()?.value ?? null);

  /** Unit rate: 1 `from` = X `to`. */
  readonly unitRate = computed<number | null>(() => this._outcome()?.unitRate ?? null);

  /** Whether the displayed result came from the API or from local arithmetic. */
  readonly source = computed(() => this._outcome()?.source ?? null);

  /** Human-readable cost of the displayed result — the API/local comparison. */
  readonly elapsedLabel = computed<string | null>(() => {
    const elapsed = this._outcome()?.elapsedMs;
    if (elapsed === undefined) return null;
    if (elapsed < 0.1) return '<0.1 ms';
    return `${elapsed.toFixed(elapsed < 10 ? 2 : 0)} ms`;
  });

  readonly ready = computed(() => this.options().length > 0);

  /** Inputs that, when any of them change, invalidate the current result. */
  private readonly request = computed(() => ({
    amount: this.amount(),
    from: this.from(),
    to: this.to(),
    ratesMap: this.rates.ratesMap(),
  }));

  constructor() {
    toObservable(this.request)
      .pipe(
        switchMap((req) => {
          this._pending.set(true);
          // `switchMap` over a timer debounces: a newer request cancels this one
          // before it fires, and cancels an in-flight response after it does.
          return timer(DEBOUNCE_MS).pipe(
            switchMap(() =>
              this.conversion.convertLive(req.amount, req.from, req.to, req.ratesMap),
            ),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((outcome) => {
        this._outcome.set(outcome);
        this._pending.set(false);
      });
  }

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

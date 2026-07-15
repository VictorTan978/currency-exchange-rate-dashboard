import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { Currency } from '../../../core/models/currency.model';

/**
 * Reusable currency dropdown. Two-way bound via `value` (model), shared by the
 * base-currency selector and the conversion calculator.
 */
@Component({
  selector: 'app-currency-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (label()) {
      <label class="cs__label" [attr.for]="selectId()">{{ label() }}</label>
    }
    <select
      class="cs__select"
      [id]="selectId()"
      [disabled]="disabled()"
      [attr.aria-label]="label() || 'Select currency'"
      (change)="onChange($event)"
    >
      @for (currency of currencies(); track currency.code) {
        <option [value]="currency.code" [selected]="currency.code === value()">
          {{ currency.code }} — {{ currency.name }}
        </option>
      }
    </select>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex-direction: column;
        gap: 0.3rem;
        min-width: 0;
      }
      .cs__label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-text-muted);
      }
      .cs__select {
        padding: 0.55rem 0.7rem;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border);
        background: var(--color-surface);
        color: var(--color-text);
        max-width: 100%;
      }
      .cs__select:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
})
export class CurrencySelectComponent {
  readonly currencies = input.required<readonly Currency[]>();
  readonly value = model.required<string>();
  readonly label = input('');
  readonly disabled = input(false);

  /** Derives a DOM id from the label so the <label for> association is valid. */
  readonly selectId = computed(
    () => 'cs-' + (this.label() || 'currency').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  );

  onChange(event: Event): void {
    this.value.set((event.target as HTMLSelectElement).value);
  }
}

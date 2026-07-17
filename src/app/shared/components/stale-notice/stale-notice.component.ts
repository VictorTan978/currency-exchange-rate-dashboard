import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';

/**
 * Marks a panel whose data came from the cache rather than the network, so
 * "not live" is stated where the numbers are — the global offline banner says
 * the app is offline, this says which figures are affected and how old they are.
 */
@Component({
  selector: 'app-stale-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <p class="stale" role="status">
      <span class="stale__icon" aria-hidden="true">⚠</span>
      <span class="stale__text">
        <strong>Not live — cached data.</strong>
        {{ reason() }} Saved {{ cachedAt() | date: 'medium' }}.
      </span>
    </p>
  `,
  styles: [
    `
      .stale {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        margin: 0 0 0.75rem;
        padding: 0.6rem 0.8rem;
        border-radius: var(--radius-sm);
        background: var(--color-warning-bg);
        color: var(--color-warning-text);
        font-size: 0.85rem;
      }
      .stale__icon {
        font-weight: 700;
      }
      .stale__text strong {
        font-weight: 650;
      }
    `,
  ],
})
export class StaleNoticeComponent {
  /** When the shown data was cached. */
  readonly cachedAt = input.required<Date>();
  /** True when the network is down, as opposed to the request having failed. */
  readonly offline = input(false);

  protected readonly reason = computed(() =>
    this.offline() ? "You're offline." : 'The rates provider could not be reached.',
  );
}

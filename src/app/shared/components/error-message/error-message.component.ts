import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Inline error banner with an optional retry action. */
@Component({
  selector: 'app-error-message',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="error" role="alert">
      <span class="error__icon" aria-hidden="true">⚠️</span>
      <span class="error__text">{{ message() }}</span>
      @if (retryable()) {
        <button type="button" class="error__retry" (click)="retry.emit()">Retry</button>
      }
    </div>
  `,
  styles: [
    `
      .error {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.75rem 1rem;
        border-radius: var(--radius-sm);
        background: color-mix(in srgb, var(--color-danger) 12%, var(--color-surface));
        border: 1px solid color-mix(in srgb, var(--color-danger) 40%, transparent);
        color: var(--color-text);
      }
      .error__text {
        flex: 1;
        font-size: 0.92rem;
      }
      .error__retry {
        border: 1px solid var(--color-danger);
        background: transparent;
        color: var(--color-danger);
        padding: 0.3rem 0.75rem;
        border-radius: var(--radius-sm);
        font-weight: 600;
      }
    `,
  ],
})
export class ErrorMessageComponent {
  readonly message = input.required<string>();
  readonly retryable = input(true);
  readonly retry = output<void>();
}

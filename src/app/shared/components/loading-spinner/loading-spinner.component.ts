import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Small inline loading indicator with an optional label. */
@Component({
  selector: 'app-loading-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="spinner" role="status" [attr.aria-label]="label()">
      <span class="spinner__dot"></span>
      <span class="spinner__dot"></span>
      <span class="spinner__dot"></span>
      @if (label()) {
        <span class="spinner__label">{{ label() }}</span>
      }
    </div>
  `,
  styles: [
    `
      .spinner {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        color: var(--color-text-muted);
      }
      .spinner__dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--color-primary);
        animation: pulse 1s infinite ease-in-out;
      }
      .spinner__dot:nth-child(2) {
        animation-delay: 0.15s;
      }
      .spinner__dot:nth-child(3) {
        animation-delay: 0.3s;
      }
      .spinner__label {
        margin-left: 0.4rem;
        font-size: 0.9rem;
      }
      @keyframes pulse {
        0%,
        80%,
        100% {
          transform: scale(0.6);
          opacity: 0.5;
        }
        40% {
          transform: scale(1);
          opacity: 1;
        }
      }
    `,
  ],
})
export class LoadingSpinnerComponent {
  readonly label = input('');
}

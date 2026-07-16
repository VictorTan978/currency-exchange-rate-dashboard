import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';

import { ErrorDialogService } from '../../../core/services/error-dialog.service';

/**
 * Global modal for API failures, driven by {@link ErrorDialogService}.
 * Mounted once at the app root.
 */
@Component({
  selector: 'app-error-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dlg class="dialog" (close)="errors.dismiss()">
      @if (errors.error(); as error) {
        <div class="dialog__header">
          <span class="dialog__icon" aria-hidden="true">⚠️</span>
          <h2 class="dialog__title">{{ error.title }}</h2>
        </div>
        <p class="dialog__message">{{ error.message }}</p>
        @if (error.details) {
          <p class="dialog__details">{{ error.details }}</p>
        }
        <div class="dialog__actions">
          <button type="button" class="dialog__button" (click)="errors.dismiss()">Dismiss</button>
        </div>
      }
    </dialog>
  `,
  styles: [
    `
      .dialog {
        border: 1px solid var(--color-border);
        border-radius: var(--radius);
        background: var(--color-surface);
        color: var(--color-text);
        box-shadow: var(--shadow-md);
        padding: 1.5rem;
        max-width: min(90vw, 26rem);
      }
      .dialog::backdrop {
        background: rgba(10, 15, 30, 0.35);
        backdrop-filter: blur(2px);
      }
      .dialog__header {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }
      .dialog__title {
        margin: 0;
        font-size: 1.05rem;
      }
      .dialog__message {
        margin: 0.75rem 0 0;
        font-size: 0.95rem;
      }
      .dialog__details {
        margin: 0.5rem 0 0;
        font-size: 0.78rem;
        color: var(--color-text-muted);
        word-break: break-word;
      }
      .dialog__actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 1.25rem;
      }
      .dialog__button {
        border: 0;
        border-radius: var(--radius-sm);
        background: var(--color-primary);
        color: var(--color-primary-contrast);
        font-weight: 600;
        padding: 0.5rem 1.1rem;
      }
    `,
  ],
})
/**
 * The service is the single source of truth in both directions: the Dismiss
 * button clears it and the effect closes the dialog in response, while `(close)`
 * clears it when the browser closes the dialog for us (Esc).
 */
export class ErrorDialogComponent {
  protected readonly errors = inject(ErrorDialogService);

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const dialog = this.dialogRef().nativeElement;
      const error = this.errors.error();
      if (error && !dialog.open) {
        dialog.showModal();
      } else if (!error && dialog.open) {
        dialog.close();
      }
    });
  }
}

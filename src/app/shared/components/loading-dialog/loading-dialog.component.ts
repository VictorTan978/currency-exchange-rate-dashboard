import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { map, of, switchMap, timer } from 'rxjs';

import { LoadingService } from '../../../core/services/loading.service';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

/**
 * Requests that finish faster than this never show the dialog. Without the
 * delay a cached 40 ms response produces a modal that flashes on and off, which
 * reads as a glitch and is worse than showing nothing.
 */
const SHOW_DELAY_MS = 250;

/**
 * Global modal shown while API requests are in flight, driven by
 * {@link LoadingService}. Mounted once at the app root.
 *
 * Deliberately not dismissible — it reflects work in progress rather than
 * asking the user anything, so Esc and backdrop clicks are ignored.
 */
@Component({
  selector: 'app-loading-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingSpinnerComponent],
  template: `
    <dialog #dlg class="dialog" aria-live="polite" (cancel)="$event.preventDefault()">
      <div class="dialog__body">
        <app-loading-spinner />
        <p class="dialog__message">{{ loading.message() }}</p>
      </div>
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
        padding: 1.5rem 2rem;
        max-width: min(90vw, 22rem);
      }
      .dialog::backdrop {
        background: rgba(10, 15, 30, 0.35);
        backdrop-filter: blur(2px);
      }
      .dialog__body {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.85rem;
      }
      .dialog__message {
        margin: 0;
        font-size: 0.95rem;
        color: var(--color-text-muted);
      }
    `,
  ],
})
export class LoadingDialogComponent {
  protected readonly loading = inject(LoadingService);

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  /** `loading`, but only after it has stayed true for {@link SHOW_DELAY_MS}. */
  private readonly visible = toSignal(
    toObservable(this.loading.loading).pipe(
      switchMap((loading) => (loading ? timer(SHOW_DELAY_MS).pipe(map(() => true)) : of(false))),
    ),
    { initialValue: false },
  );

  constructor() {
    effect(() => {
      const dialog = this.dialogRef().nativeElement;
      if (this.visible()) {
        if (!dialog.open) {
          dialog.showModal();
        }
      } else if (dialog.open) {
        dialog.close();
      }
    });
  }
}

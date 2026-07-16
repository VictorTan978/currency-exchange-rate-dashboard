import { Injectable, computed, signal } from '@angular/core';

/**
 * Tracks how many API requests are currently in flight, so a single global
 * loading dialog can be shown while any of them is pending.
 *
 * Counted rather than boolean: overlapping requests (the rates table refreshing
 * while the trends chart loads) must not let the first one to finish hide the
 * dialog out from under the second.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _pending = signal(0);

  /** True while at least one tracked request is in flight. */
  readonly loading = computed(() => this._pending() > 0);

  /** What the dialog says. Set by whoever starts the first tracked request. */
  private readonly _message = signal('Loading…');
  readonly message = this._message.asReadonly();

  start(message = 'Loading…'): void {
    if (this._pending() === 0) {
      this._message.set(message);
    }
    this._pending.update((n) => n + 1);
  }

  /** Floors at zero so a stray extra stop can't make the counter go negative. */
  stop(): void {
    this._pending.update((n) => Math.max(0, n - 1));
  }
}

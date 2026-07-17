import { Injectable, computed, signal } from '@angular/core';

/**
 * Exposes the browser's connectivity as a signal, so both the request paths and
 * the UI read the same value and re-render when it flips.
 *
 * `navigator.onLine === false` reliably means "no network". `true` only means an
 * interface is up — a request can still fail — so callers treat online as a hint
 * worth trying, never a guarantee, and keep their own failure fallback.
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly _online = signal(this.readInitial());

  /** True while the browser believes it has a network connection. */
  readonly online = this._online.asReadonly();
  /** True when the browser knows it has no network — the reliable direction. */
  readonly offline = computed(() => !this._online());

  constructor() {
    // Root-provided, so this lives for the app's lifetime and never unsubscribes.
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this._online.set(true));
      window.addEventListener('offline', () => this._online.set(false));
    }
  }

  private readInitial(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine;
  }
}

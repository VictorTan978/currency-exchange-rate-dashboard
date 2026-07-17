/**
 * Test helpers for driving {@link ConnectivityService}.
 *
 * It listens for the browser's own `online`/`offline` events, so dispatching
 * those is both the realistic way to simulate a connection drop and the only one
 * that works: the service reads `navigator.onLine` once at construction, which
 * a spy installed later can't affect.
 */

/** Simulates the connection dropping. */
export function goOffline(): void {
  window.dispatchEvent(new Event('offline'));
}

/** Simulates the connection coming back. */
export function goOnline(): void {
  window.dispatchEvent(new Event('online'));
}

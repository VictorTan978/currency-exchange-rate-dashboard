import { Injectable, signal } from '@angular/core';

/** What the error dialog renders. `details` is the technical bit, shown small. */
export interface ErrorDialogData {
  readonly title: string;
  readonly message: string;
  readonly details?: string;
}

/**
 * Owns the single global error dialog. Fed by the API status interceptor, but
 * callable from anywhere that needs to surface a failure the user must see.
 */
@Injectable({ providedIn: 'root' })
export class ErrorDialogService {
  private readonly _error = signal<ErrorDialogData | null>(null);

  /** The error currently on screen, or null when the dialog is closed. */
  readonly error = this._error.asReadonly();

  /**
   * Opens the dialog. A second failure while one is already showing is ignored:
   * a burst of failing requests should not stack dialogs the user must dismiss
   * one by one — the first message is the one that explains the problem.
   */
  show(data: ErrorDialogData): void {
    if (this._error() === null) {
      this._error.set(data);
    }
  }

  dismiss(): void {
    this._error.set(null);
  }
}

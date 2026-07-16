import { inject } from '@angular/core';
import {
  HttpContext,
  HttpContextToken,
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { catchError, finalize, tap, throwError } from 'rxjs';

import { ErrorDialogService } from '../services/error-dialog.service';
import { LoadingService } from '../services/loading.service';

/** Set on a request to keep it out of the global loading dialog. */
export const SKIP_LOADING = new HttpContextToken(() => false);

/** Set on a request whose failure is handled locally (e.g. by falling back). */
export const SKIP_ERROR_DIALOG = new HttpContextToken(() => false);

/** Text the loading dialog shows for this request. */
export const LOADING_MESSAGE = new HttpContextToken(() => 'Loading…');

/**
 * Context for a request that manages its own UX end to end — no global dialogs.
 * Used by the calls that degrade silently instead of failing loudly.
 */
export function silent(): HttpContext {
  return new HttpContext().set(SKIP_LOADING, true).set(SKIP_ERROR_DIALOG, true);
}

/** Context for a request that shows the loading dialog with a specific label. */
export function loadingMessage(message: string): HttpContext {
  return new HttpContext().set(LOADING_MESSAGE, message);
}

/**
 * Drives the two global dialogs from HTTP activity: the loading dialog is up
 * while any tracked request is in flight, and a failure opens the error dialog.
 *
 * Both are opt-out per request via {@link silent}, because some calls here are
 * deliberately non-fatal (the currency list falls back to a static map, the
 * conversion falls back to local arithmetic) and must not interrupt the user.
 */
export const apiStatusInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);
  const errorDialog = inject(ErrorDialogService);

  const tracksLoading = !req.context.get(SKIP_LOADING);
  const showsErrors = !req.context.get(SKIP_ERROR_DIALOG);

  if (tracksLoading) {
    loading.start(req.context.get(LOADING_MESSAGE));
  }

  return next(req).pipe(
    // Both providers answer some failures with HTTP 200 and an error body, so
    // status alone isn't enough to tell a success from a failure.
    tap((event: HttpEvent<unknown>) => {
      if (showsErrors && event instanceof HttpResponse) {
        const body = event.body as { result?: string; 'error-type'?: string } | null;
        if (body?.result === 'error') {
          errorDialog.show({
            title: 'Request failed',
            message: describePayloadError(body['error-type']),
            details: body['error-type'],
          });
        }
      }
    }),
    catchError((err: unknown) => {
      if (showsErrors) {
        errorDialog.show(describeHttpError(err, req.url));
      }
      return throwError(() => err);
    }),
    finalize(() => {
      if (tracksLoading) {
        loading.stop();
      }
    }),
  );
};

/** Maps a transport/status failure to something a user can act on. */
function describeHttpError(
  err: unknown,
  url: string,
): {
  title: string;
  message: string;
  details: string;
} {
  const details =
    err instanceof HttpErrorResponse ? `${err.status} ${err.statusText} — ${url}` : String(err);

  if (!(err instanceof HttpErrorResponse)) {
    return { title: 'Something went wrong', message: 'An unexpected error occurred.', details };
  }

  // status 0 is the browser refusing to tell us why: offline, DNS, CORS, blocked.
  if (err.status === 0) {
    return {
      title: 'Cannot reach the server',
      message: 'Check your internet connection and try again.',
      details,
    };
  }

  const message =
    {
      401: 'The API key was rejected. Rates cannot be loaded right now.',
      403: 'Access to the rates provider was denied — the API key may be invalid or out of quota.',
      404: 'The requested rates are not available from the provider.',
      429: 'Too many requests to the rates provider. Please wait a moment and try again.',
    }[err.status] ??
    (err.status >= 500
      ? 'The rates provider is having trouble. Please try again shortly.'
      : 'The request to the rates provider failed.');

  return { title: 'Request failed', message, details };
}

/** Maps ExchangeRate-API's `error-type` codes to plain language. */
function describePayloadError(errorType: string | undefined): string {
  switch (errorType) {
    case 'unsupported-code':
      return 'That currency is not supported by the rates provider.';
    case 'invalid-key':
      return 'The API key was rejected. Rates cannot be loaded right now.';
    case 'inactive-account':
      return 'The rates provider account is inactive.';
    case 'quota-reached':
      return 'The rates provider quota has been used up for this period.';
    case 'malformed-request':
      return 'The request to the rates provider was malformed.';
    default:
      return 'The rates provider could not fulfil the request.';
  }
}

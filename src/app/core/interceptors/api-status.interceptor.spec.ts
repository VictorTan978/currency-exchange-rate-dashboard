import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { apiStatusInterceptor, loadingMessage, silent } from './api-status.interceptor';
import { ErrorDialogService } from '../services/error-dialog.service';
import { LoadingService } from '../services/loading.service';

describe('apiStatusInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let loading: LoadingService;
  let errors: ErrorDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiStatusInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    loading = TestBed.inject(LoadingService);
    errors = TestBed.inject(ErrorDialogService);
  });

  afterEach(() => httpMock.verify());

  describe('loading', () => {
    it('loads while a request is in flight and stops when it succeeds', () => {
      http.get('/rates').subscribe();
      expect(loading.loading()).toBe(true);

      httpMock.expectOne('/rates').flush({ result: 'success' });
      expect(loading.loading()).toBe(false);
    });

    it('stops loading when a request fails', () => {
      http.get('/rates').subscribe({ error: () => undefined });
      httpMock.expectOne('/rates').flush('nope', { status: 500, statusText: 'Server Error' });
      expect(loading.loading()).toBe(false);
    });

    it('stops loading when a request is cancelled', () => {
      const sub = http.get('/rates').subscribe();
      expect(loading.loading()).toBe(true);

      sub.unsubscribe();
      expect(loading.loading()).toBe(false);
      httpMock.expectOne('/rates');
    });

    it('uses the message from the request context', () => {
      http.get('/rates', { context: loadingMessage('Loading exchange rates…') }).subscribe();
      expect(loading.message()).toBe('Loading exchange rates…');
      httpMock.expectOne('/rates').flush({});
    });

    it('does not track a silent request', () => {
      http.get('/codes', { context: silent() }).subscribe();
      expect(loading.loading()).toBe(false);
      httpMock.expectOne('/codes').flush({});
    });
  });

  describe('errors', () => {
    it('opens the error dialog when a request fails', () => {
      http.get('/rates').subscribe({ error: () => undefined });
      httpMock.expectOne('/rates').flush('nope', { status: 500, statusText: 'Server Error' });
      expect(errors.error()?.title).toBe('Request failed');
    });

    it('explains a network failure', () => {
      http.get('/rates').subscribe({ error: () => undefined });
      httpMock.expectOne('/rates').error(new ProgressEvent('error'));
      expect(errors.error()?.title).toBe('Cannot reach the server');
    });

    it('rethrows so callers keep their own error handling', () => {
      let caught: unknown = null;
      http.get('/rates').subscribe({ error: (err) => (caught = err) });
      httpMock.expectOne('/rates').flush('nope', { status: 500, statusText: 'Server Error' });
      expect(caught).toBeTruthy();
    });

    it('opens the dialog for an error payload returned with HTTP 200', () => {
      http.get('/rates').subscribe();
      httpMock.expectOne('/rates').flush({ result: 'error', 'error-type': 'quota-reached' });
      expect(errors.error()?.details).toBe('quota-reached');
    });

    it('stays closed on success', () => {
      http.get('/rates').subscribe();
      httpMock.expectOne('/rates').flush({ result: 'success' });
      expect(errors.error()).toBeNull();
    });

    it('does not open the dialog for a silent request', () => {
      http.get('/pair', { context: silent() }).subscribe({ error: () => undefined });
      httpMock.expectOne('/pair').flush('nope', { status: 500, statusText: 'Server Error' });
      expect(errors.error()).toBeNull();
    });
  });
});

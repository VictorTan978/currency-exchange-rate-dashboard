import { TestBed } from '@angular/core/testing';

import { ErrorDialogService } from './error-dialog.service';

describe('ErrorDialogService', () => {
  let service: ErrorDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ErrorDialogService);
  });

  it('has no error initially', () => {
    expect(service.error()).toBeNull();
  });

  it('shows and dismisses an error', () => {
    service.show({ title: 'Request failed', message: 'Nope.' });
    expect(service.error()?.message).toBe('Nope.');

    service.dismiss();
    expect(service.error()).toBeNull();
  });

  it('keeps the first error when a second arrives while one is showing', () => {
    service.show({ title: 'First', message: 'First failure.' });
    service.show({ title: 'Second', message: 'Second failure.' });
    expect(service.error()?.title).toBe('First');
  });

  it('shows a new error after the previous one is dismissed', () => {
    service.show({ title: 'First', message: 'First failure.' });
    service.dismiss();
    service.show({ title: 'Second', message: 'Second failure.' });
    expect(service.error()?.title).toBe('Second');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ErrorDialogComponent } from './error-dialog.component';
import { ErrorDialogService } from '../../../core/services/error-dialog.service';

describe('ErrorDialogComponent', () => {
  let fixture: ComponentFixture<ErrorDialogComponent>;
  let errors: ErrorDialogService;

  const dialog = (): HTMLDialogElement =>
    fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ErrorDialogComponent] }).compileComponents();
    fixture = TestBed.createComponent(ErrorDialogComponent);
    errors = TestBed.inject(ErrorDialogService);
    fixture.detectChanges();
  });

  // A modal <dialog> left open makes the rest of the document inert, which would
  // leak into the next test.
  afterEach(() => {
    dialog().close();
    fixture.destroy();
  });

  it('stays closed when there is no error', () => {
    expect(dialog().open).toBe(false);
  });

  it('opens with the error text when one is shown', () => {
    errors.show({ title: 'Request failed', message: 'Quota used up.', details: 'quota-reached' });
    fixture.detectChanges();

    expect(dialog().open).toBe(true);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Request failed');
    expect(text).toContain('Quota used up.');
    expect(text).toContain('quota-reached');
  });

  it('closes and clears the error when dismissed', () => {
    errors.show({ title: 'Request failed', message: 'Quota used up.' });
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.dialog__button').click();
    fixture.detectChanges();

    expect(errors.error()).toBeNull();
    expect(dialog().open).toBe(false);
  });

  it('clears the error when the browser closes the dialog (Esc)', () => {
    errors.show({ title: 'Request failed', message: 'Quota used up.' });
    fixture.detectChanges();

    // Esc closes a modal <dialog> and fires `close` without going through the
    // button. Dispatched directly: the browser fires the real thing on its own
    // task, which makes waiting on it flaky in Karma.
    dialog().dispatchEvent(new Event('close'));
    fixture.detectChanges();

    expect(errors.error()).toBeNull();
  });

  it('reopens for a new error after the previous one is dismissed', () => {
    errors.show({ title: 'First', message: 'First failure.' });
    fixture.detectChanges();
    errors.dismiss();
    fixture.detectChanges();
    expect(dialog().open).toBe(false);

    errors.show({ title: 'Second', message: 'Second failure.' });
    fixture.detectChanges();

    expect(dialog().open).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Second failure.');
  });
});

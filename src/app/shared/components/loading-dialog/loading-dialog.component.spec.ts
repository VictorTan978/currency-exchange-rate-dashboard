import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { LoadingDialogComponent } from './loading-dialog.component';
import { LoadingService } from '../../../core/services/loading.service';

describe('LoadingDialogComponent', () => {
  let fixture: ComponentFixture<LoadingDialogComponent>;
  let loading: LoadingService;

  const dialog = (): HTMLDialogElement =>
    fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LoadingDialogComponent] }).compileComponents();
    fixture = TestBed.createComponent(LoadingDialogComponent);
    loading = TestBed.inject(LoadingService);
    fixture.detectChanges();
  });

  // A modal <dialog> left open makes the rest of the document inert, so a test
  // that ends with one open would swallow the next test's clicks.
  afterEach(() => {
    dialog().close();
    fixture.destroy();
  });

  it('stays closed when nothing is loading', () => {
    expect(dialog().open).toBe(false);
  });

  it('opens once a request has been pending past the delay', fakeAsync(() => {
    loading.start('Loading exchange rates…');
    fixture.detectChanges();
    expect(dialog().open).toBe(false); // still within the anti-flash delay

    tick(250);
    fixture.detectChanges();
    expect(dialog().open).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Loading exchange rates…');

    loading.stop();
    fixture.detectChanges();
  }));

  it('never opens for a request that finishes inside the delay', fakeAsync(() => {
    loading.start();
    fixture.detectChanges();

    tick(100);
    loading.stop();
    fixture.detectChanges();

    tick(250);
    fixture.detectChanges();
    expect(dialog().open).toBe(false);
  }));

  it('closes when loading finishes', fakeAsync(() => {
    loading.start();
    fixture.detectChanges();
    tick(250);
    fixture.detectChanges();
    expect(dialog().open).toBe(true);

    loading.stop();
    fixture.detectChanges();
    expect(dialog().open).toBe(false);
  }));
});

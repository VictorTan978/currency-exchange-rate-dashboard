import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

/**
 * Reusable search box that emits a debounced, trimmed search term. Presentational
 * and decoupled from any specific data set (Feature 4: filtering & search).
 */
@Component({
  selector: 'app-search-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="search">
      <span class="search__icon" aria-hidden="true">🔍</span>
      <input
        #box
        type="search"
        class="search__input"
        [placeholder]="placeholder()"
        [attr.aria-label]="placeholder()"
        [value]="term()"
        (input)="onInput($event)"
      />
      @if (term()) {
        <button type="button" class="search__clear" aria-label="Clear search" (click)="clear(box)">
          ✕
        </button>
      }
    </div>
  `,
  styles: [
    `
      .search {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: var(--color-surface);
      }
      .search:focus-within {
        border-color: var(--color-primary);
      }
      .search__input {
        flex: 1;
        border: none;
        background: transparent;
        color: var(--color-text);
        outline: none;
        min-width: 0;
      }
      /* Hide the browser's native clear button so it doesn't duplicate ours (WebKit/Blink). */
      .search__input::-webkit-search-cancel-button {
        -webkit-appearance: none;
        appearance: none;
      }
      .search__clear {
        border: none;
        background: transparent;
        color: var(--color-text-muted);
        font-size: 0.9rem;
        line-height: 1;
      }
    `,
  ],
})
export class SearchFilterComponent {
  readonly placeholder = input('Search…');
  readonly debounceMs = input(200);
  readonly searchChange = output<string>();

  /** Current raw term, kept for the clear button's visibility. */
  readonly term = signal('');

  private readonly input$ = new Subject<string>();
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.input$
      .pipe(debounceTime(this.debounceMs()), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchChange.emit(value));
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.term.set(value);
    this.input$.next(value);
  }

  clear(box: HTMLInputElement): void {
    box.value = '';
    this.term.set('');
    this.input$.next('');
  }
}

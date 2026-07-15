import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SearchFilterComponent } from './search-filter.component';

describe('SearchFilterComponent', () => {
  let fixture: ComponentFixture<SearchFilterComponent>;
  let component: SearchFilterComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SearchFilterComponent] });
    fixture = TestBed.createComponent(SearchFilterComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('debounceMs', 200);
    fixture.detectChanges();
  });

  function type(value: string): void {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('emits a debounced, trimmed term', fakeAsync(() => {
    const emitted: string[] = [];
    component.searchChange.subscribe((v) => emitted.push(v));

    type('  eu');
    type('eur');
    tick(199);
    expect(emitted).toEqual([]); // still within debounce window

    tick(1);
    expect(emitted).toEqual(['eur']); // only the final value
  }));

  it('clears the term and emits an empty string', fakeAsync(() => {
    const emitted: string[] = [];
    component.searchChange.subscribe((v) => emitted.push(v));

    type('gbp');
    tick(200);
    expect(component.term()).toBe('gbp');

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    component.clear(input);
    tick(200);

    expect(component.term()).toBe('');
    expect(emitted[emitted.length - 1]).toBe('');
  }));
});

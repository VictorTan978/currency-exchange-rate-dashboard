import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SortableTableComponent, TableColumn } from './sortable-table.component';

interface Row {
  code: string;
  rate: number;
}

describe('SortableTableComponent', () => {
  let fixture: ComponentFixture<SortableTableComponent<Row>>;

  const columns: TableColumn<Row>[] = [
    { key: 'code', label: 'Code' },
    { key: 'rate', label: 'Rate', numeric: true, format: (r) => r.rate.toFixed(2) },
  ];
  const rows: Row[] = [
    { code: 'GBP', rate: 0.79 },
    { code: 'EUR', rate: 0.88 },
    { code: 'JPY', rate: 157.2 },
  ];

  function bodyRows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tbody tr'));
  }
  function firstCells(): string[] {
    return bodyRows().map((tr) => tr.querySelector('td')!.textContent!.trim());
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SortableTableComponent] });
    fixture = TestBed.createComponent<SortableTableComponent<Row>>(SortableTableComponent);
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('rowKey', 'code');
  });

  it('renders a row per data item and applies cell formatters', () => {
    fixture.detectChanges();
    expect(bodyRows().length).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('157.20');
  });

  it('respects the initial sort', () => {
    fixture.componentRef.setInput('initialSort', { key: 'code', direction: 'asc' });
    fixture.detectChanges();
    expect(firstCells()).toEqual(['EUR', 'GBP', 'JPY']);
  });

  it('sorts by a column on header click and toggles direction', () => {
    fixture.detectChanges();
    const rateHeader = fixture.nativeElement.querySelectorAll('thead th')[1] as HTMLElement;

    rateHeader.click();
    fixture.detectChanges();
    expect(firstCells()).toEqual(['GBP', 'EUR', 'JPY']); // rate asc

    rateHeader.click();
    fixture.detectChanges();
    expect(firstCells()).toEqual(['JPY', 'EUR', 'GBP']); // rate desc
  });

  it('shows an empty message when there are no rows', () => {
    fixture.componentRef.setInput('rows', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No matching currencies');
  });
});

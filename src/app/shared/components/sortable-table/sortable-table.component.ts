import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { SortDirection, sortBy, toggleDirection } from '../../utils/sort.util';

/** Declarative column definition for {@link SortableTableComponent}. */
export interface TableColumn<T> {
  key: keyof T & string;
  label: string;
  /** Right-aligns the column (use for numeric values). */
  numeric?: boolean;
  /** Optional cell formatter; defaults to `String(row[key])`. */
  format?: (row: T) => string;
}

/**
 * Generic, reusable table with clickable sortable headers. Sorting is handled
 * internally via the pure `sortBy` util; consumers supply column defs + rows.
 */
@Component({
  selector: 'app-sortable-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table class="tbl">
      <thead>
        <tr>
          @for (col of columns(); track col.key) {
            <th
              [class.tbl__th--numeric]="col.numeric"
              [attr.aria-sort]="ariaSort(col.key)"
              (click)="onSort(col.key)"
              (keydown.enter)="onSort(col.key)"
              tabindex="0"
              role="columnheader"
              scope="col"
            >
              <span class="tbl__th-label">
                {{ col.label }}
                <span class="tbl__arrow" aria-hidden="true">{{ arrow(col.key) }}</span>
              </span>
            </th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of sortedRows(); track rowId(row); let even = $even) {
          <tr [class.tbl__row--even]="even">
            @for (col of columns(); track col.key) {
              <td [class.tbl__td--numeric]="col.numeric">{{ cell(row, col) }}</td>
            }
          </tr>
        } @empty {
          <tr>
            <td class="tbl__empty" [attr.colspan]="columns().length">No matching currencies.</td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styleUrl: './sortable-table.component.scss',
})
export class SortableTableComponent<T> {
  readonly columns = input.required<TableColumn<T>[]>();
  readonly rows = input.required<readonly T[]>();
  /** Column used to uniquely identify a row for change tracking. */
  readonly rowKey = input.required<keyof T & string>();
  /** Optional starting sort. */
  readonly initialSort = input<{ key: keyof T & string; direction: SortDirection } | null>(null);

  private readonly sortState = signal<{ key: string; direction: SortDirection } | null>(null);

  private readonly activeSort = computed(() => this.sortState() ?? this.initialSort());

  readonly sortedRows = computed<readonly T[]>(() => {
    const sort = this.activeSort();
    const rows = this.rows();
    return sort ? sortBy(rows, sort.key as keyof T, sort.direction) : rows;
  });

  onSort(key: string): void {
    const current = this.activeSort();
    this.sortState.set(
      current && current.key === key
        ? { key, direction: toggleDirection(current.direction) }
        : { key, direction: 'asc' },
    );
  }

  cell(row: T, col: TableColumn<T>): string {
    return col.format ? col.format(row) : String(row[col.key]);
  }

  rowId(row: T): unknown {
    return row[this.rowKey()];
  }

  arrow(key: string): string {
    const sort = this.activeSort();
    if (!sort || sort.key !== key) return '↕';
    return sort.direction === 'asc' ? '↑' : '↓';
  }

  ariaSort(key: string): 'ascending' | 'descending' | 'none' {
    const sort = this.activeSort();
    if (!sort || sort.key !== key) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }
}

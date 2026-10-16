import {
  ChangeDetectionStrategy, Component, Directive, TemplateRef, computed, contentChild, contentChildren,
  inject, input, model,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { UiIcon } from './icon';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface TableColumn<T> {
  key: string;
  label: string;
  /** Numeric columns align to the end so decimals line up. */
  align?: 'start' | 'end';
  sortable?: boolean;
  /** Value used for sorting; defaults to row[key]. */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Direction applied the first time the column is sorted. */
  firstDirection?: SortDirection;
  /** CSS width for the column on wide screens, e.g. '20%' or '8rem'. */
  width?: string;
}

/** Stable sort; numbers compare numerically, strings case-insensitively; empty values sort last. */
export function sortRows<T>(rows: readonly T[], column: TableColumn<T> | undefined, direction: SortDirection): T[] {
  if (!column) return [...rows];
  const read = column.sortValue ?? ((row: T) => (row as Record<string, unknown>)[column.key] as string | number);
  const factor = direction === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: read(row) }))
    .sort((a, b) => {
      const empty = (v: unknown) => v === null || v === undefined || v === '';
      if (empty(a.value) || empty(b.value)) return empty(a.value) === empty(b.value) ? a.index - b.index : empty(a.value) ? 1 : -1;
      const cmp = typeof a.value === 'number' && typeof b.value === 'number'
        ? a.value - b.value
        : String(a.value).localeCompare(String(b.value), undefined, { sensitivity: 'base', numeric: true });
      return cmp * factor || a.index - b.index;
    })
    .map(entry => entry.row);
}

/** Custom cell content for one column: `<ng-template uiCell="balance" let-row>…</ng-template>`. */
@Directive({ selector: 'ng-template[uiCell]', standalone: true })
export class UiCell {
  readonly key = input.required<string>({ alias: 'uiCell' });
  readonly template = inject(TemplateRef);
}

/** Footer row cells (render your own `<td>`s): `<ng-template uiTableFooter>…</ng-template>`. */
@Directive({ selector: 'ng-template[uiTableFooter]', standalone: true })
export class UiTableFooter {
  readonly template = inject(TemplateRef);
}

/**
 * Data table with sortable headers. Below 768px the rows become stacked cards where every
 * value keeps its column label (styles in src/styles/table.scss).
 */
@Component({
  selector: 'ui-data-table',
  standalone: true,
  imports: [NgTemplateOutlet, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-table-scroll">
      <table class="ui-table">
        @if (caption()) { <caption class="sr-only">{{ caption() }}</caption> }
        <thead>
          <tr>
            @for (col of columns(); track col.key) {
              <th scope="col" [class.end]="col.align === 'end'" [style.width]="col.width ?? null"
                  [attr.aria-sort]="col.sortable ? ariaSort(col.key) : null">
                @if (col.sortable) {
                  <button type="button" class="sort" (click)="toggleSort(col)">
                    {{ col.label }}
                    <ui-icon [name]="sortIcon(col.key)" [size]="14" />
                  </button>
                } @else {
                  {{ col.label }}
                }
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of sortedRows(); track trackBy()(row, $index)) {
            <tr>
              @for (col of columns(); track col.key) {
                <td [class.end]="col.align === 'end'" [attr.data-label]="col.label">
                  @if (cellTemplate(col.key); as tpl) {
                    <ng-container *ngTemplateOutlet="tpl; context: { $implicit: row }" />
                  } @else {
                    {{ $any(row)[col.key] }}
                  }
                </td>
              }
            </tr>
          }
        </tbody>
        @if (footer(); as f) {
          <tfoot><tr><ng-container *ngTemplateOutlet="f.template" /></tr></tfoot>
        }
      </table>
    </div>
  `,
  styles: `:host { display: block; min-width: 0; }`,
})
export class UiDataTable<T> {
  readonly columns = input.required<TableColumn<T>[]>();
  readonly rows = input.required<readonly T[]>();
  readonly caption = input<string>();
  readonly trackBy = input<(row: T, index: number) => unknown>((_row, index) => index);
  readonly sort = model<SortState | null>(null);

  private readonly cells = contentChildren(UiCell);
  protected readonly footer = contentChild(UiTableFooter);

  protected readonly sortedRows = computed(() => {
    const sort = this.sort();
    if (!sort) return this.rows();
    return sortRows(this.rows(), this.columns().find(c => c.key === sort.key), sort.direction);
  });

  protected cellTemplate(key: string): TemplateRef<unknown> | undefined {
    return this.cells().find(c => c.key() === key)?.template;
  }

  protected toggleSort(col: TableColumn<T>): void {
    const current = this.sort();
    const direction: SortDirection = current?.key === col.key
      ? (current.direction === 'asc' ? 'desc' : 'asc')
      : (col.firstDirection ?? 'asc');
    this.sort.set({ key: col.key, direction });
  }

  protected ariaSort(key: string): 'ascending' | 'descending' | 'none' {
    const sort = this.sort();
    if (sort?.key !== key) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  protected sortIcon(key: string) {
    const state = this.ariaSort(key);
    return state === 'ascending' ? 'arrow-up' : state === 'descending' ? 'arrow-down' : 'arrow-up-down';
  }
}

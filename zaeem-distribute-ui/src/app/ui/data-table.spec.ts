import { afterEach, describe, expect, it } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SortState, TableColumn, UiCell, UiDataTable, sortRows } from './data-table';

interface Row { name: string; balance: number | null }

const ROWS: Row[] = [
  { name: 'swift Logistics', balance: 85000 },
  { name: 'Build-It Corp', balance: 12500 },
  { name: 'Mega Structures', balance: 0 },
];

const COLUMNS: TableColumn<Row>[] = [
  { key: 'name', label: 'Client', sortable: true },
  { key: 'balance', label: 'Balance due', align: 'end', sortable: true, firstDirection: 'desc' },
];

@Component({
  standalone: true,
  imports: [UiDataTable, UiCell],
  template: `
    <ui-data-table [columns]="columns" [rows]="rows" caption="Clients" [(sort)]="sort">
      <ng-template uiCell="balance" let-row>\${{ row.balance }}</ng-template>
    </ui-data-table>
  `,
})
class TableHost {
  columns = COLUMNS;
  rows = ROWS;
  sort: SortState | null = null;
}

describe('sortRows', () => {
  it('sorts strings case-insensitively', () => {
    expect(sortRows(ROWS, COLUMNS[0], 'asc').map(r => r.name)).toEqual(['Build-It Corp', 'Mega Structures', 'swift Logistics']);
  });

  it('sorts numbers numerically in both directions', () => {
    expect(sortRows(ROWS, COLUMNS[1], 'desc').map(r => r.balance)).toEqual([85000, 12500, 0]);
    expect(sortRows(ROWS, COLUMNS[1], 'asc').map(r => r.balance)).toEqual([0, 12500, 85000]);
  });

  it('keeps empty values last and is stable', () => {
    const rows = [{ name: 'A', balance: null }, { name: 'B', balance: 5 }, { name: 'C', balance: 5 }];
    expect(sortRows(rows, COLUMNS[1], 'asc').map(r => r.name)).toEqual(['B', 'C', 'A']);
    expect(sortRows(rows, COLUMNS[1], 'desc').map(r => r.name)).toEqual(['B', 'C', 'A']);
  });
});

describe('UiDataTable', () => {
  afterEach(() => TestBed.resetTestingModule());

  const render = () => {
    const fixture = TestBed.createComponent(TableHost);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const headers = () => [...el.querySelectorAll('th')];
    const firstColumn = () => [...el.querySelectorAll('tbody tr td:first-child')].map(td => td.textContent!.trim());
    return { fixture, el, headers, firstColumn };
  };

  it('marks sortable headers with aria-sort and none initially', () => {
    const { headers } = render();
    expect(headers().map(h => h.getAttribute('aria-sort'))).toEqual(['none', 'none']);
  });

  it('sorts on header activation and reflects the direction in aria-sort', () => {
    const { fixture, headers, firstColumn } = render();

    headers()[1].querySelector('button')!.click();
    fixture.detectChanges();
    expect(headers()[1].getAttribute('aria-sort')).toBe('descending');
    expect(headers()[0].getAttribute('aria-sort')).toBe('none');
    expect(firstColumn()).toEqual(['swift Logistics', 'Build-It Corp', 'Mega Structures']);
    expect(fixture.componentInstance.sort).toEqual({ key: 'balance', direction: 'desc' });

    headers()[1].querySelector('button')!.click();
    fixture.detectChanges();
    expect(headers()[1].getAttribute('aria-sort')).toBe('ascending');
    expect(firstColumn()[0]).toBe('Mega Structures');
  });

  it('labels every cell for the narrow-screen card layout and renders custom cells', () => {
    const { el } = render();
    const cells = [...el.querySelectorAll('tbody tr:first-child td')];
    expect(cells.map(c => c.getAttribute('data-label'))).toEqual(['Client', 'Balance due']);
    expect(cells[1].textContent!.trim()).toBe('$85000');
    expect(el.querySelector('caption')!.textContent).toBe('Clients');
  });

  it('keeps a hidden header label for screen readers and card mode', () => {
    const fixture = TestBed.createComponent(TableHost);
    fixture.componentInstance.columns = [...COLUMNS, { key: 'actions', label: 'Actions', hideLabel: true }];
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const header = el.querySelectorAll('th')[2];
    expect(header.querySelector('.sr-only')!.textContent).toBe('Actions');
    expect(el.querySelector('tbody tr td:last-child')!.getAttribute('data-label')).toBe('Actions');
  });
});

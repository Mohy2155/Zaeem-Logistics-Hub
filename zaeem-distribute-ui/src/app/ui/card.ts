import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

/**
 * Surface for a self-contained panel. Optional heading row with projected actions:
 * `<ui-card heading="Receipts"><button card-actions ...>Export</button> ...body... </ui-card>`.
 * Use `flush` when the body is a table that should run edge to edge.
 */
@Component({
  selector: 'ui-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-card', '[class.ui-card--flush]': 'flush()' },
  template: `
    @if (heading()) {
      <header class="head">
        <div class="titles">
          <h2 class="heading">{{ heading() }}</h2>
          @if (description()) { <p class="description">{{ description() }}</p> }
        </div>
        <div class="actions"><ng-content select="[card-actions]" /></div>
      </header>
    }
    <div class="body"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-width: 0;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }
    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5);
      border-bottom: 1px solid var(--color-border);
    }
    .titles { display: grid; gap: var(--space-1); min-width: 0; }
    .heading { font-size: var(--text-lg); font-weight: var(--weight-semibold); }
    .description { color: var(--color-text-muted); font-size: var(--text-sm); }
    .actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
    .actions:empty { display: none; }
    .body { padding: var(--space-5); min-width: 0; }
    :host(.ui-card--flush) .body { padding: 0; }
  `,
})
export class UiCard {
  readonly heading = input<string>();
  readonly description = input<string>();
  readonly flush = input(false, { transform: booleanAttribute });
}

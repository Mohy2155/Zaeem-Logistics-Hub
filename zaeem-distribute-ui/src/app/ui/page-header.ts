import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Title, one-line description and primary actions at the top of every page. */
@Component({
  selector: 'ui-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="titles">
      <h1 class="title">{{ title() }}</h1>
      @if (description()) { <p class="description">{{ description() }}</p> }
    </div>
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-4);
    }
    .titles { display: grid; gap: var(--space-1); min-width: 0; max-width: 70ch; }
    .title { font-size: var(--text-3xl); font-weight: var(--weight-bold); letter-spacing: -0.01em; }
    .description { color: var(--color-text-muted); font-size: var(--text-lg); }
    .actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
    .actions:empty { display: none; }
  `,
})
export class UiPageHeader {
  readonly title = input.required<string>();
  readonly description = input<string>();
}

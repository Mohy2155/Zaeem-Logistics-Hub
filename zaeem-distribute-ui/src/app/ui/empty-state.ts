import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconName, UiIcon } from './icon';

/** Explains why a view has nothing to show, with an optional projected action. */
@Component({
  selector: 'ui-empty-state',
  standalone: true,
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="icon" [class.danger]="tone() === 'danger'"><ui-icon [name]="icon()" [size]="22" /></span>
    <p class="title">{{ title() }}</p>
    @if (message()) { <p class="message">{{ message() }}</p> }
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: var(--space-2);
      padding: var(--space-10) var(--space-6);
      text-align: center;
    }
    .icon {
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      margin-bottom: var(--space-2);
      border-radius: var(--radius-full);
      background: var(--color-neutral-soft);
      color: var(--color-text-muted);
    }
    .icon.danger { background: var(--color-danger-soft); color: var(--color-danger-text); }
    .title { font-size: var(--text-lg); font-weight: var(--weight-semibold); }
    .message { max-width: 46ch; color: var(--color-text-muted); }
    .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-2); margin-top: var(--space-3); }
    .actions:empty { display: none; }
  `,
})
export class UiEmptyState {
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly icon = input<IconName>('inbox');
  readonly tone = input<'neutral' | 'danger'>('neutral');
}

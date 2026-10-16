import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconName, UiIcon } from './icon';

/** KPI tile: label, headline value, icon and one line of context drawn from real data. */
@Component({
  selector: 'ui-stat-card',
  standalone: true,
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="top">
      <p class="label">{{ label() }}</p>
      <span class="chip"><ui-icon [name]="icon()" [size]="18" /></span>
    </div>
    <p class="value num">{{ value() }}</p>
    @if (context()) { <p class="context">{{ context() }}</p> }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--space-2);
      align-content: start;
      padding: var(--space-5);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      min-width: 0;
    }
    .top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
    .label {
      color: var(--color-text-muted);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: var(--tracking-label);
      text-transform: uppercase;
    }
    .chip {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: var(--radius-md);
      background: var(--color-accent-soft);
      color: var(--color-accent-soft-text);
    }
    .value {
      font-size: var(--text-3xl);
      font-weight: var(--weight-bold);
      letter-spacing: -0.01em;
      line-height: var(--leading-tight);
      overflow-wrap: anywhere;
    }
    .context { color: var(--color-text-muted); font-size: var(--text-sm); }
  `,
})
export class UiStatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly icon = input.required<IconName>();
  readonly context = input<string>();
}

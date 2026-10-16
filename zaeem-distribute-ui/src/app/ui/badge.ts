import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

/** Fixed status-to-colour mapping used everywhere a rental status is shown. */
export const STATUS_TONES: Record<string, BadgeTone> = {
  Pending: 'warning',
  Active: 'success',
  Completed: 'neutral',
  Cancelled: 'danger',
};

/**
 * Small labelled pill. Meaning is always carried by the text, never by colour alone.
 * `<ui-badge status="Active" />` for rental statuses, or `<ui-badge tone="accent">3 items</ui-badge>`.
 */
@Component({
  selector: 'ui-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"tone-" + resolvedTone()' },
  template: `{{ status() }}<ng-content />`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: 0.125rem var(--space-2);
      border-radius: var(--radius-full);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      line-height: var(--leading-normal);
      white-space: nowrap;
    }
    :host(.tone-accent) { background: var(--color-accent-soft); color: var(--color-accent-soft-text); }
    :host(.tone-success) { background: var(--color-success-soft); color: var(--color-success-text); }
    :host(.tone-warning) { background: var(--color-warning-soft); color: var(--color-warning-text); }
    :host(.tone-danger) { background: var(--color-danger-soft); color: var(--color-danger-text); }
    :host(.tone-neutral) { background: var(--color-neutral-soft); color: var(--color-neutral-text); }
  `,
})
export class UiBadge {
  readonly status = input<string>();
  readonly tone = input<BadgeTone>();

  protected readonly resolvedTone = computed<BadgeTone>(
    () => this.tone() ?? STATUS_TONES[this.status() ?? ''] ?? 'neutral',
  );
}

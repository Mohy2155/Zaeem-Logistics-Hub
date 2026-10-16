import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type SkeletonVariant = 'table' | 'cards' | 'text' | 'block';

/** Placeholder shaped like the content it replaces. Hidden from assistive technology. */
@Component({
  selector: 'ui-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[class]': '"variant-" + variant()' },
  template: `
    @switch (variant()) {
      @case ('table') {
        <div class="row head"><span class="bar w-30"></span><span class="bar w-20"></span><span class="bar w-15"></span></div>
        @for (i of items(); track i) {
          <div class="row"><span class="bar w-40"></span><span class="bar w-20"></span><span class="bar w-15"></span></div>
        }
      }
      @case ('cards') {
        @for (i of items(); track i) {
          <div class="card"><span class="bar w-40"></span><span class="bar tall w-60"></span><span class="bar w-50"></span></div>
        }
      }
      @case ('block') { <div class="block"></div> }
      @default {
        @for (i of items(); track i) { <span class="bar" [class.w-60]="$last"></span> }
      }
    }
  `,
  styles: `
    :host { display: grid; gap: var(--space-3); }
    :host(.variant-table) { gap: 0; }
    :host(.variant-cards) { grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: var(--space-4); }
    .bar, .block {
      display: block;
      height: 0.75rem;
      border-radius: var(--radius-sm);
      background: linear-gradient(90deg, var(--color-skeleton) 25%, var(--color-skeleton-shine) 50%, var(--color-skeleton) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }
    .bar.tall { height: 1.5rem; }
    .block { height: 12rem; border-radius: var(--radius-md); }
    .row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: var(--space-6);
      align-items: center;
      padding: var(--space-4);
      border-bottom: 1px solid var(--color-border);
    }
    .row.head { background: var(--color-surface-sunken); }
    .card {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-5);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
    }
    .w-15 { width: 15%; } .w-20 { width: 20%; } .w-30 { width: 30%; } .w-40 { width: 40%; }
    .w-50 { width: 50%; } .w-60 { width: 60%; }
    .row .bar { width: auto; }
    .row .bar.w-15, .row .bar.w-20 { justify-self: end; width: 70%; }
    @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
  `,
})
export class UiSkeleton {
  readonly variant = input<SkeletonVariant>('text');
  readonly count = input(3);
  protected readonly items = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}

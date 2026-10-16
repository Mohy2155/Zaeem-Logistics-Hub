import { ChangeDetectionStrategy, Component, Directive, TemplateRef, contentChild, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { LoadState } from './load-state';
import { IconName } from './icon';
import { UiButton } from './button';
import { UiEmptyState } from './empty-state';
import { SkeletonVariant, UiSkeleton } from './skeleton';

/** Content shown once data has loaded: `<ng-template uiReady let-data>…</ng-template>`. */
@Directive({ selector: 'ng-template[uiReady]', standalone: true })
export class UiReady {
  readonly template = inject(TemplateRef);
}

/**
 * Renders the right view for a LoadState: skeleton while loading, an empty state when there are
 * no records, an error with Retry when loading failed, and the ready template otherwise.
 * Put an action for the empty state inside the element with the `empty-action` attribute.
 */
@Component({
  selector: 'ui-async-view',
  standalone: true,
  imports: [NgTemplateOutlet, UiButton, UiEmptyState, UiSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let s = state() ?? { status: 'loading' };
    @switch (s.status) {
      @case ('loading') {
        <div role="status" class="loading">
          <span class="sr-only">Loading {{ what() }}…</span>
          <ui-skeleton [variant]="skeleton()" [count]="skeletonCount()" />
        </div>
      }
      @case ('error') {
        <div role="alert">
          <ui-empty-state icon="triangle-alert" tone="danger" [title]="'Couldn\\'t load ' + what()" [message]="s.message">
            <button ui-button icon="rotate-ccw" (click)="retry.emit()">Retry</button>
          </ui-empty-state>
        </div>
      }
      @case ('empty') {
        <ui-empty-state [icon]="emptyIcon()" [title]="emptyTitle()" [message]="emptyMessage()">
          <ng-content select="[empty-action]" />
        </ui-empty-state>
      }
      @case ('ready') {
        @if (ready(); as r) { <ng-container *ngTemplateOutlet="r.template; context: { $implicit: s.data }" /> }
      }
    }
  `,
  styles: `:host { display: block; min-width: 0; } .loading { min-width: 0; }`,
})
export class UiAsyncView<T> {
  readonly state = input<LoadState<T> | null>();
  /** Lower-case noun for messages, e.g. "receipts" → "Couldn't load receipts". */
  readonly what = input('data');
  readonly skeleton = input<SkeletonVariant>('table');
  readonly skeletonCount = input(4);
  readonly emptyTitle = input('Nothing here yet');
  readonly emptyMessage = input<string>();
  readonly emptyIcon = input<IconName>('inbox');
  readonly retry = output<void>();

  protected readonly ready = contentChild(UiReady);
}

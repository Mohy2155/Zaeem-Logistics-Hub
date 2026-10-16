import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';
import { IconName, UiIcon } from './icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'md' | 'sm';

/**
 * The one button style. Put it on a native element so semantics stay native:
 * `<button ui-button variant="primary" [busy]="saving">Save</button>`.
 * While busy the button is disabled, so it cannot be activated twice.
 */
@Component({
  selector: 'button[ui-button], a[ui-button]',
  standalone: true,
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"ui-btn ui-btn--" + variant() + " ui-btn--" + size()',
    '[class.ui-btn--block]': 'block()',
    '[attr.disabled]': 'disabled() || busy() ? "" : null',
    '[attr.aria-busy]': 'busy() ? "true" : null',
  },
  template: `
    @if (busy()) {
      <ui-icon name="loader" [size]="16" class="spin" />
      <span class="sr-only">In progress:</span>
    } @else if (icon(); as name) {
      <ui-icon [name]="name" [size]="16" />
    }
    <ng-content />
  `,
  styleUrl: './button.scss',
})
export class UiButton {
  readonly variant = input<ButtonVariant>('secondary');
  readonly size = input<ButtonSize>('md');
  readonly icon = input<IconName>();
  readonly busy = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly block = input(false, { transform: booleanAttribute });
}

/**
 * Icon-only button. `label` is required and becomes the accessible name and tooltip.
 */
@Component({
  selector: 'button[ui-icon-button], a[ui-icon-button]',
  standalone: true,
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"ui-btn ui-btn--icon ui-btn--" + variant() + " ui-btn--" + size()',
    '[attr.aria-label]': 'label()',
    '[attr.title]': 'label()',
    '[attr.disabled]': 'disabled() ? "" : null',
  },
  template: `<ui-icon [name]="icon()" [size]="size() === 'sm' ? 16 : 18" />`,
  styleUrl: './button.scss',
})
export class UiIconButton {
  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();
  readonly variant = input<ButtonVariant>('ghost');
  readonly size = input<ButtonSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });
}

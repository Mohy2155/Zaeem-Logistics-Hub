import { ChangeDetectionStrategy, Component, Directive, booleanAttribute, computed, inject, input } from '@angular/core';
import { UiIcon } from './icon';

let nextFieldId = 0;

/**
 * Labelled wrapper for one form control. The control opts in with `uiControl`, which wires
 * its id to the label and its aria-describedby to the hint and error text:
 *
 *   <ui-form-field label="Plate number" hint="As painted on the machine" [error]="plateError">
 *     <input uiControl [(ngModel)]="plate" name="plate" />
 *   </ui-form-field>
 */
@Component({
  selector: 'ui-form-field',
  standalone: true,
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-form-field', '[class.has-error]': '!!error()', '[class.has-suffix]': '!!suffix()' },
  template: `
    <label class="label" [attr.for]="controlId">
      {{ label() }}
      @if (required()) { <span class="required" aria-hidden="true">*</span> }
    </label>
    <div class="control">
      <ng-content />
      @if (suffix()) { <span class="suffix" aria-hidden="true">{{ suffix() }}</span> }
    </div>
    @if (hint()) { <p class="hint" [id]="hintId">{{ hint() }}</p> }
    <p class="error" [id]="errorId" aria-live="polite">
      @if (error()) { <ui-icon name="circle-alert" [size]="14" />{{ error() }} }
    </p>
  `,
  styles: `
    :host { display: grid; gap: var(--space-1); min-width: 0; align-content: start; }
    .label { font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-text); }
    .required { color: var(--color-danger-text); margin-inline-start: 2px; }
    .control { position: relative; display: flex; }
    .suffix {
      position: absolute;
      inset-inline-end: var(--space-3);
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      pointer-events: none;
    }
    .hint { color: var(--color-text-muted); font-size: var(--text-xs); }
    .error {
      display: flex;
      align-items: flex-start;
      gap: var(--space-1);
      color: var(--color-danger-text);
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
    }
    .error:empty { display: none; }
    .error ui-icon { margin-top: 1px; }
  `,
})
export class UiFormField {
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string | null>();
  readonly suffix = input<string>();
  readonly required = input(false, { transform: booleanAttribute });

  private readonly baseId = `ui-field-${nextFieldId++}`;
  readonly controlId = `${this.baseId}-control`;
  readonly hintId = `${this.baseId}-hint`;
  readonly errorId = `${this.baseId}-error`;

  readonly describedBy = computed(() =>
    [this.hint() ? this.hintId : null, this.error() ? this.errorId : null].filter(Boolean).join(' ') || null,
  );
}

/** Marks the native control inside a ui-form-field and connects it to the label and messages. */
@Directive({
  selector: 'input[uiControl], select[uiControl], textarea[uiControl]',
  standalone: true,
  host: {
    class: 'ui-control',
    '[id]': 'field.controlId',
    '[attr.aria-describedby]': 'field.describedBy()',
    '[attr.aria-invalid]': 'field.error() ? "true" : null',
    '[attr.aria-required]': 'field.required() ? "true" : null',
  },
})
export class UiControl {
  protected readonly field = inject(UiFormField);
}

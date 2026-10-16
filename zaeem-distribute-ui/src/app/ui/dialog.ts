import { ChangeDetectionStrategy, Component, Injectable, inject, input } from '@angular/core';
import { DIALOG_DATA, Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { firstValueFrom } from 'rxjs';
import { UiButton, UiIconButton } from './button';

let nextDialogId = 0;

/** Id for a dialog's title; pass it to UiDialogService.open as ariaLabelledBy and to <ui-dialog [titleId]>. */
export const nextDialogTitleId = () => `ui-dialog-title-${nextDialogId++}`;

/**
 * Standard dialog frame: title row with a close button, body, and a footer for actions
 * (`<div dialog-actions>`). Opened through UiDialogService so focus trapping, Escape and
 * focus restoration come from the CDK.
 */
@Component({
  selector: 'ui-dialog',
  standalone: true,
  imports: [UiIconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="head">
      <h2 class="title" [id]="titleId()">{{ title() }}</h2>
      <button ui-icon-button icon="x" label="Close dialog" (click)="ref.close()"></button>
    </header>
    <div class="body"><ng-content /></div>
    <footer class="foot"><ng-content select="[dialog-actions]" /></footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      max-height: calc(100dvh - 2 * var(--space-6));
      background: var(--color-surface);
      color: var(--color-text);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-4) var(--space-2) var(--space-6);
    }
    .title { font-size: var(--text-xl); font-weight: var(--weight-semibold); }
    .body { padding: var(--space-2) var(--space-6) var(--space-5); overflow-y: auto; }
    .foot {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-2);
      padding: var(--space-4) var(--space-6);
      border-top: 1px solid var(--color-border);
      background: var(--color-surface-sunken);
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    }
    .foot:empty { display: none; }
  `,
})
export class UiDialog {
  readonly title = input.required<string>();
  readonly titleId = input(nextDialogTitleId());
  protected readonly ref = inject(DialogRef);
}

@Injectable({ providedIn: 'root' })
export class UiDialogService {
  private readonly dialog = inject(Dialog);

  /** Opens a dialog component; resolves with its close value (undefined when dismissed). */
  open<R, D = unknown, C = unknown>(component: ComponentType<C>, config: DialogConfig<D, DialogRef<R, C>> = {}): DialogRef<R, C> {
    return this.dialog.open<R, D, C>(component, {
      panelClass: 'ui-dialog-panel',
      backdropClass: 'ui-dialog-backdrop',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      ...config,
    });
  }
}

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Summary rows shown under the message, e.g. client, amount, resulting balance. */
  details?: { label: string; value: string }[];
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'destructive';
}

interface ConfirmData extends ConfirmOptions {
  titleId: string;
}

@Component({
  selector: 'ui-confirm-dialog',
  standalone: true,
  imports: [UiDialog, UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog [title]="data.title" [titleId]="data.titleId">
      <p class="message">{{ data.message }}</p>
      @if (data.details?.length) {
        <dl class="details">
          @for (row of data.details; track row.label) {
            <div class="row"><dt>{{ row.label }}</dt><dd class="num">{{ row.value }}</dd></div>
          }
        </dl>
      }
      <div dialog-actions>
        <button ui-button (click)="ref.close(false)">{{ data.cancelLabel ?? 'Cancel' }}</button>
        <button ui-button [variant]="data.tone === 'destructive' ? 'destructive' : 'primary'" (click)="ref.close(true)">
          {{ data.confirmLabel }}
        </button>
      </div>
    </ui-dialog>
  `,
  styles: `
    .message { color: var(--color-text-muted); max-width: 52ch; }
    .details {
      display: grid;
      gap: var(--space-2);
      margin: var(--space-4) 0 0;
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      background: var(--color-surface-sunken);
    }
    .row { display: flex; justify-content: space-between; gap: var(--space-4); }
    dt { color: var(--color-text-muted); }
    dd { margin: 0; font-weight: var(--weight-semibold); text-align: end; }
    [dialog-actions] { display: contents; }
  `,
})
export class UiConfirmDialog {
  protected readonly data = inject<ConfirmData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialogs = inject(UiDialogService);

  /** Resolves true only when the user explicitly confirms; cancel, Escape and backdrop resolve false. */
  async confirm(options: ConfirmOptions): Promise<boolean> {
    const titleId = nextDialogTitleId();
    // Focus starts on the first tabbable control (Close), so Enter never confirms by accident.
    const ref = this.dialogs.open<boolean, ConfirmData>(UiConfirmDialog, {
      data: { ...options, titleId },
      role: 'alertdialog',
      ariaLabelledBy: titleId,
    });
    return (await firstValueFrom(ref.closed)) === true;
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastKind, ToastService } from '../services/toast';
import { IconName, UiIcon } from './icon';
import { UiIconButton } from './button';

const ICONS: Record<ToastKind, IconName> = { success: 'circle-check', info: 'info', error: 'circle-alert' };

/**
 * Visible stack of notifications from ToastService. Announcements go through the LiveAnnouncer,
 * so this container is deliberately not a live region (that would announce everything twice).
 */
@Component({
  selector: 'ui-toast-stack',
  standalone: true,
  imports: [UiIcon, UiIconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (toast of toasts.toasts(); track toast.id) {
      <div class="toast" [class]="'toast kind-' + toast.kind">
        <ui-icon class="icon" [name]="icons[toast.kind]" [size]="18" />
        <p class="message">{{ toast.message }}</p>
        <button ui-icon-button icon="x" size="sm" label="Dismiss notification" (click)="toasts.dismiss(toast.id)"></button>
      </div>
    }
  `,
  styles: `
    :host {
      position: fixed;
      z-index: var(--z-toast);
      inset-inline-end: calc(var(--space-6) + env(safe-area-inset-right, 0px));
      bottom: calc(var(--space-6) + env(safe-area-inset-bottom, 0px));
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      width: min(24rem, calc(100vw - 2 * var(--space-4)));
      pointer-events: none;
    }
    @media (max-width: 767.98px) {
      :host { inset-inline: var(--space-4); width: auto; bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px)); }
    }
    .toast {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
      background: var(--color-surface);
      color: var(--color-text);
      border: 1px solid var(--color-border);
      border-inline-start: 4px solid var(--toast-accent);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      pointer-events: auto;
      animation: toast-in var(--duration-base) var(--ease-standard);
    }
    .kind-success { --toast-accent: var(--color-success-text); }
    .kind-info { --toast-accent: var(--color-accent-text); }
    .kind-error { --toast-accent: var(--color-danger-text); }
    .icon { color: var(--toast-accent); margin-top: 2px; }
    .message { flex: 1; min-width: 0; padding-top: 1px; overflow-wrap: anywhere; }
    @keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  `,
})
export class UiToastStack {
  protected readonly toasts = inject(ToastService);
  protected readonly icons = ICONS;
}

import { Injectable, inject, signal } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';

export type ToastKind = 'success' | 'info' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  /** Sticky toasts stay until dismissed; errors are always sticky. */
  sticky: boolean;
}

/** How long success and info toasts stay on screen. */
export const TOAST_AUTO_DISMISS_MS = 5000;

/**
 * Notification queue rendered by ui-toast-stack. Several toasts can be visible at once; each is
 * announced to screen readers (errors assertively, everything else politely).
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly announcer = inject(LiveAnnouncer);
  private nextId = 1;

  readonly toasts = signal<Toast[]>([]);

  success(message: string): void {
    this.push('success', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  /** Compatibility shim for existing call sites: `show(message, isError)`. */
  show(message: string, isError: boolean = false): void {
    this.push(isError ? 'error' : 'success', message);
  }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  private push(kind: ToastKind, message: string): void {
    const toast: Toast = { id: this.nextId++, kind, message, sticky: kind === 'error' };
    this.toasts.update(list => [...list, toast]);
    this.announcer.announce(message, kind === 'error' ? 'assertive' : 'polite');
    if (!toast.sticky) {
      setTimeout(() => this.dismiss(toast.id), TOAST_AUTO_DISMISS_MS);
    }
  }
}

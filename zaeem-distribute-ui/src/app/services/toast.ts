import { Injectable, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { map } from 'rxjs';

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

  /**
   * @deprecated Single-toast stream for the legacy shell overlay; removed when ui-toast-stack is mounted.
   */
  readonly toast$ = toObservable(this.toasts).pipe(
    map(list => {
      const latest = list[list.length - 1];
      return { message: latest?.message ?? '', isError: latest?.kind === 'error', show: !!latest };
    }),
  );

  private push(kind: ToastKind, message: string): void {
    const toast: Toast = { id: this.nextId++, kind, message, sticky: kind === 'error' };
    this.toasts.update(list => [...list, toast]);
    this.announcer.announce(message, kind === 'error' ? 'assertive' : 'polite');
    if (!toast.sticky) {
      setTimeout(() => this.dismiss(toast.id), TOAST_AUTO_DISMISS_MS);
    }
  }
}

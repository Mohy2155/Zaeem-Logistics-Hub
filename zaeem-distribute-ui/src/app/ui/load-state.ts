import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, startWith, switchMap } from 'rxjs';

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'empty'; data: T }
  | { status: 'error'; message: string };

export interface Loadable<T> {
  state$: Observable<LoadState<T>>;
  /** Re-subscribes to the source, showing the loading state again. */
  retry(): void;
}

/** Plain-language message for a failed request; never shows stale or fabricated data. */
export function describeLoadError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return "Can't reach the server. Check your connection, or that the API is running, then try again.";
    const serverMessage = error.error?.message;
    if (typeof serverMessage === 'string' && serverMessage) return serverMessage;
  }
  return 'Something went wrong while loading this data. Try again.';
}

const isEmptyByDefault = (data: unknown) => Array.isArray(data) && data.length === 0;

/**
 * Wraps a data source in loading / empty / error / ready states for ui-async-view.
 * The factory is called again on every retry, so pass a function that starts the request.
 */
export function loadState<T>(source: () => Observable<T>, isEmpty: (data: T) => boolean = isEmptyByDefault): Loadable<T> {
  const attempts = new BehaviorSubject<void>(undefined);
  const state$ = attempts.pipe(
    switchMap(() =>
      source().pipe(
        map((data): LoadState<T> => (isEmpty(data) ? { status: 'empty', data } : { status: 'ready', data })),
        startWith<LoadState<T>>({ status: 'loading' }),
        catchError(error => of<LoadState<T>>({ status: 'error', message: describeLoadError(error) })),
      ),
    ),
  );
  return { state$, retry: () => attempts.next() };
}

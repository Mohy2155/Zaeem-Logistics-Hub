import { afterEach, describe, expect, it } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, defer, of, throwError } from 'rxjs';
import { LoadState, describeLoadError, loadState } from './load-state';
import { UiAsyncView, UiReady } from './async-view';

@Component({
  standalone: true,
  imports: [UiAsyncView, UiReady],
  template: `
    <ui-async-view [state]="state()" what="receipts" emptyTitle="No payments recorded yet" (retry)="retries = retries + 1">
      <button empty-action>Record payment</button>
      <ng-template uiReady let-rows><p class="ready">{{ rows.length }} receipts</p></ng-template>
    </ui-async-view>
  `,
})
class Host {
  state = signal<LoadState<string[]> | null>({ status: 'loading' });
  retries = 0;
}

describe('UiAsyncView', () => {
  afterEach(() => TestBed.resetTestingModule());

  const render = (state: LoadState<string[]>) => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.state.set(state);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  };

  it('shows a skeleton with an announced loading status, and no values', () => {
    const { el } = render({ status: 'loading' });
    expect(el.querySelector('[role="status"]')!.textContent).toContain('Loading receipts');
    expect(el.querySelector('ui-skeleton')).not.toBeNull();
    expect(el.querySelector('.ready')).toBeNull();
  });

  it('shows the empty state with its action', () => {
    const { el } = render({ status: 'empty', data: [] });
    expect(el.textContent).toContain('No payments recorded yet');
    expect(el.querySelector('[empty-action]')!.textContent).toBe('Record payment');
  });

  it('shows the error with a working Retry and no data', () => {
    const { fixture, el } = render({ status: 'error', message: "Can't reach the server." });
    const alert = el.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain("Couldn't load receipts");
    expect(alert.textContent).toContain("Can't reach the server.");
    expect(el.querySelector('.ready')).toBeNull();

    (alert.querySelector('button') as HTMLButtonElement).click();
    expect(fixture.componentInstance.retries).toBe(1);
  });

  it('renders the ready template with the data', () => {
    const { el } = render({ status: 'ready', data: ['REC-1', 'REC-2'] });
    expect(el.querySelector('.ready')!.textContent).toBe('2 receipts');
  });
});

describe('loadState', () => {
  const collect = <T>(state$: Observable<LoadState<T>>) => {
    const seen: LoadState<T>[] = [];
    const sub = state$.subscribe(s => seen.push(s));
    return { seen, sub };
  };

  it('goes from loading to ready, or empty for an empty list', () => {
    expect(collect(loadState(() => of(['a'])).state$).seen.map(s => s.status)).toEqual(['loading', 'ready']);
    expect(collect(loadState(() => of([])).state$).seen.map(s => s.status)).toEqual(['loading', 'empty']);
  });

  it('turns a failure into an error state with a plain message', () => {
    const failing = loadState(() => throwError(() => new HttpErrorResponse({ status: 0 })));
    const { seen } = collect(failing.state$);
    expect(seen[1]).toEqual({ status: 'error', message: describeLoadError(new HttpErrorResponse({ status: 0 })) });
    expect((seen[1] as { message: string }).message).toMatch(/can't reach the server/i);
  });

  it('re-subscribes to the source on retry', () => {
    let subscriptions = 0;
    let fail = true;
    const loadable = loadState(() => defer(() => {
      subscriptions++;
      return fail ? throwError(() => new Error('boom')) : of(['REC-1']);
    }));
    const { seen } = collect(loadable.state$);
    expect(seen.map(s => s.status)).toEqual(['loading', 'error']);

    fail = false;
    loadable.retry();
    expect(subscriptions).toBe(2);
    expect(seen.map(s => s.status)).toEqual(['loading', 'error', 'loading', 'ready']);
  });

  it('follows later emissions of a long-lived source', () => {
    const source = new Subject<string[]>();
    const { seen } = collect(loadState(() => source).state$);
    source.next(['a']);
    source.next([]);
    expect(seen.map(s => s.status)).toEqual(['loading', 'ready', 'empty']);
  });

  it('uses the server message when the API sends one', () => {
    const err = new HttpErrorResponse({ status: 409, error: { message: 'Scheduling conflict' } });
    expect(describeLoadError(err)).toBe('Scheduling conflict');
  });
});

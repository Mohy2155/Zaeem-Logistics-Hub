import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TOAST_AUTO_DISMISS_MS, ToastService } from './toast';
import { UiToastStack } from '../ui/toast-stack';

describe('ToastService', () => {
  let announce: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    announce = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({ providers: [{ provide: LiveAnnouncer, useValue: { announce } }] });
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('stacks notifications instead of replacing them', () => {
    const service = TestBed.inject(ToastService);
    service.success('Payment recorded');
    service.success('Receipt REC-12 created');
    expect(service.toasts().map(t => t.message)).toEqual(['Payment recorded', 'Receipt REC-12 created']);
  });

  it('auto-dismisses success and info after the timeout', () => {
    const service = TestBed.inject(ToastService);
    service.success('Order placed');
    service.info('Demo data reset');
    vi.advanceTimersByTime(TOAST_AUTO_DISMISS_MS - 1);
    expect(service.toasts()).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(service.toasts()).toHaveLength(0);
  });

  it('keeps errors until dismissed', () => {
    const service = TestBed.inject(ToastService);
    service.error('Scheduling conflict: plate DX-7728 is already booked.');
    vi.advanceTimersByTime(TOAST_AUTO_DISMISS_MS * 10);
    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0].sticky).toBe(true);

    service.dismiss(service.toasts()[0].id);
    expect(service.toasts()).toHaveLength(0);
  });

  it('announces errors assertively and other messages politely', () => {
    const service = TestBed.inject(ToastService);
    service.success('Payment recorded');
    service.error('Payment could not be recorded.');
    expect(announce).toHaveBeenNthCalledWith(1, 'Payment recorded', 'polite');
    expect(announce).toHaveBeenNthCalledWith(2, 'Payment could not be recorded.', 'assertive');
  });

  it('keeps the legacy show(message, isError) signature working', () => {
    const service = TestBed.inject(ToastService);
    service.show('Saved');
    service.show('Failed', true);
    expect(service.toasts().map(t => t.kind)).toEqual(['success', 'error']);
  });

  it('renders each toast with a dismiss button in the stack', () => {
    const service = TestBed.inject(ToastService);
    const fixture = TestBed.createComponent(UiToastStack);
    service.success('Order placed');
    service.error('Network error');
    fixture.detectChanges();

    const toasts = fixture.nativeElement.querySelectorAll('.toast');
    expect(toasts).toHaveLength(2);
    (toasts[1].querySelector('button[aria-label="Dismiss notification"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.toast')).toHaveLength(1);
    expect(fixture.nativeElement.getAttribute('aria-live')).toBeNull();
  });
});

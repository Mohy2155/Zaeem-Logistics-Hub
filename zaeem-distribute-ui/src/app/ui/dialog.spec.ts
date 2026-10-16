import { afterEach, describe, expect, it } from 'vitest';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmService } from './dialog';

@Component({
  standalone: true,
  template: `<button id="trigger" (click)="ask()">Record payment</button>`,
})
class Host {
  private readonly confirmService = inject(ConfirmService);
  result: Promise<boolean> | null = null;
  ask() {
    this.result = this.confirmService.confirm({
      title: 'Record this payment?',
      message: 'The client balance will be reduced.',
      details: [{ label: 'Client', value: 'Build-It Corp' }, { label: 'Amount', value: '$5,000.00' }],
      confirmLabel: 'Record payment',
    });
  }
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0));
const overlay = () => document.querySelector('.cdk-overlay-container') as HTMLElement;
const dialogButton = (text: string) =>
  [...overlay().querySelectorAll('button')].find(b => b.textContent?.trim() === text) as HTMLButtonElement;

describe('ConfirmService', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    overlay()?.remove();
  });

  const openFromTrigger = async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    const trigger = fixture.nativeElement.querySelector('#trigger') as HTMLButtonElement;
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    return { fixture, trigger };
  };

  it('shows the summary and labels the dialog by its title', async () => {
    await openFromTrigger();
    const dialog = overlay().querySelector('[role="alertdialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    const title = document.getElementById(dialog.getAttribute('aria-labelledby')!)!;
    expect(title.textContent).toBe('Record this payment?');
    expect(dialog.textContent).toContain('Build-It Corp');
    expect(dialog.textContent).toContain('$5,000.00');
  });

  it('resolves false on cancel and returns focus to the trigger', async () => {
    const { fixture, trigger } = await openFromTrigger();
    expect(overlay().contains(document.activeElement)).toBe(true);

    dialogButton('Cancel').click();
    fixture.detectChanges();
    await expect(fixture.componentInstance.result).resolves.toBe(false);
    await settle();
    expect(document.activeElement).toBe(trigger);
    expect(overlay().querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('resolves true only on explicit confirmation', async () => {
    const { fixture } = await openFromTrigger();
    dialogButton('Record payment').click();
    await expect(fixture.componentInstance.result).resolves.toBe(true);
  });

  it('treats Escape as cancel', async () => {
    const { fixture, trigger } = await openFromTrigger();
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    fixture.detectChanges();
    await expect(fixture.componentInstance.result).resolves.toBe(false);
    await settle();
    expect(document.activeElement).toBe(trigger);
  });
});

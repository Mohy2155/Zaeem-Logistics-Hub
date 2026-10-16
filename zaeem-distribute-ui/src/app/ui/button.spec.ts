import { afterEach, describe, expect, it } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiButton, UiIconButton } from './button';

@Component({
  standalone: true,
  imports: [UiButton],
  template: `<button ui-button variant="primary" [busy]="busy()" (click)="clicks = clicks + 1">Place order</button>`,
})
class BusyHost {
  busy = signal(false);
  clicks = 0;
}

@Component({
  standalone: true,
  imports: [UiIconButton],
  template: `<button ui-icon-button icon="x" label="Dismiss notification"></button>`,
})
class LabelledIconHost {}

// The compiler already rejects a missing label at build time (NG8008); the runtime template
// override below bypasses that check to prove the component also refuses at runtime.
@Component({ standalone: true, imports: [UiIconButton], template: '<button ui-icon-button icon="x" label="replaced"></button>' })
class UnlabelledIconHost {}

describe('UiButton', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('ignores repeat activation while busy', () => {
    const fixture = TestBed.createComponent(BusyHost);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    button.click();
    expect(fixture.componentInstance.clicks).toBe(1);

    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');

    button.click();
    button.click();
    expect(fixture.componentInstance.clicks).toBe(1);
  });

  it('applies the variant class', () => {
    const fixture = TestBed.createComponent(BusyHost);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button').classList).toContain('ui-btn--primary');
  });
});

describe('UiIconButton', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('exposes its label as the accessible name', () => {
    const fixture = TestBed.createComponent(LabelledIconHost);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Dismiss notification');
    expect(button.querySelector('ui-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('refuses to render without a label', () => {
    TestBed.overrideTemplate(UnlabelledIconHost, '<button ui-icon-button icon="x"></button>');
    const fixture = TestBed.createComponent(UnlabelledIconHost);
    expect(() => fixture.detectChanges()).toThrow(/required/i);
  });
});

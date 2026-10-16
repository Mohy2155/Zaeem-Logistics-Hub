import { afterEach, describe, expect, it } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiControl, UiFormField } from './form-field';

@Component({
  standalone: true,
  imports: [UiFormField, UiControl],
  template: `
    <ui-form-field label="Plate number" hint="As painted on the machine" [error]="error()" required>
      <input uiControl name="plate" />
    </ui-form-field>
  `,
})
class FieldHost {
  error = signal<string | null>(null);
}

describe('UiFormField', () => {
  afterEach(() => TestBed.resetTestingModule());

  const render = () => {
    const fixture = TestBed.createComponent(FieldHost);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    return { fixture, label: el.querySelector('label')!, input: el.querySelector('input')!, el };
  };

  it('associates the label with the control', () => {
    const { label, input } = render();
    expect(input.id).toBeTruthy();
    expect(label.getAttribute('for')).toBe(input.id);
    expect(label.textContent).toContain('Plate number');
    expect(input.getAttribute('aria-required')).toBe('true');
  });

  it('describes the control with its hint', () => {
    const { input, el } = render();
    const hint = el.querySelector('.hint')!;
    expect(input.getAttribute('aria-describedby')).toBe(hint.id);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('links and announces the error when one appears', () => {
    const { fixture, input, el } = render();
    fixture.componentInstance.error.set('Plate DX-7728 is already booked 14–21 Oct.');
    fixture.detectChanges();

    const error = el.querySelector('.error')!;
    expect(error.getAttribute('aria-live')).toBe('polite');
    expect(error.textContent).toContain('already booked');
    expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(error.id);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('gives each field a unique id', () => {
    const a = render().input.id;
    const b = render().input.id;
    expect(a).not.toBe(b);
  });
});

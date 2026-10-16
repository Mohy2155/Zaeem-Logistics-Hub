import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService, resolveTheme } from './theme';

const mockSystemDark = (dark: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: dark && query.includes('dark'), media: query }));

describe('resolveTheme', () => {
  it('follows the OS preference on first visit', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme(null, false)).toBe('light');
  });

  it('prefers an explicit stored choice over the OS preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('ignores unknown stored values', () => {
    expect(resolveTheme('sepia', true)).toBe('dark');
  });
});

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('applies the OS preference on first visit', () => {
    mockSystemDark(true);
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('persists an explicit choice and restores it on the next visit', () => {
    mockSystemDark(true);
    TestBed.inject(ThemeService).set('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    TestBed.resetTestingModule();
    const reloaded = TestBed.inject(ThemeService);
    expect(reloaded.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('still works when storage is blocked', () => {
    mockSystemDark(true);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('blocked'); });

    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('dark');
    expect(() => service.toggle()).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

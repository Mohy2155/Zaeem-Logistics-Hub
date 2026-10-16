import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

/** localStorage key; the pre-boot script in index.html reads the same key. */
export const THEME_STORAGE_KEY = 'zaeem-theme';

/** An explicit stored choice wins; otherwise follow the OS preference. */
export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

function readStoredTheme(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null; // storage blocked (private mode, site data disabled)
  }
}

function systemPrefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(resolveTheme(readStoredTheme(), systemPrefersDark()));

  constructor() {
    this.apply(this.theme());
  }

  /** Switches theme and remembers the choice for future visits. */
  set(theme: Theme): void {
    this.theme.set(theme);
    this.apply(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage blocked: the choice still applies for this session.
    }
  }

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  private apply(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

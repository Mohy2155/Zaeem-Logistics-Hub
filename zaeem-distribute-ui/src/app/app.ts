import { Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, Injector, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { A11yModule } from '@angular/cdk/a11y';
import { filter, map } from 'rxjs';
import { environment } from '../environments/environment';
import { ThemeService } from './services/theme';
import { ConfirmService } from './ui/dialog';
import { IconName, UiIcon } from './ui/icon';
import { UiButton, UiIconButton } from './ui/button';
import { UiToastStack } from './ui/toast-stack';

interface NavItem { path: string; label: string; icon: IconName }
interface NavGroup { label: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  { label: 'Overview', items: [{ path: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' }] },
  {
    label: 'Operations',
    items: [
      { path: '/portal', label: 'New Rental Order', icon: 'clipboard-plus' },
      { path: '/scheduler', label: 'Fleet Schedule', icon: 'calendar-range' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/admin', label: 'Client Ledger', icon: 'users' },
      { path: '/payments', label: 'Payments', icon: 'wallet' },
    ],
  },
];

type Layout = 'mobile' | 'rail' | 'full';

// Application frame: responsive navigation, theme toggle, demo notice and toasts. Pages own their content.
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, A11yModule, UiIcon, UiButton, UiIconButton, UiToastStack],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly theme = inject(ThemeService);
  private readonly confirmService = inject(ConfirmService);
  protected readonly navGroups = NAV_GROUPS;
  protected readonly isDemo = environment.useMockData;

  private readonly breakpoints = inject(BreakpointObserver);
  protected readonly layout = toSignal(
    this.breakpoints.observe(['(min-width: 768px)', '(min-width: 1280px)']).pipe(
      map((state): Layout =>
        state.breakpoints['(min-width: 1280px)'] ? 'full' : state.breakpoints['(min-width: 768px)'] ? 'rail' : 'mobile',
      ),
    ),
    { initialValue: 'full' as Layout },
  );

  /** Rail/full toggle on tablet and desktop; null means "use the default for this width". */
  private readonly railPreference = signal<boolean | null>(null);
  protected readonly collapsed = computed(() =>
    this.layout() === 'mobile' ? false : (this.railPreference() ?? this.layout() === 'rail'),
  );

  protected readonly drawerOpen = signal(false);
  private readonly menuButton = viewChild<string, ElementRef<HTMLButtonElement>>('menuButton', { read: ElementRef });
  private readonly sidebar = viewChild.required<string, ElementRef<HTMLElement>>('sidebar', { read: ElementRef });
  private readonly injector = inject(Injector);

  constructor() {
    // Close the mobile drawer after navigating.
    inject(Router).events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.closeDrawer(false));

    // A manual rail/full choice only lasts until the width class changes.
    effect(() => {
      const layout = this.layout();
      untracked(() => {
        this.railPreference.set(null);
        if (layout !== 'mobile') this.drawerOpen.set(false);
      });
    });
  }

  protected toggleRail(): void {
    this.railPreference.set(!this.collapsed());
  }

  protected openDrawer(): void {
    this.drawerOpen.set(true);
    // Move focus into the drawer once it is visible; the focus trap keeps it there until it closes.
    afterNextRender(() => this.sidebar().nativeElement.querySelector<HTMLElement>('a[href], button')?.focus(),
      { injector: this.injector });
  }

  protected closeDrawer(restoreFocus = true): void {
    if (!this.drawerOpen()) return;
    this.drawerOpen.set(false);
    if (restoreFocus) this.menuButton()?.nativeElement.focus();
  }

  protected skipToContent(event: Event): void {
    event.preventDefault();
    document.getElementById('main-content')?.focus();
  }

  protected async resetDemoData(): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Reset demo data?',
      message: 'All orders, payments and receipts you created in this demo will be deleted and the sample data restored. This only affects this browser.',
      confirmLabel: 'Reset demo data',
      tone: 'destructive',
    });
    if (!confirmed) return;
    try {
      Object.keys(localStorage).filter(key => key.startsWith('zaeem_')).forEach(key => localStorage.removeItem(key));
    } catch {
      // Storage blocked: nothing persisted, so there is nothing to reset.
    }
    window.location.reload();
  }
}

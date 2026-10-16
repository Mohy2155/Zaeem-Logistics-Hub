import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, Routes, TitleStrategy } from '@angular/router';

export const APP_NAME = 'Zaeem Logistics Hub';

/** "<Page> · Zaeem Logistics Hub", or just the app name when a route has no title. */
export function formatPageTitle(pageTitle: string | undefined): string {
  return pageTitle ? `${pageTitle} · ${APP_NAME}` : APP_NAME;
}

@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.title.setTitle(formatPageTitle(this.buildTitle(snapshot)));
  }
}

// Paths are unchanged from earlier releases so bookmarks and GitHub Pages links keep working.
// Pages load lazily, which keeps the PDF/Excel libraries out of the initial bundle.
export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    title: 'Dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'portal',
    title: 'New Rental Order',
    loadComponent: () => import('./pages/portal/portal.component').then(m => m.ClientPortalComponent),
  },
  {
    path: 'scheduler',
    title: 'Fleet Schedule',
    loadComponent: () => import('./pages/scheduler/scheduler.component').then(m => m.SchedulerComponent),
  },
  {
    path: 'admin',
    title: 'Client Ledger',
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminDashboardComponent),
  },
  {
    path: 'payments',
    title: 'Payments',
    loadComponent: () => import('./pages/payments/payments.component').then(m => m.PaymentsComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];

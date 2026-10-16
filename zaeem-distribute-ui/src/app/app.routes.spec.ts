import { afterEach, describe, expect, it } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { AppTitleStrategy, formatPageTitle, routes } from './app.routes';

@Component({ standalone: true, template: '' })
class Blank {}

// Same paths, titles and redirects as the real routes, with a blank page so no feature code loads.
const testRoutes = routes.map(r => (r.loadComponent ? { ...r, loadComponent: undefined, component: Blank } : r));

describe('formatPageTitle', () => {
  it('appends the app name', () => {
    expect(formatPageTitle('Payments')).toBe('Payments · Zaeem Logistics Hub');
  });

  it('falls back to the app name', () => {
    expect(formatPageTitle(undefined)).toBe('Zaeem Logistics Hub');
  });
});

describe('routes', () => {
  afterEach(() => TestBed.resetTestingModule());

  const setup = () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(testRoutes), { provide: TitleStrategy, useClass: AppTitleStrategy }],
    });
    return { router: TestBed.inject(Router), title: TestBed.inject(Title) };
  };

  it('keeps every existing path', () => {
    const paths = routes.map(r => r.path);
    for (const path of ['dashboard', 'portal', 'scheduler', 'admin', 'payments']) expect(paths).toContain(path);
  });

  it('lands on the dashboard from the root and from unknown paths', async () => {
    const { router } = setup();
    await router.navigateByUrl('/');
    expect(router.url).toBe('/dashboard');
    await router.navigateByUrl('/no-such-page');
    expect(router.url).toBe('/dashboard');
  });

  it('updates the tab title on navigation', async () => {
    const { router, title } = setup();
    await router.navigateByUrl('/dashboard');
    expect(title.getTitle()).toBe('Dashboard · Zaeem Logistics Hub');
    await router.navigateByUrl('/payments');
    expect(title.getTitle()).toBe('Payments · Zaeem Logistics Hub');
    await router.navigateByUrl('/portal');
    expect(title.getTitle()).toBe('New Rental Order · Zaeem Logistics Hub');
  });
});

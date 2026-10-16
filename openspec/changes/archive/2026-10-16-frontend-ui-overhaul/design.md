# Design

## Context

See proposal.md (Why) for the motivation. The current state that shapes the approach:

- **Angular 21.2.14**, standalone components, zone.js change detection, `FormsModule` (`ngModel`). All five pages use inline `template`/`styles` and run 300–730 lines each. Global styles are 11 lines (an Inter import and body reset). The shell styles live in `app.scss` and have no breakpoints.
- **Build budgets** (`angular.json`, production): initial bundle warns at 1 MB and errors at 3 MB; each component's styles warn at 4 kB and error at 8 kB. The copied card, table and button styles are the main reason components get near those limits.
- **Two deployment modes** that must both keep working: full stack (`npm start` / `ng build`, real API on :5234) and the GitHub Pages demo (`prod-demo`, base href `/Zaeem-Logistics-Hub/`, mock interceptor on `localStorage`).
- **Business logic already isolated and tested**: `services/company.ts` (API and state), `services/rental-dates.ts` (date, overlap and status rules, 11 vitest tests) and `services/mock-api.interceptor.ts`. The overhaul is presentation-only and must not change their behaviour.
- **Unit tests**: vitest through `ng test` (`@angular/build:unit-test`) with jsdom.

## Goals / Non-Goals

**Goals:**
- One styling foundation (tokens, themes, primitives) that makes the spec'd consistency guarantees cheap to keep.
- Pages built only from shared primitives, with templates and styles in separate files and logic in small, testable units.
- Incremental delivery: the app builds, tests pass and both deployment modes work after every task group.

**Non-Goals:**
- Backend, API or data-model changes, and new business features. In particular, an order-cancellation UI and a server-side price catalog stay out of scope.
- Redesigning the generated PDF/Excel invoice and receipt documents; only the buttons that trigger them are restyled.
- Authentication or a real user profile. The sidebar "Admin User" block becomes a neutral app identity.
- Moving state to signals, migrating to zoneless, or switching to reactive forms. These may happen later; doing them now would mix architecture risk into a visual change.
- Internationalisation or RTL. The styles use logical CSS properties (`margin-inline`, `inset-inline`) so RTL stays possible later.

## Decisions

### D1. In-house design system on CSS custom properties, with Angular CDK for behaviour
Tokens are CSS custom properties defined in `src/styles/tokens.scss`, with a semantic layer (`--color-surface`, `--color-text-muted`, `--color-accent`, and so on) mapped per theme in `src/styles/themes.scss`. Shared primitives live in `src/app/ui/` as standalone components and directives. `@angular/cdk` (21.2.x, the same version as core) provides Dialog, Overlay, FocusTrap, LiveAnnouncer and BreakpointObserver.

- *Alternatives considered:*
  - **Angular Material**: polished, but it looks unmistakably like Material, theming it into a bespoke look is heavy, and it adds bundle weight.
  - **Tailwind**: very fast to style with, but it would rewrite every template into utility-class soup and conflict with the component-style budgets model.
  - **PrimeNG**: large bundle and a dated default theme.
- The CDK gives us accessibility behaviour that is hard to get right (focus trapping, live announcements) without imposing any visual style.

### D2. Theming through a `data-theme` attribute
`ThemeService` sets `data-theme="light|dark"` on `<html>`. The initial value comes from `localStorage` (wrapped in try/catch) and falls back to `prefers-color-scheme`. Semantic tokens switch under `[data-theme=dark]`. An inline script in `index.html` sets the attribute before Angular boots, so the page never flashes the wrong theme.

- *Alternative:* `prefers-color-scheme` media queries only. Rejected because the spec requires a persistent user override.

### D3. Icons: `lucide-angular`
`lucide-angular` (1.0.0, peer range `@angular/core` 13–21) uses tree-shakeable SVG icons registered per component. A thin `<ui-icon>` wrapper enforces `aria-hidden` for decorative icons and requires a label for icon-only buttons.

- *Alternative:* a hand-made SVG sprite. Zero dependencies, but it carries ongoing maintenance and a limited icon set.

### D4. Typography: Inter with tabular numerals
Keep Inter from Google Fonts, adding weight 400–700 and `display=swap`. Numbers in tables and stat cards use `font-variant-numeric: tabular-nums`, which removes every monospace usage. The type scale has seven steps as tokens, from `--text-xs` to `--text-3xl`.

### D5. Page decomposition
Each page becomes a folder with `*.component.ts|html|scss`, plus presentational sub-components where a page has distinct regions:

- **Portal**: `order-form`, `order-summary`, `order-confirmation`.
- **Scheduler**: `timeline-grid`, `booking-details`.
- **Dashboard**: stat cards from `ui/`, plus `deployments-panel` and `utilisation-panel`.
- **Payments**: `payment-form`, `receipt-history`.

Pure view logic, such as the totals breakdown, the scheduler lane packing and ledger sorting/filtering, moves into plain TypeScript functions next to the page, with vitest tests.

### D6. Scheduler lane packing
Within each machine type, bookings are sorted by start date and assigned greedily: each booking goes into the first lane whose last booking ended before it starts, using the inclusive-day semantics of `rental-dates.ts`; otherwise a new lane is opened. Row height is the lane count × lane height. This is optimal for interval partitioning, runs in O(n log n), and is deterministic, so it's easy to test.

### D7. Responsive strategy
There are three breakpoints as tokens: `md` 768px, `lg` 1024px and `xl` 1280px. Layout uses CSS grid and `container`-friendly components. `BreakpointObserver` is used only where behaviour changes (drawer vs rail); everything else is pure CSS. Tables become labelled card lists below `md` through a `ui-data-table` responsive mode, rather than writing separate markup per page.

### D8. Feedback-state pattern
A small `LoadState<T>` (`loading | ready | empty | error`) is derived in each page from the existing service observables (`map` and `catchError`, plus a retry `Subject`). A `<ui-async-view>` primitive renders the skeleton, empty or error slot. `CompanyService` methods that currently swallow errors and return `[]` (for example `getRentals`) get an error-propagating variant for views, while the old signatures stay in place for existing callers.

### D9. Toast stack
`ToastService` changes from a single-slot `BehaviorSubject` to a queue of `{id, kind, message, sticky}`. Success and info toasts auto-dismiss after 5 s; errors are sticky. Announcements go through the CDK `LiveAnnouncer` (`assertive` for errors). The existing `show(message, isError)` signature stays as a compatibility shim, so call sites can migrate gradually.

### D10. Navigation and routing
Route paths are unchanged, so bookmarks and GitHub Pages links keep working. Each route gets `title` data and a custom `TitleStrategy` that formats titles as "<Page> · Zaeem Logistics Hub". The root and wildcard redirects change from `portal` to `dashboard`. The ledger-to-payment shortcut passes `?client=<id>` as a query parameter; it contains no personal data.

### D11. Verification approach
- **Unit tests (vitest)**: the primitives' logic (toast queue, theme resolution), lane packing, totals breakdown, ledger sort/filter and the title strategy.
- **Visual and functional checks**: run each page at 390, 800 and 1440 px, in light and dark themes, against the demo build (static `prod-demo` bundle) and the full-stack build (API + `ng serve`).
- **Accessibility**: Lighthouse accessibility ≥ 95 per page and theme, plus a keyboard-only pass through the order and payment flows.
- **Lint-style guards**, run as small checks in the test suite: grep for raw colour literals outside `src/styles/`, for static `style="` in templates, and for emoji characters.

## Risks / Trade-offs

- [Scope is large and touches every page] → Deliver in independent task groups (foundation → shell → one page per group). Each group ends with build, tests and both deployment modes working. Unmigrated pages keep working because new tokens are added alongside the old styles until the cleanup group.
- [Accidental business-logic regressions while restructuring the portal] → Logic stays in `company.ts` and `rental-dates.ts`. New totals/lane helpers are tested before templates use them, and the order flow is re-run end-to-end in both modes after the portal group.
- [Component style budgets (4 kB warn / 8 kB error)] → Shared styling lives in global `src/styles/` and in primitives. Pages keep only layout styles, and `ng build` budget output is checked in every group.
- [Dark theme contrast gaps] → Semantic tokens are defined in pairs and checked against AA ratios when the tokens are written. Lighthouse runs in both themes.
- [New dependencies (`@angular/cdk`, `lucide-angular`)] → Both are pinned to exact versions compatible with Angular 21.2. The CDK is first-party, and lucide icons are imported individually so only the used icons ship.
- [Theme flash before boot] → An inline pre-boot script sets `data-theme` (D2).
- [Relaxing the `cart-grid-layout` pixel contract] → The modified requirement keeps every alignment guarantee and only removes hard-coded widths in favour of tokens.

## Migration Plan

1. Land the foundation (tokens, themes, primitives) without changing any page; the visuals stay as they are.
2. Swap in the new shell, then migrate pages one at a time, each in its own commit, to keep diffs reviewable.
3. Final cleanup removes the legacy per-component card, table and button styles and the old `app.scss` rules, then adds the lint-style guards.
4. Deploy the demo with `npm run deploy` only after the integration checks pass.
5. **Rollback**: each group is a separate commit on the feature branch, so reverting a group's commits restores the previous UI. No data or API migrations are involved.

## Open Questions

- Exact accent hue and logo mark. The design uses a deep navy base with a single blue accent. A brand colour or logo supplied later only changes token values and one SVG, not the specs or tasks.

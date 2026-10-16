# Tasks

## 1. Dependencies and project setup

- [x] 1.1 Add `@angular/cdk@21.2.14` and `lucide-angular@1.0.0` as exact versions; verify `npm ci` succeeds and `ng build` still passes
- [x] 1.2 Create `src/styles/` (`tokens.scss`, `themes.scss`, `base.scss`, `index.scss`) and wire it as the global stylesheet in `angular.json`; verify `ng build` passes with no visual change on the existing pages

## 2. Design tokens and theming

- [x] 2.1 Define the primitive tokens (colour palette, 7-step type scale, spacing, radius, elevation, motion, breakpoints) and the light/dark semantic tokens; verify every text/background pair meets AA by recording the contrast ratios in a comment table in `themes.scss`
- [x] 2.2 Add the base layer (Inter with `display=swap`, body and text defaults, `tabular-nums` utility, `:focus-visible` ring, reduced-motion overrides); verify in Chrome that emulating reduced motion disables transitions
- [x] 2.3 Implement `ThemeService` (localStorage with try/catch, `prefers-color-scheme` fallback) and the pre-boot inline script in `index.html`; verify with vitest tests for OS-default, persisted choice and blocked storage, and confirm no theme flash on reload

## 3. Shared UI primitives

- [x] 3.1 Build `ui-icon` (lucide wrapper with decorative/labelled modes) and `ui-button` (primary/secondary/ghost/destructive; hover/active/focus/disabled/busy); verify with vitest that a busy button ignores repeat clicks and an icon-only button requires a label
- [x] 3.2 Build `ui-card`, `ui-page-header`, `ui-badge` (fixed status mapping with text label) and `ui-stat-card`; verify by rendering each on a temporary dev-only preview route in both themes, then remove the route
- [x] 3.3 Build `ui-form-field` (label association, helper text, error text linked via `aria-describedby`, invalid state) for input and select; verify with vitest that label `for`/`id` and `aria-describedby` are wired
- [x] 3.4 Build `ui-data-table` (header/row grid, right-aligned numeric columns, sortable headers with `aria-sort`, card mode below 768px); verify with vitest for sort-state attributes and visually at 390px and 1440px
- [x] 3.5 Build `ui-skeleton`, `ui-empty-state` and `ui-async-view` with the `LoadState<T>` helper and retry; verify with vitest that the loading/empty/error/ready slots render for each state and that retry re-subscribes
- [x] 3.6 Build `ui-confirm-dialog` on CDK Dialog (focus trap, Escape, focus restore); verify with vitest that cancel resolves false and that focus returns to the trigger
- [x] 3.7 Rework `ToastService` into a queue (auto-dismiss success/info after 5 s, sticky errors, `LiveAnnouncer` politeness), keeping the `show(message, isError)` shim, and build the `ui-toast-stack`; verify with vitest for stacking, auto-dismiss timing and sticky errors
- [x] 3.8 Document the tokens and primitives (usage, variants, do/don't) in `zaeem-distribute-ui/src/app/ui/README.md`; verify every primitive in `ui/` is listed

## 4. Application shell and navigation

- [x] 4.1 Rebuild the shell: skip link, banner/nav/main landmarks, grouped navigation with icons and `aria-current`, labelled sidebar ≥1280px, icon rail 768–1279px, top bar and off-canvas drawer <768px (CDK BreakpointObserver, focus-managed drawer that closes on navigation); verify at 390, 800 and 1440px and with a keyboard-only pass
- [x] 4.2 Add route `title` data, a `TitleStrategy` that produces "<Page> · Zaeem Logistics Hub", and change the root/wildcard redirects to `/dashboard`; verify with vitest for the title format and manually that all five existing paths still resolve
- [x] 4.3 Add the theme toggle to the shell at all breakpoints; verify that switching re-themes without a reload and persists after a reload
- [x] 4.4 Replace the sidebar reset link with a demo-mode notice and a Reset Demo Data action behind `ui-confirm-dialog`, shown only when `environment.useMockData` is true; verify that the demo build shows it and cancelling changes nothing, and that the full-stack build shows neither
- [ ] 4.5 Mount `ui-toast-stack` in the shell, remove the old toast overlay, and remove the `app.scss` rules it replaced; verify that the success and error toasts from an order and a payment display and stack
- [ ] 4.6 Verify there is no page-level horizontal scroll on every route at 360px and 1440px (`document.documentElement.scrollWidth <= innerWidth`)

## 5. Operations Dashboard

- [x] 5.1 Split the dashboard into `.ts/.html/.scss` with a page header; replace the emoji KPI cards with `ui-stat-card` (icons, supporting context such as "3 of 19 units on hire", neutral receivables colour); verify that the values match the API data in both modes
- [x] 5.2 Build the deployments panel (`ui-data-table`, status badges, sorted by start date, excluding completed/cancelled, View Schedule link) and the utilisation panel (per-type bar with "n of N" text); verify with vitest for the filtering and sorting helper
- [x] 5.3 Wrap the panels in `ui-async-view` with skeleton/empty/error+retry, and apply the responsive grid (4/2/1 cards, panels stacked below 1024px); verify by stopping the API (error and retry) and at 390/800/1440px

## 6. New Rental Order (portal)

- [x] 6.1 Extract a pure totals helper (subtotal, discount, tax, grand total, cent rounding) and a line-preview helper; verify with vitest that the results equal the current portal calculations for discount, tax "None" and rounding cases
- [x] 6.2 Split the portal into `order-form`, `order-summary` and `order-confirmation` sub-components with page header and two-column/sticky layout (stacked below 1024px with a sticky total bar); verify at 390/800/1440px
- [x] 6.3 Rebuild the order form with `ui-form-field` sections (Client, Machinery & Period, Pricing), helper text, line price preview, inline validation and the client lock explanation; verify that every scenario in `specs/order-entry-ui` is reproducible manually and that keyboard-only completion works
- [x] 6.4 Show booking conflicts on the plate field with the conflicting range and its source (existing booking or cart), linked via `aria-describedby`; verify with plate DX-7728 over its seeded dates, and with a duplicate in the cart
- [x] 6.5 Rebuild the order summary to the modified `cart-grid-layout` contract (shared grid, tokenised widths, tabular right-aligned amounts, contained remove action, narrow layout under 360px), with totals breakdown, empty state and a Clear Cart action behind confirmation; verify the alignment at 320px and 1440px
- [x] 6.6 Rebuild the confirmation as a `ui-confirm-dialog`-based success view (invoice number, client, total, Download PDF, Download Excel, New Order), keeping the existing generators; verify that both downloads still produce files with the same content as before
- [x] 6.7 Run the full order flow in both modes (success, 409 conflict keeps the cart and refreshes bookings, default discount persists, tax "None" gives 0%); verify that `ng test` passes and record the result in the PR notes

## 7. Fleet Schedule

- [ ] 7.1 Implement the lane-packing helper per design D6; verify with vitest for overlapping, back-to-back (same lane), contained and window-clipped bookings
- [ ] 7.2 Rebuild the scheduler view (page header, range label, Previous/Today/Next, sticky machine column with horizontal scroll inside the timeline, today column, weekend shading, lanes with auto row height, continuation cues, cancelled bookings hidden); verify with seeded data plus two overlapping test bookings at 390 and 1440px
- [ ] 7.3 Make booking bars focusable buttons that open a `booking-details` dialog (client, machine, plate, dates, days, amount, status badge) with focus restore; verify by keyboard: Tab to a bar, press Enter, press Escape, and confirm focus returns to it
- [ ] 7.4 Wrap the schedule in `ui-async-view` (skeleton, error+retry); verify by stopping the API in full-stack mode

## 8. Client Ledger and Payments

- [ ] 8.1 Extract ledger sort/filter/summary helpers and a credit-balance formatter; verify with vitest for sorting by each column, case-insensitive filtering and the "$606.50 credit" output
- [ ] 8.2 Rebuild the Client Ledger page (`ui-data-table` with sortable columns, filter, totals row, credit labels, per-row Record Payment linking to `/payments?client=<id>`, card mode below 768px, async states); remove the payment form from this page; verify against the API data in both modes
- [ ] 8.3 Rebuild the Payments page: `payment-form` (client preselect from the query param, current and resulting balance preview, "Pay full balance", inline overpayment and non-positive errors) with `ui-confirm-dialog` before submitting, and the success view with receipt number and PDF/Excel downloads (existing generators); verify an overpayment is blocked, cancelling records nothing, and a confirmed payment updates the balance and history without a reload
- [ ] 8.4 Rebuild the receipt history (newest first, client filter, empty state with a Record Payment action, async states) and remove the duplicated balance table from Payments; verify with zero receipts (demo reset) and with several receipts

## 9. Cleanup and guards

- [ ] 9.1 Remove the legacy per-component styles (`glass-card`, `polished-card`, `btn-premium`, `premium-table`, `fadeIn`, and similar) and any unused `app.scss` rules; verify `ng build` reports no budget warnings beyond the current baseline
- [ ] 9.2 Add guard tests to the vitest suite that fail on raw colour literals outside `src/styles/`, static `style="` attributes in templates, and emoji characters in templates; verify they pass and that they fail when a violation is introduced temporarily
- [ ] 9.3 Update the root `README.md` (screens section, theme toggle, demo notice) and `zaeem-distribute-ui/README.md` (UI architecture and the `ui/` primitives); verify the documented commands run as written

## 10. Integration verification

- [ ] 10.1 Run Lighthouse accessibility on Dashboard, New Rental Order, Fleet Schedule, Client Ledger and Payments in light and dark themes against the demo build; verify every score is ≥ 95, then repeat a spot check on the full-stack build
- [ ] 10.2 Do a keyboard-only and screen-reader smoke test (NVDA or Narrator) of the order and payment flows; verify that labels, errors, toasts and dialogs are announced correctly
- [ ] 10.3 Capture screenshots of every page at 390/800/1440px in both themes, in both modes, for the PR; verify there is no horizontal page scroll and no clipped content
- [ ] 10.4 Run `ng build`, `npm run build:demo`, `ng test` and `dotnet build`; verify all succeed, then run `graphify update .`

## Workflow follow-up

- Deploy the demo with `npm run deploy` after review approval.
- Archive the change with `openspec archive frontend-ui-overhaul` once merged, and fill in the new main specs' Purpose sections if the archive leaves placeholders.

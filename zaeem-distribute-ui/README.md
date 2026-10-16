# Zaeem Logistics Hub — web app

The Angular 21 frontend for Zaeem Logistics Hub. It talks to the .NET API in `../ZaeemDistributeSystem` or, in the demo build, to a mock API that keeps its data in the browser. See the [root README](../README.md) for the full-stack setup and the list of screens.

## Commands

| Command | What it does |
|---------|--------------|
| `npm install` | Install dependencies (Node.js 20+). |
| `npm start` | Dev server on http://localhost:4200 against the real API at http://localhost:5234. |
| `npm test` | Unit tests with Vitest (`ng test`), including the design-system guard tests. |
| `npm run build` | Production build into `dist/zaeem-distribute-ui/` (expects the API). |
| `npm run build:demo` | Demo build (`prod-demo`: mock API, demo banner) with the GitHub Pages base path. |
| `npm run deploy` | Demo build published to the `gh-pages` branch. |
| `npm run check:contrast` | Recompute the WCAG contrast table for both themes; fails below AA. |

## How the app is put together

```text
src/
├── index.html            Applies the saved theme before Angular boots (no flash)
├── styles/               Design tokens, light/dark themes, breakpoints and global control styles
└── app/
    ├── app.ts|html       Shell: sidebar navigation (drawer on phones, rail on tablets), skip link,
    │                     demo banner, theme toggle and toast stack
    ├── app.routes.ts     Lazy-loaded pages with page titles ("Payments · Zaeem Logistics Hub")
    ├── ui/               Design-system primitives (buttons, cards, form fields, data table,
    │                     dialogs, async states, toasts…); documented in ui/README.md
    ├── services/         CompanyService (API calls), ThemeService, ToastService, rental date rules,
    │                     fleet catalogue, and the demo mock-API interceptor
    └── pages/
        ├── dashboard/    Key figures, deployments and utilisation (dashboard-summary.ts)
        ├── portal/       New Rental Order: form, order summary, confirmation; pricing and
        │                 validation in order-pricing.ts, invoice files in invoice-export.ts
        ├── scheduler/    Fleet Schedule timeline; lane packing in schedule-layout.ts
        ├── admin/        Client Ledger; sorting, filtering and balances in ledger.ts
        └── payments/     Payment form, receipt view and history; receipt files in receipt-export.ts
```

Conventions:

- **Pages compose primitives.** Visual building blocks live in `src/app/ui/` and are styled only with the tokens in `src/styles/`. If a page needs something new, add a primitive instead of page-local styling. [`src/app/ui/README.md`](src/app/ui/README.md) lists every primitive and its inputs.
- **Logic lives in plain functions.** Pricing, conflict checks, lane packing, ledger sorting and payment validation are pure functions next to their page, each with a `.spec.ts`. Components hold state in signals and stay thin.
- **Every request has four states.** Views wrap requests in `loadState()` and `<ui-async-view>`: skeleton while loading, an empty state, an error with Retry, then the content. Errors are never shown as empty data.
- **Consequential actions are confirmed.** Payments, clearing the cart and resetting demo data go through `ConfirmService`; results are reported with `ToastService`.
- **Guards keep it that way.** `src/app/style-guards.spec.ts` fails the tests on raw colour values outside `src/styles/`, static `style=""` attributes, and emoji in templates.

## Demo mode

`src/environments/environment.prod-demo.ts` turns on `mock-api.interceptor.ts`, which answers API calls from `localStorage` (keys prefixed `zaeem_`), applies the same validation as the API (booking conflicts, payment limits) and seeds sample data on first load. The shell shows a demo banner with **Reset demo data**, which clears only the `zaeem_` keys.

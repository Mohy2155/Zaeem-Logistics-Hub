# Zaeem Logistics Hub — web app

The Angular 21 frontend for Zaeem Logistics Hub. It talks to the .NET API in `../ZaeemDistributeSystem` or, in the demo build, to a mock API that keeps its data in the browser. See the [root README](../README.md) for the full-stack setup and the list of screens.

## Commands

| Command | What it does |
|---------|--------------|
| `npm install` | Install dependencies (Node.js 20+). |
| `npm start` | Dev server on http://localhost:4200 against the real API at http://localhost:5234. |
| `npm test` | Unit tests with Vitest (`ng test`), including the design-system guard tests and the API contract cases run against the demo mock. |
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
    │                     fleet catalogue, and the demo mock API (mock-api.ts, wired in by
    │                     mock-api.interceptor.ts)
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

`src/environments/environment.prod-demo.ts` turns on `mock-api.interceptor.ts`. The interceptor hands API calls to `handleMockRequest` in `services/mock-api.ts` and adds 600 ms of simulated latency. `handleMockRequest` answers from `localStorage` (keys prefixed `zaeem_`) with the API's endpoints, rules and messages, and seeds sample data on first load. The shell shows a demo banner with **Reset demo data**, which clears only the `zaeem_` keys.

### Keeping the demo honest: contract cases

The demo must behave like the real API, and **the real API is the source of truth**. The shared cases in [`../contracts/api-cases.json`](../contracts/api-cases.json) describe each endpoint: starting data, request, expected status, response fields and balance changes. The same file runs in two places:

- `npm test` runs every case against the mock (`src/app/services/mock-api.contract.spec.ts`).
- `dotnet test` in `../ZaeemDistributeSystem` runs every case against the API.

When a case fails here but passes against the API, fix `mock-api.ts` and leave the case alone. To add a case, or change an API rule:

1. Add or update the case in `api-cases.json`.
2. Run `dotnet test` and confirm it passes against the API.
3. Run `npm test` and update the mock until it passes too.

[`../contracts/README.md`](../contracts/README.md) explains the case format and lists the few intentional differences between the API and the mock, such as receipt numbering and payment timestamp zones.

# Zaeem Logistics Hub — web app

The Angular 21 frontend for Zaeem Logistics Hub. It talks to the .NET API in `../ZaeemDistributeSystem` or, in the demo build, to a mock API that keeps its data in the browser. See the [root README](../README.md) for the full-stack setup and the list of screens.

## Commands

| Command | What it does |
|---------|--------------|
| `npm install` | Install dependencies (Node.js 20+). |
| `npm start` | Dev server on http://localhost:4200 against the real API at http://localhost:5234. |
| `npm test` | Unit tests with Vitest (`ng test`), including the design-system guard tests and the API contract cases run against the demo mock. |
| `npm run e2e` | End-to-end tests with Playwright against the demo build (see [End-to-end tests](#end-to-end-tests)). |
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

## End-to-end tests

Playwright tests in `e2e/` (`*.e2e.ts`) drive the app in Chromium the way a user does:

- placing an order and finding it on the confirmation, the Fleet Schedule and the Client Ledger;
- being stopped from double-booking a plate;
- recording a payment with the keyboard alone;
- being stopped from paying more than the balance due.

Each run uses new plate numbers, books a few days from today, and checks balances as before/after differences. Runs never collide with earlier ones or with seed data.

Install the browser once:

```bash
npx playwright install chromium
```

### Demo mode (default)

```bash
npm run e2e
```

This starts the demo build itself (`ng serve --configuration demo`, http://localhost:4300/Zaeem-Logistics-Hub/) and needs no API or SQL Server. Each test starts from fresh browser storage, so the demo data re-seeds every time. CI runs this mode, with two retries and a trace recorded on the first retry.

### Full-stack mode

The same tests run against the dev server (port 4200) and the real API. They place real orders and record real payments, so **point the API at a scratch database**, never your `ZaeemDistribute` one:

```bash
# Terminal 1: the API on a scratch database (created and seeded on startup)
cd ZaeemDistributeSystem
dotnet run --project ZaeemDistribute.Api -- --ConnectionStrings:DefaultConnection="Server=localhost;Database=ZaeemDistribute_E2E;Trusted_Connection=True;TrustServerCertificate=True;"

# Terminal 2: the tests
cd zaeem-distribute-ui
E2E_TARGET=fullstack E2E_ALLOW_FULLSTACK=1 npm run e2e
```

In PowerShell, set the variables with `$env:E2E_TARGET = "fullstack"; $env:E2E_ALLOW_FULLSTACK = "1"` before `npm run e2e`.

`E2E_ALLOW_FULLSTACK=1` is the guard: with `E2E_TARGET=fullstack` alone the run refuses to start. The tests can run any number of times against the same scratch database. When you're done, stop the API and drop the database:

```bash
sqlcmd -S localhost -E -C -Q "ALTER DATABASE [ZaeemDistribute_E2E] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [ZaeemDistribute_E2E]"
```

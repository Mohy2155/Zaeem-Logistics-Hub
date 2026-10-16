# Proposal

## Why

Nothing checks the project automatically. There is no CI workflow, the .NET API has no test project, and the two main user flows (place an order, record a payment) are verified only by hand. The demo build also re-implements the API's business rules in `mock-api.interceptor.ts`, and the two have already drifted:

- `GET /api/companies` returns a plain array, but the mock returns `{ items, totalSystemOutstanding }`.
- The mock has no cancel endpoints, so `DELETE /api/orders/rentals/{id}` and `POST /api/orders/cancel/{id}` quietly "succeed" in the demo.
- The mock skips the API's checks for empty plate numbers, unparseable dates and invalid pricing.

The frontend overhaul is merged, so the code is stable enough to put gates around it before the next feature lands.

## What Changes

- Add a GitHub Actions workflow that runs on every push to `main`, on every pull request, and on demand:
  - frontend unit tests
  - the production build and the demo build
  - the contrast check
  - the .NET build and its tests
  - the end-to-end tests against the demo build

  A pull request shows each of these as a separate check.
- Add an xUnit test project for the API. It runs against a real, throwaway SQL Server database and covers the business rules: input validation, inclusive-date booking conflicts (within an order and against existing bookings, ignoring cancelled ones), billing from line items, payment limits, receipts, and the balance effects of cancelling a rental or an order.
- Add a shared set of API contract cases (request, starting data, expected status and body) that runs against both the real API (xUnit) and the demo mock (Vitest). The mock is brought in line with the API wherever a case fails today. The API is the source of truth.
- Add Playwright end-to-end tests for placing an order (including a booking conflict) and recording a payment (including the confirmation dialog and receipt). They run against the demo build in CI, and locally against the full stack on a scratch database.
- Make the API testable without changing what it does: expose `Program` to the test host, and allow startup seeding to be turned off by configuration.
- Document the new commands in the READMEs.

Non-goals: deployment from CI (publishing stays a manual `npm run deploy`), authentication, the UTC timestamp cleanup, and new product features.

## Capabilities

### New Capabilities
- `continuous-integration`: which checks run automatically, when they run, and how failures are reported on a pull request.
- `api-test-suite`: the automated test coverage the API's business rules must have, and how those tests stay isolated from real data.
- `demo-api-parity`: the guarantee that the demo mock API behaves like the real API, enforced by shared contract cases.
- `end-to-end-tests`: browser tests for the core order and payment flows, in demo mode and against the full stack.

### Modified Capabilities
<!-- None. The contract cases may change mock behaviour to match the API, but no existing spec describes the mock. -->

## Impact

- **New files:**
  - `.github/workflows/ci.yml`
  - `ZaeemDistributeSystem/ZaeemDistribute.Api.Tests/` (xUnit, `Microsoft.AspNetCore.Mvc.Testing`)
  - `contracts/api-cases.json` at the repository root
  - `zaeem-distribute-ui/e2e/`
  - `zaeem-distribute-ui/playwright.config.ts`
  - a solution file so `dotnet build` and `dotnet test` work from `ZaeemDistributeSystem/`
- **API:**
  - `Program.cs` gains `public partial class Program` and a `Seed:Enabled` setting (default on, so `dotnet run` behaves exactly as today).
  - No endpoint behaviour changes.
- **Frontend:**
  - `mock-api.interceptor.ts` is split so its request handling can run in unit tests, and gains the missing validations and cancel endpoints.
  - The mock's `GET /api/companies` returns a plain array like the API. The `items` branch in `company.ts` becomes dead code and is removed.
  - A `demo` serve configuration is added for the end-to-end tests.
- **New dev dependencies:** `@playwright/test` (frontend); xUnit, `Microsoft.AspNetCore.Mvc.Testing` and the .NET test SDK (backend).
- **CI infrastructure:** GitHub-hosted Ubuntu runners with Node 22, .NET 9, and a SQL Server 2022 service container for the API tests.

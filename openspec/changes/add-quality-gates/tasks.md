# Tasks

## 1. API test harness

- [ ] 1.1 Add `ZaeemDistributeSystem/ZaeemDistributeSystem.sln` listing the API project; verify `dotnet build` succeeds from `ZaeemDistributeSystem/`
- [ ] 1.2 Add `public partial class Program;` and a `Seed:Enabled` setting (seeding skipped only when it is `false`; migrations always run) to `Program.cs`; verify `dotnet run` on a fresh scratch database still seeds the three clients and two rentals
- [ ] 1.3 Create the `ZaeemDistribute.Api.Tests` xUnit project (`Microsoft.AspNetCore.Mvc.Testing`, test SDK) and add it to the solution; verify `dotnet test` from `ZaeemDistributeSystem/` discovers and runs a placeholder test
- [ ] 1.4 Add the test host fixture (D1–D3): `ZAEEM_TEST_SQL` with the localhost default, a `ZaeemDistribute_Test_<hex>` database migrated on start and dropped at the end, the `_Test_` name guard, a 60-second first-connection retry, and the sequential test collection; verify a run leaves no `ZaeemDistribute_Test_*` database behind and the real `ZaeemDistribute` row counts are unchanged
- [ ] 1.5 Add the per-test reset and data builders (clients, rentals including cancelled ones, orders); verify with a test that a client inserted in one test is absent in the next, whichever runs first

## 2. API business-rule tests

- [ ] 2.1 Write the order validation tests from `specs/api-test-suite` (no items, blank plate, bad dates, end not after start, negative total or tax, discount out of range, unknown client), each asserting that nothing was stored; verify `dotnet test` passes
- [ ] 2.2 Write the double-booking tests (shared return day with case and whitespace differences, back-to-back, overlap inside one order, cancelled booking frees the plate); verify they pass, and that changing the inclusive check to exclusive makes the shared-return-day test fail (then revert)
- [ ] 2.3 Write the billing and client-list tests (rounding of `1350.004`, plate in capitals, Active status, amount billed and new balance in the response, lifetime billed excluding cancelled rentals, inactive client hidden); verify they pass
- [ ] 2.4 Write the payment tests (zero, negative, overpayment by one cent, unknown client, exact payment to $0.00, receipt first in history with the client name); verify they pass
- [ ] 2.5 Write the cancellation tests (rental cancelled into credit, order cancelled after one line was cancelled, double cancel of each, unknown ids); verify they pass
- [ ] 2.6 Document the backend test command and `ZAEEM_TEST_SQL` in the root README; verify the documented command runs as written from a fresh terminal

## 3. Contract cases and demo mock parity

- [ ] 3.1 Create `contracts/api-cases.json` covering every endpoint and case listed in `specs/demo-api-parity`, plus `contracts/README.md` describing the format (D4) and listing the intentional differences (receipt numbering, payment timestamp zone, half-cent rounding); verify the JSON parses and every endpoint the frontend calls appears in at least one case
- [ ] 3.2 Add the .NET contract runner (one xUnit theory over the cases, file linked with `CopyToOutputDirectory`); verify all cases pass against the API, so the cases describe the API's current behaviour
- [ ] 3.3 Split the mock (D5): move request handling into an exported handler in `services/mock-api.ts` and keep the interceptor as the environment check plus delay; verify the existing unit tests pass and the demo build still places an order and records a payment in the browser
- [ ] 3.4 Add the Vitest contract runner over the same file; verify it runs and record which cases fail against the mock before any fix (expected: the divergences in D6)
- [ ] 3.5 Fix the mock per D6 (plain-array client list, lifetime billed computed from rentals, all order validations in API order, line-total rounding, both cancel endpoints) and remove the `items` branch from `company.ts`; verify every contract case passes in `ng test`, and the dashboard, ledger and payments pages show the same figures as before in the demo build
- [ ] 3.6 Document the contract cases (how to add one, and that the API is the source of truth) in the frontend README; verify the README links to `contracts/README.md`

## 4. End-to-end tests

- [ ] 4.1 Add `@playwright/test`, `playwright.config.ts` (Chromium; demo target on port 4300 by default; `E2E_TARGET=fullstack` on 4200, guarded by `E2E_ALLOW_FULLSTACK=1`; CI retries with traces on the first retry), the `demo` serve configuration, and `npm run e2e`; verify `npm run e2e` starts the demo server and runs a smoke test that opens the dashboard
- [ ] 4.2 Write the place-order test (new per-run plate, dates a few days out; checks the confirmation amount, the schedule bar and the ledger balance delta) and the booking-conflict test; verify both pass in demo mode three runs in a row
- [ ] 4.3 Write the keyboard-only record-payment test (confirmation dialog, focus on the receipt, receipt first in history, ledger balance delta) and the overpayment-blocked test; verify both pass in demo mode three runs in a row
- [ ] 4.4 Run the suite in full-stack mode against the API on a scratch database, twice in a row; verify both runs pass and the developer's `ZaeemDistribute` database is untouched, then drop the scratch database
- [ ] 4.5 Document both end-to-end modes, including the scratch-database API command and the guard variable, in the frontend README; verify the documented commands run as written

## 5. Continuous integration

- [ ] 5.1 Add `.github/workflows/ci.yml` per D8 (triggers, concurrency, read-only permissions, `frontend`, `backend` with the SQL Server 2022 service, and `e2e` with an artifact upload on failure); verify the workflow file passes `actionlint`, or GitHub's workflow validation on push
- [ ] 5.2 Push the branch and open a pull request; verify all three checks run as separate named checks and pass
- [ ] 5.3 Prove each gate: on a throwaway commit, break one unit test, one API test and one end-to-end step; verify each fails only its own check, and the end-to-end failure offers a trace artifact; then drop the commit
- [ ] 5.4 Verify no job deploys or pushes (no `npm run deploy`, no write permissions), add a CI status badge and a "Checks" section to the root README, and verify the badge renders on the pull request's README view

## Workflow follow-up

- After the first green run on `main`, mark `frontend`, `backend` and `e2e` as required checks in the repository's branch protection settings.
- Archive the change with `/opsx:archive` after it is merged.

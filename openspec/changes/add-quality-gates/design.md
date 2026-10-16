# Design

## Context

See proposal.md for motivation. The current state that shapes the approach:

- **API** (`ZaeemDistributeSystem/ZaeemDistribute.Api`, .NET 9):
  - One project, no solution file.
  - `Program.cs` uses top-level statements. On startup it calls `Database.Migrate()` and then seeds clients, products and two rentals.
  - Business rules live directly in `OrdersController` and `CompaniesController`.
  - Order placement uses a `Serializable` transaction for the double-booking check.
  - Money is `decimal`; `GET /api/companies` computes lifetime billed with a SQL `SUM`.
- **Demo mock** (`mock-api.interceptor.ts`):
  - An Angular HTTP interceptor that is active only when `environment.useMockData` is true (the `prod-demo` build).
  - It stores state in `localStorage` (`zaeem_*` keys) and wraps every answer in a 600 ms delay.
  - It keeps a stored `totalBilledToDate` per client, where the API computes it from rentals.
- **Frontend tests:** Vitest through `ng test` with jsdom. `style-guards.spec.ts` already reads files with `node:fs`.
- **Developer database:** SQL Server on `localhost` with Windows authentication. GitHub-hosted runners have no SQL Server, but can run one as a service container.

## Goals / Non-Goals

**Goals:**
- Every rule in `specs/api-test-suite` is exercised through HTTP, the same way the frontend calls it.
- One contract-case file is the single description of API behaviour that both the API and the mock are tested against.
- CI runs in about 10 minutes and needs no repository secrets.

**Non-Goals:**
- Unit-testing controllers in isolation or refactoring business logic into services. These tests go through HTTP so a later refactor can rely on them.
- Code-coverage targets or reports.
- Browsers other than Chromium in the end-to-end tests.
- Branch protection. Requiring the checks before merging is a repository setting the owner turns on (see Migration Plan).

## Decisions

### D1. API tests use a real SQL Server database, not EF InMemory or SQLite
- **Why not EF InMemory:** it is not relational. It does not support the `Serializable` transaction the order endpoint opens, and it cannot run the migrations.
- **Why not SQLite:** it stores `decimal` as text and cannot translate the `SUM` over `decimal` that the client list uses.
- **What we do instead:** tests run against SQL Server, so they exercise the real migrations and queries.
- **Connection:** the server part of the connection string comes from `ZAEEM_TEST_SQL`. It defaults to `Server=localhost;Trusted_Connection=True;TrustServerCertificate=True;`, so a developer's existing setup works. CI sets it to the service container's SQL login.

### D2. One database per run, reset before each test
- **Lifecycle:** a test fixture creates `ZaeemDistribute_Test_<8 hex chars>` once per run, when the API host starts and migrates. It drops the database when the run ends.
- **Reset:** before each test, a helper deletes all rows (receipts, rentals, orders, products, clients, in foreign-key order). It then inserts only the data the test declares.
- **Ordering:** tests run sequentially in one xUnit collection. A per-test database would need a migration per test, which costs seconds each. The suite is small enough that sequential runs stay fast.
- **Guard:** the fixture refuses to run against any database whose name does not contain `_Test_`, so the developer database cannot be wiped by a misconfiguration.

### D3. Tests drive the API through `WebApplicationFactory<Program>`
- **Hosting:** the API runs in-process via `Microsoft.AspNetCore.Mvc.Testing`, with configuration overrides for `ConnectionStrings:DefaultConnection` and `Seed:Enabled=false`.
- **Required API change:** `Program.cs` gains `public partial class Program;` so the test host can reference it.
- **Seeding:** the seed block runs only when `Seed:Enabled` is not `false`. Migrations always run. Behaviour for `dotnet run` is unchanged.
- **Alternative considered:** starting the API as a separate process on a port and testing it over the network. Rejected because it is slower, flakier, and harder to point at a fresh database.

### D4. Contract cases are data, run by a small runner on each side
- **File:** `contracts/api-cases.json` at the repository root. The .NET test project links it into its output with `CopyToOutputDirectory`. The Vitest runner reads it from the repository root with `node:fs`.
- **Each case declares:**
  - `name`
  - `given`: clients and rentals, including cancelled ones
  - `request`: method, path and JSON body
  - `expect`:
    - `status`
    - `body`: partial match on fields
    - `messageStartsWith`
    - `balances`: client name → amount after the request
    - `rentalStatuses`: plate → status
- **Dates:** cases use fixed dates in 2030. No rule under test depends on today's date, so the cases cannot age.
- **.NET runner:** one parameterised xUnit theory. It seeds `given` through the DbContext, sends the request with the factory's `HttpClient`, then asserts the response and re-reads balances and rentals from the database.
- **Vitest runner:** one `it` per case. It writes `given` into `localStorage` in the mock's storage shape, calls the mock handler, and asserts the same expectations.
- **Alternatives considered:**
  - Writing the cases twice, once per language: drifts exactly like the code it is meant to protect.
  - Generating the mock from the API's OpenAPI document: covers shapes but not business rules.

### D5. The mock is split so its handler can run without Angular's HTTP pipeline
- **Split:** `mock-api.interceptor.ts` keeps the interceptor, which checks the environment flag and adds the delay. The request handling moves to an exported function in `mock-api.ts`: `(method, url, body) → { status, body }`. It reads and writes `localStorage` as today.
- **Benefit:** contract tests need neither the environment flag nor fake timers.
- **Alternative considered:** an injection token to switch the mock on in tests and drive it through `HttpClient`. Rejected because the delay and the error mapping would then need fake timers in every test.

### D6. Known divergences, fixed in the mock (the API is unchanged)

| Area | API today | Mock today | After |
|------|-----------|------------|-------|
| `GET /api/companies` shape | plain array | `{ items, totalSystemOutstanding }` | plain array. The `items` branch in `company.ts` is removed. |
| Lifetime billed | computed from non-cancelled rentals | stored counter | computed from rentals |
| Order validation | empty order, blank plate, bad dates, end ≤ start, pricing ranges; empty order checked before the client | end ≤ start only; client checked first | all API checks, in the API's order |
| Line totals | rounded to cents before summing | not rounded | rounded the same way (`Math.round(x * 100) / 100`; see Risks for halves) |
| `DELETE /api/orders/rentals/{id}`, `POST /api/orders/cancel/{id}` | implemented | fall through to a generic success | implemented with the API's rules |

**Intentional differences**, recorded next to the cases and excluded from comparison:
- **Receipt numbering:** both use `REC-<number>`, but the sequences differ. Cases check only the pattern.
- **Payment timestamps:** the mock writes ISO strings with `Z`; the API writes no zone. The frontend already parses both, and the UTC cleanup is out of scope.

### D7. Playwright runs against `ng serve`, with the target chosen by an environment variable
- **Location:** `zaeem-distribute-ui/playwright.config.ts`, tests in `zaeem-distribute-ui/e2e/`, Chromium only.
- **Demo mode (the default):**
  - A new `demo` serve configuration (build target `prod-demo`, base href `/`) on port 4300, started by Playwright's `webServer`.
  - Every test gets a new browser context, so `localStorage` is empty and the mock re-seeds.
- **Full stack (`E2E_TARGET=fullstack`):**
  - Base URL `http://localhost:4200`, with `webServer` running `ng serve` (reusing one already running).
  - The README documents starting the API with a scratch-database connection string first. The API's CORS policy already allows port 4200.
- **Repeatability:**
  - Plates are generated per run: `E2E-<base36 timestamp>-<n>`.
  - Booking dates are a few days from today, so they appear in the schedule's 14-day window.
  - Balance checks compare before and after, never absolute numbers, so repeated full-stack runs pass on the same database.
- **Alternative considered:** serving a static demo build with `http-server`. Rejected because it adds a dependency and a build step, while `ng serve` reuses the existing toolchain.

### D8. One workflow, three parallel jobs
- **Workflow:** `.github/workflows/ci.yml`.
- **Triggers:** `push` to `main`, `pull_request` to `main`, and `workflow_dispatch`.
- **Concurrency:** grouped by workflow and ref, with `cancel-in-progress: true`.
- **Permissions:** `contents: read`.
- **Jobs:**
  - `frontend`: Node 22 with npm cache; `npm ci`, `ng test --watch=false`, `npm run build`, `npm run build:demo`, `npm run check:contrast`.
  - `backend`: .NET 9; SQL Server 2022 service container with a health check through `/opt/mssql-tools18/bin/sqlcmd -C`; `dotnet test ZaeemDistributeSystem` with `ZAEEM_TEST_SQL` set to the container login. The throwaway SA password lives in the workflow file and is not a secret, because the container exists only for the job.
  - `e2e`: Node 22; `npm ci`, `npx playwright install --with-deps chromium`, `npx playwright test`; on failure, upload `playwright-report/` and `test-results/` with `actions/upload-artifact`.
- **Why parallel and independent:** each job reports its own named check, as `specs/continuous-integration` requires. A single serial job would hide later failures behind the first.
- **Solution file:** `ZaeemDistributeSystem/ZaeemDistributeSystem.sln` lists the API and test projects, so `dotnet build` and `dotnet test` work from that folder, locally and in CI.

## Risks / Trade-offs

- **[Risk] SQL Server container slow to start, so the first test fails to connect.** → The service health check gates the job steps. The fixture also retries the first connection for up to 60 seconds.
- **[Risk] Half-cent rounding differs between .NET and JavaScript.** .NET `Math.Round` rounds halves to even; the JavaScript expression rounds them up. → Line totals from the UI are already rounded to cents, so halves do not occur in practice. A contract case pins a sub-cent total (`1350.004`) that both sides round the same way, and the half-cent difference is listed with the intentional differences next to the cases.
- **[Risk] Flaky end-to-end timing from the mock's 600 ms delay and toasts.** → Use Playwright's web-first assertions (`toBeVisible`, `toHaveText`) with no fixed sleeps, and enable retries only in CI (`retries: 2`), with traces on the first retry.
- **[Risk] A developer runs the full-stack end-to-end tests against their real database.** → The full-stack mode refuses to start unless `E2E_ALLOW_FULLSTACK=1` is set, and the README pairs that with the scratch-database command.
- **[Trade-off] Sequential API tests.** Simple and deterministic. If the suite grows past a few minutes, it can move to one database per test class.
- **[Trade-off] The mock gains code (validations, cancel endpoints).** This is the cost of an honest demo; the contract cases keep it from rotting.

## Migration Plan

1. Land the API test project and the API testability changes first. The API's behaviour is unchanged, so this is safe on its own.
2. Land the contract cases, the mock split and the mock fixes, then the end-to-end tests.
3. Land the workflow last, once every job passes locally, so the first CI run is green.
4. After the first green run on `main`, the owner can mark the `frontend`, `backend` and `e2e` checks as required in the branch protection settings.

**Rollback:** delete `.github/workflows/ci.yml` to stop the checks. Every other addition is test-only, apart from the mock fixes, which can be reverted on their own.

# Zaeem-Logistics-Hub: Full-Stack Fleet Workspace

[![CI](https://github.com/Mohy2155/Zaeem-Logistics-Hub/actions/workflows/ci.yml/badge.svg)](https://github.com/Mohy2155/Zaeem-Logistics-Hub/actions/workflows/ci.yml)

Zaeem Distribute is a full-stack commercial equipment rental and logistics management system designed for the heavy construction industry. The application enables B2B clients and equipment suppliers to manage machinery dispatch, calculate tiered rental rates (factoring in, optionally, any discounts and regional VAT), track equipment availability using unique asset identifiers, and process bulk orders with sequential invoicing.

##  Live Production Demo
The frontend client interface is compiled and deployed live. You can interact with the responsive dashboard directly in your browser:
 **[Launch Zaeem Logistics Dashboard](https://mohy2155.github.io/Zaeem-Logistics-Hub/)**

*(Note: The live frontend interface demonstrates UI workflows, form state routing, and responsive dashboard modules. It runs entirely in the browser on demo data kept in `localStorage` (the **Reset Demo Data** button restores it). Clone the repository to run the full stack against the real .NET API and SQL Server database).*

---

## Workspace Architecture

```text
Zaeem-Logistics-Hub/
├── README.md                 <-- System Overview & Developer Guide
├── Project Methodology       <-- Functional Specifications Document
├── contracts/                <-- API contract cases, run against the API and the demo mock
├── ZaeemDistributeSystem/    <-- Backend Server Application (.NET 9)
│   ├── ZaeemDistribute.Api/  <-- Controllers, Models, DTOs and EF Core Migrations
│   └── ZaeemDistribute.Api.Tests/  <-- xUnit tests for the API's business rules
└── zaeem-distribute-ui/      <-- Frontend Client Dashboard (Angular)
    ├── src/                  <-- Reactive View Layers, Forms, and State Routers
    ├── angular.json          <-- Workspace Build Pipelines
    └── package.json          <-- Client App Dependencies
```

 ## System Components

### Frontend Application — `zaeem-distribute-ui`

A responsive administrative dashboard built with **Angular** and **TypeScript**, providing real-time fleet operations management, machinery scheduling, telemetry monitoring, asset allocation workflows, and business reporting through a modern browser-based interface.

### Backend Platform — `ZaeemDistributeSystem`

A high-performance **.NET 9 REST API** powered by **Entity Framework Core** and **Microsoft SQL Server**, responsible for enforcing business rules, transactional integrity, scheduling validation, financial processing, and asset lifecycle management.

---

## Core Technical Solutions

### Double-Booking Prevention Engine

Implements transaction-safe machine allocation using database-level isolation strategies and date-range collision detection. Every scheduling request is validated against active reservations to guarantee conflict-free equipment dispatching.

### Automated Invoicing Pipeline

Generates client-ready invoices by aggregating rental durations, equipment utilization metrics, pricing schedules, and operational billing rules into a structured financial workflow.

### Append-Only Financial Ledger

Maintains a complete audit trail of financial activity through immutable ledger entries, ensuring historical accuracy, traceability, and reconciliation integrity.

### Timesheet Processing Engine

Normalizes field-submitted telemetry logs, work records, and timestamp variations into validated billing data suitable for payroll and invoicing operations.
### Payment Registration and Receipt Generation

Payments received from clients are recorded on the Payments page. The form checks the amount against the client's balance due, a confirmation step shows the resulting balance, and the receipt (receipt number, client, amount, remaining balance) downloads as PDF or Excel.

---

## Screens

| Screen | Route | What it's for |
|--------|-------|---------------|
| Dashboard | `/dashboard` | Units on hire, receivables, fleet utilisation by machine type, and current and upcoming deployments. |
| New Rental Order | `/portal` | Build a multi-item order for one client: per-line pricing preview, booking-conflict warnings as you type, default client discount, VAT/GST/sales tax. Placing the order shows the invoice with PDF and Excel downloads. |
| Fleet Schedule | `/scheduler` | A 14-day timeline per machine type. Overlapping bookings get their own lane; select a booking for its details. |
| Client Ledger | `/admin` | Every client's balance due and lifetime billing, sortable and filterable, with credits labelled. Record payment jumps to Payments with the client selected. |
| Payments | `/payments` | Record a payment (confirmed first) and browse the receipt history. |

The interface works from 360px phones to wide desktops (the sidebar becomes a drawer on small screens), is fully keyboard-operable, and meets WCAG AA contrast in both themes.

**Light and dark themes.** The app follows your operating system's setting until you choose one with the theme toggle in the sidebar (or the top bar on phones); the choice is remembered in the browser.

**Demo notice.** The GitHub Pages build shows a "Demo mode" banner: data lives only in that browser. **Reset demo data** asks for confirmation, then restores the sample data (your theme choice is kept). The full-stack build has no banner.

---

## Running Modes

| Mode | Command (in `zaeem-distribute-ui`) | Data source |
|------|------------------------------------|-------------|
| Local full stack | `npm start` | Real .NET API + SQL Server database |
| Self-hosted production build | `npm run build` | Real .NET API + SQL Server database |
| Demo build without publishing | `npm run build:demo` | Browser-only demo data (`localStorage`) |
| GitHub Pages demo | `npm run deploy` | Browser-only demo data (`localStorage`), no server needed |

Run the frontend unit tests with `npm test` (Vitest, including the design-system guard tests).

The demo build (`prod-demo` configuration) swaps in `environment.prod-demo.ts`, which turns on the mock API interceptor. Every other build talks to the real API at `http://localhost:5234`.

---

## Local Development (Full Stack)

### Requirements
- .NET 9 SDK
- Node.js 20+ and npm
- Microsoft SQL Server (Developer/Express edition or LocalDB)

### 1. Start the API (creates the database automatically)
```bash
cd ZaeemDistributeSystem
dotnet run --project ZaeemDistribute.Api
```
On startup the API creates the `ZaeemDistribute` database if it doesn't exist, applies all EF Core migrations, and seeds sample companies, products and rentals. It listens on http://localhost:5234 (interactive API docs at http://localhost:5234/scalar).

The default connection string in `ZaeemDistribute.Api/appsettings.json` targets a default SQL Server instance on `localhost` with Windows authentication. If your server is different, override it without editing the file:
```bash
# SQL Server Express
dotnet run --project ZaeemDistribute.Api -- --ConnectionStrings:DefaultConnection="Server=localhost\SQLEXPRESS;Database=ZaeemDistribute;Trusted_Connection=True;TrustServerCertificate=True;"
# LocalDB
dotnet run --project ZaeemDistribute.Api -- --ConnectionStrings:DefaultConnection="Server=(localdb)\MSSQLLocalDB;Database=ZaeemDistribute;Trusted_Connection=True;"
```

### 2. Start the frontend
```bash
cd zaeem-distribute-ui
npm install
npm start
```
Open http://localhost:4200.

### 3. Run the API tests
```bash
cd ZaeemDistributeSystem
dotnet test
```
The tests host the API in memory and call it over HTTP. They cover order validation, double-booking, billing, payments and cancellations. Each run creates its own `ZaeemDistribute_Test_<random>` database on your SQL Server and drops it at the end, so the `ZaeemDistribute` database is never read or written. The tests refuse to reset any database whose name lacks `_Test_`.

They use the same local SQL Server as the API (`localhost`, Windows authentication). For another server, set `ZAEEM_TEST_SQL` to a connection string without a database name:
```bash
# SQL Server Express (bash; in PowerShell use $env:ZAEEM_TEST_SQL = "...")
ZAEEM_TEST_SQL="Server=localhost\SQLEXPRESS;Trusted_Connection=True;TrustServerCertificate=True;" dotnet test
# SQL login, e.g. a Docker container
ZAEEM_TEST_SQL="Server=localhost,1433;User Id=sa;Password=<password>;TrustServerCertificate=True;" dotnet test
```
The API's startup seed data can be switched off with `--Seed:Enabled=false`; the tests do this so each test starts from an empty database.

A run that is killed partway, for example with Ctrl+C or by stopping the debugger, can't drop its database. To remove every leftover test database (names matching `ZaeemDistribute_Test_*` only; `ZaeemDistribute` is never touched):
```bash
sqlcmd -S localhost -E -C -Q "DECLARE @sql nvarchar(max) = N''; SELECT @sql += N'ALTER DATABASE ' + QUOTENAME(name) + N' SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ' + QUOTENAME(name) + N'; ' FROM sys.databases WHERE name LIKE N'ZaeemDistribute[_]Test[_]%'; EXEC (@sql);"
```
Don't run it while a test run is in progress.

---

## Checks

Every push to `main`, every pull request into it, and manual runs start [`.github/workflows/ci.yml`](.github/workflows/ci.yml). It runs three independent jobs, each reported as its own check:

| Check | What it runs | Run it locally |
|-------|--------------|----------------|
| `frontend` | Unit tests (including the API contract cases against the demo mock), production build, demo build, WCAG contrast check | `npm test`, `npm run build`, `npm run build:demo`, `npm run check:contrast` in `zaeem-distribute-ui/` |
| `backend` | API build and tests (business rules and contract cases) against SQL Server 2022 in a throwaway container | `dotnet test` in `ZaeemDistributeSystem/` (see [Run the API tests](#3-run-the-api-tests)) |
| `e2e` | Playwright end-to-end tests against the demo build; traces and screenshots are kept as a run artifact when a test fails | `npm run e2e` in `zaeem-distribute-ui/` (see its [README](zaeem-distribute-ui/README.md#end-to-end-tests)) |

A newer push cancels the checks still running for the same branch. The workflow can only read the repository: it never deploys or pushes, so the GitHub Pages demo changes only when someone runs `npm run deploy`.

The demo and the API share one set of contract cases ([`contracts/`](contracts/README.md)), so a change to either side that breaks parity fails a check.

---

## Deploying the GitHub Pages Demo

```bash
cd zaeem-distribute-ui
npm run deploy
```
`npm run deploy` also works from the repository root, which forwards `start`, `test`, `build`, `build:demo` and `deploy` to `zaeem-distribute-ui/` (run `npm install` inside `zaeem-distribute-ui/` first). This builds the `prod-demo` configuration with the `/Zaeem-Logistics-Hub/` base path and publishes `dist/zaeem-distribute-ui/browser` to the `gh-pages` branch. Don't deploy a `production` build to GitHub Pages: it expects the API on `localhost` and has no demo data.

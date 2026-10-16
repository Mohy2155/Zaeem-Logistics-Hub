# Zaeem-Logistics-Hub: Full-Stack Fleet Workspace

This repository houses the complete full-stack workspace for a B2B heavy machinery fleet management and asset tracking platform. The project is engineered as a decoupled monorepo containing a high-throughput server engine and a responsive web application dashboard sitting side-by-side in a unified workspace.

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
├── ZaeemDistributeSystem/    <-- Backend Server Application (.NET 9)
│   └── ZaeemDistribute.Api/  <-- Controllers, Models, DTOs and EF Core Migrations
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

---

## Deploying the GitHub Pages Demo

```bash
cd zaeem-distribute-ui
npm run deploy
```
This builds the `prod-demo` configuration with the `/Zaeem-Logistics-Hub/` base path and publishes `dist/zaeem-distribute-ui/browser` to the `gh-pages` branch. Don't deploy a `production` build to GitHub Pages: it expects the API on `localhost` and has no demo data.

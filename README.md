# Zaeem-Logistics-Hub: Full-Stack Fleet Workspace

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
Added a separate component to record payments received from the partnered companies, with a receipt generated with the company, payment type and receipt number.


---

## Running Modes

| Mode | Command (in `zaeem-distribute-ui`) | Data source |
|------|------------------------------------|-------------|
| Local full stack | `npm start` | Real .NET API + SQL Server database |
| Self-hosted production build | `npm run build` | Real .NET API + SQL Server database |
| GitHub Pages demo | `npm run deploy` | Browser-only demo data (`localStorage`), no server needed |

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

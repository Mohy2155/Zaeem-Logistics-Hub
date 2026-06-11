# Zaeem-Logistics-Hub: Full-Stack Fleet Workspace

This repository houses the complete full-stack workspace for a B2B heavy machinery fleet management and asset tracking platform. The project is engineered as a decoupled monorepo containing a high-throughput server engine and a responsive web application dashboard sitting side-by-side in a unified workspace.

##  Live Production Demo
The frontend client interface is compiled and deployed live. You can interact with the responsive dashboard directly in your browser:
 **[Launch Zaeem Logistics Dashboard](https://mohy2155.github.io/Zaeem-Logistics-Hub/)**

*(Note: The live frontend interface demonstrates UI workflows, form state routing, and responsive dashboard modules. It connects to mock client states as the .NET 8 API server operates within private local development infrastructure).*

---

## Workspace Architecture

```text
Zaeem-Logistics-Hub/
├── README.md                 <-- System Overview & Developer Guide
├── Project Methodology       <-- Functional Specifications Document
├── ZaeemDistributeSystem/    <-- Backend Server Application (.NET 8)
│   ├── src/                  <-- Core Controllers, Services, and Domain Domain
│   └── ZaeemDistribute.sln   <-- Microsoft Visual Studio Solution File
└── zaeem-distribute-ui/      <-- Frontend Client Dashboard (Angular)
    ├── src/                  <-- Reactive View Layers, Forms, and State Routers
    ├── angular.json          <-- Workspace Build Pipelines
    └── package.json          <-- Client App Dependencies
```

 ## System Components

### Frontend Application — `zaeem-distribute-ui`

A responsive administrative dashboard built with **Angular** and **TypeScript**, providing real-time fleet operations management, machinery scheduling, telemetry monitoring, asset allocation workflows, and business reporting through a modern browser-based interface.

### Backend Platform — `ZaeemDistributeSystem`

A high-performance **.NET 8 REST API** powered by **Entity Framework Core** and **Microsoft SQL Server**, responsible for enforcing business rules, transactional integrity, scheduling validation, financial processing, and asset lifecycle management.

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

---

## Deployment Strategy

The Angular frontend is compiled into optimized static assets and deployed to **GitHub Pages** through an automated build pipeline. Production builds are generated from the `zaeem-distribute-ui` workspace and published directly to the repository's deployment branch for public hosting.


# Move into the frontend application directory

```bash
cd zaeem-distribute-ui
```
## Compile production assets and inject the target repository URL path base

```bash
npx ng build --configuration production --base-href="/Zaeem-Logistics-Hub/"
```

## Deploy the generated build artifacts to the remote gh-pages hosting branch
```bash

npx angular-cli-ghpages --dir=dist/zaeem-distribute-ui/browser

```
Local Development Execution Roadmap
To run the complete system environment locally, boot up the independent application components in separate terminal views:

System Requirements
.NET 8.0 SDK or newer

Node.js (v18.x / v20.x recommended) & npm

Microsoft SQL Server (2022 Express or LocalDB context)

1. Database & Server Infrastructure Initialization
Navigate into your backend solution directory to execute framework entity updates and start the listener routing services:

```bash

cd ZaeemDistributeSystem

```
# Construct database structures via migration tracking blocks
```bash
dotnet ef database update --project ZaeemDistribute.Api
```
# Start the local API server process
```bash
dotnet run --project ZaeemDistribute.Api
```

The server framework activates listening tunnels on your local development endpoints (http://localhost:5000).

2. Frontend User Interface Initialization
Open a new separate terminal instance at the workspace root folder to load node dependencies and launch the local compilation server:

```bash
cd zaeem-distribute-ui
```
# Install the necessary npm packages
```bash
npm install
```
# Start the local Angular web server
```bash
npm start
```
Open your browser framework and target http://localhost:4200 to execute tasks within the live application UI.

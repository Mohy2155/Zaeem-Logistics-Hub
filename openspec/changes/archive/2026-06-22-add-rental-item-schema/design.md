## Context

The Zaeem Logistics Hub application contains an ASP.NET Core Web API backend (`ZaeemDistribute.Api`) and an Angular frontend (`zaeem-distribute-ui`). Currently, bulk orders can be placed, and some order item structure is present in DTOs. However, there is no formal schema or API endpoint to query rental items, nor are there frontend pages for monitoring, scheduling, and paying for rentals.

## Goals / Non-Goals

**Goals:**
- Design and register a `RentalItem` entity in the ASP.NET Core backend.
- Expose a `GET /api/orders/rentals` endpoint to return rental records.
- Implement Angular frontend routes and page components for `/dashboard`, `/scheduler`, and `/payments` with a premium glassmorphic UI.

**Non-Goals:**
- Integrating with external machinery tracking IoT hardware.
- Real-time GPS mapping of machinery.

## Decisions

### 1. Database Entity Definition
We will add a new entity `RentalItem` representing a rented machine item.
- `RentalItemId` (Key)
- `MachineId` (int)
- `PlateNumber` (string)
- `StartDate` (DateTime)
- `EndDate` (DateTime)
This will be mapped to a SQL database via Entity Framework Core in `ZaeemDbContext`.

### 2. Backend Controller Endpoint
We will add `GET /api/orders/rentals` to `OrdersController.cs`. It will return all `RentalItem` records mapped to a DTO structure.

### 3. Frontend Angular Page Routing
We will create three new page components:
- `DashboardComponent` (route: `/dashboard`): Premium overview displaying metrics, KPI cards, and visual status.
- `SchedulerComponent` (route: `/scheduler`): Timeline view showing machinery availability and rental windows.
- `PaymentsComponent` (route: `/payments`): Outstanding balance summary and receipt log.
These will be registered in `app.routes.ts` and styled with custom SCSS for a highly aesthetic, responsive user experience.

## Risks / Trade-offs

- **[Risk]** Database schema changes might require migrations that could fail in some environments.
  - *Mitigation*: Provide automated seed logic in the database initialization, and fallback gracefully if migrations are not fully applied.

## Why

Currently, the logistics and distribution system lacks support for tracking and managing rented machinery/order items associated with specific rental timelines. We need a standardized schema for rental items, a dedicated API endpoint to fetch them, and dedicated frontend pages to support dashboard visual displays, scheduling, and payment details.

## What Changes

- Add a schema definition for `RentalItem` / `OrderItem` containing `machineId`, `plateNumber`, `startDate`, and `endDate`.
- Introduce a new API endpoint `GET /api/orders/rentals` to retrieve these rental items.
- Define routing paths in the frontend UI for `/dashboard`, `/scheduler`, and `/payments`.

## Capabilities

### New Capabilities

- `rental-management`: Covers schema definitions for rental items, API endpoint `GET /api/orders/rentals`, and frontend page routes `/dashboard`, `/scheduler`, and `/payments`.

### Modified Capabilities

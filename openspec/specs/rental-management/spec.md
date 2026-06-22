# rental-management Specification

## Purpose
TBD - created by archiving change add-rental-item-schema. Update Purpose after archive.
## Requirements
### Requirement: RentalItem Schema
The system SHALL support a `RentalItem` / `OrderItem` schema representing rented machinery. The schema MUST contain the following fields:
- `machineId` (integer, identifier of the rented machine)
- `plateNumber` (string, license plate number of the machine)
- `startDate` (date/time string, the beginning of the rental period)
- `endDate` (date/time string, the end of the rental period)

#### Scenario: Validate RentalItem schema fields
- **WHEN** a rental item is processed by the system with `machineId`, `plateNumber`, `startDate`, and `endDate`
- **THEN** the schema fields are validated and accepted

### Requirement: GET /api/orders/rentals Endpoint
The backend API SHALL expose a `GET /api/orders/rentals` endpoint to retrieve a list of all rental order items.

#### Scenario: Successfully retrieve rental order items
- **WHEN** a client sends a GET request to `/api/orders/rentals`
- **THEN** the system returns HTTP 200 with a list of all active rental order items

### Requirement: Frontend Page Routing
The frontend UI application SHALL define and support the following separate routed page paths:
- `/dashboard`
- `/scheduler`
- `/payments`

#### Scenario: Navigate to frontend routes
- **WHEN** a user navigates to `/dashboard`, `/scheduler`, or `/payments`
- **THEN** the application resolves the path and renders the corresponding page component


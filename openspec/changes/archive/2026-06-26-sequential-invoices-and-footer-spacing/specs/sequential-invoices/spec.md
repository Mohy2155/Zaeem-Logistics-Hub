## ADDED Requirements

### Requirement: Sequential Invoice IDs
When the API returns a 'INV-PENDING' or missing invoice ID, the system SHALL generate a local, sequential fallback ID instead of a random timestamp.

#### Scenario: Fallback Invoice Generation
- **WHEN** an order succeeds but the response lacks a proper invoice ID
- **THEN** the local frontend MUST assign an ID like `INV-1001` where the number increments sequentially for every new order.

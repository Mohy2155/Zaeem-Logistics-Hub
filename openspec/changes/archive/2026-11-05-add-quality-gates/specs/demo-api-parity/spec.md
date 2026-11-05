# Spec Delta

## Purpose

Guarantees that the GitHub Pages demo, which answers API calls in the browser, behaves like the real API, so the demo never shows behaviour the full app does not have.

## ADDED Requirements

### Requirement: The real API is the source of truth
Where the demo mock API and the real API disagree on status code, response shape, validation or balance effect, the mock SHALL be changed to match the API. Any intentional difference MUST be listed, with its reason, next to the contract cases.

#### Scenario: Divergence found
- **WHEN** a contract case passes against the API and fails against the mock
- **THEN** the mock is corrected; the case is not edited to accept the mock's behaviour

### Requirement: Shared contract cases
A single set of contract cases SHALL describe each API endpoint the frontend uses: the starting clients and rentals, the request, the expected status, and the expected response fields and balance changes. The same cases MUST run against both the real API and the demo mock.

#### Scenario: One case, two targets
- **WHEN** the case "payment larger than the balance" is run
- **THEN** both the API and the mock answer 400 with a message stating the balance, and leave the balance unchanged

### Requirement: Endpoint coverage
The contract cases SHALL cover listing clients, listing rentals, placing an order (success, each validation error, unknown client, booking conflict), recording a payment (success, each validation error, unknown client), listing receipts, cancelling a rental, and cancelling an order.

#### Scenario: Client list shape
- **WHEN** clients are listed
- **THEN** both targets return a plain list of clients with id, name, balance due, default discount and lifetime billed

#### Scenario: Cancelling in the demo
- **WHEN** a rental is cancelled in the demo
- **THEN** its status becomes Cancelled and the client's balance falls by its total, exactly as with the API

#### Scenario: Blank plate in the demo
- **WHEN** an order line with a blank plate number is placed in the demo
- **THEN** the demo answers 400 naming the machine, exactly as the API does

### Requirement: Error shape
For every refused request, both targets SHALL answer with the same HTTP status and a JSON body whose `message` states the reason in the same words.

#### Scenario: Booking conflict message
- **WHEN** an order conflicts with an existing booking of plate DX-7728
- **THEN** both targets answer 409 with a message starting "Scheduling conflict: plate DX-7728"

### Requirement: Parity is checked automatically
The contract cases SHALL run as part of the frontend unit tests (against the mock) and the API tests (against the API), so a change to either side that breaks parity fails the automated checks.

#### Scenario: API change without mock change
- **WHEN** a commit changes an API validation message and leaves the mock alone
- **THEN** the automated checks fail: against the API if the contract case still has the old message, or against the mock if the case was updated

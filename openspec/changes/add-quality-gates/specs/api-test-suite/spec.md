# Spec Delta

## Purpose

Defines the automated test coverage the API's business rules must have (ordering, double-booking, billing, payments and cancellations) and keeps those tests away from real data.

## ADDED Requirements

### Requirement: Isolated test data
API tests SHALL run against a database created for the test run and removed afterwards. They MUST NOT read or write the database named in the API's own configuration, and each test MUST set up the data it relies on instead of depending on startup seed data or on other tests.

#### Scenario: Developer database untouched
- **WHEN** the API tests run on a machine whose `ZaeemDistribute` database holds real data
- **THEN** that database has the same rows after the run as before it

#### Scenario: Order independence
- **WHEN** the tests run in a different order
- **THEN** the same tests pass and fail

### Requirement: Single command
The API tests SHALL run with one documented command from the backend folder, given a reachable SQL Server, and report each failing rule by test name.

#### Scenario: Local run
- **WHEN** a developer with SQL Server running executes the documented test command
- **THEN** the suite builds, runs every API test and prints a pass/fail summary

### Requirement: Order validation coverage
The suite SHALL verify that placing an order is refused with HTTP 400 when it has no items, a blank plate number, unparseable dates, an end date not after its start date, a negative line total or tax, or a discount outside 0–100. It MUST also verify HTTP 404 for an unknown client. A refused order MUST leave the database unchanged.

#### Scenario: End date before start date
- **WHEN** an order line runs from 2026-11-10 to 2026-11-09
- **THEN** the API answers 400 naming the plate, and no order, rental or balance change is stored

#### Scenario: Unknown client
- **WHEN** an otherwise valid order names a client id that does not exist
- **THEN** the API answers 404

### Requirement: Double-booking coverage
The suite SHALL verify that rental periods are inclusive of both end dates. A plate MUST be refused with HTTP 409 when its period overlaps a non-cancelled booking of the same plate, or another line in the same order, comparing plates case- and whitespace-insensitively. A cancelled booking MUST NOT block the plate.

#### Scenario: Shared return day
- **WHEN** plate DX-7728 is booked Nov 1–5 and a new order books " dx-7728 " Nov 5–8
- **THEN** the API answers 409 naming plate DX-7728

#### Scenario: Back-to-back bookings
- **WHEN** plate DX-7728 is booked Nov 1–5 and a new order books it Nov 6–8
- **THEN** the order succeeds

#### Scenario: Overlap inside one order
- **WHEN** one order books the same plate twice with overlapping periods
- **THEN** the API answers 409 and stores nothing

#### Scenario: Cancelled booking frees the plate
- **WHEN** a booking is cancelled and a new order books the same plate for the same days
- **THEN** the order succeeds

### Requirement: Billing coverage
The suite SHALL verify that a successful order adds the sum of its line totals, each rounded to cents, to the client's balance due. Each rental MUST be stored with its plate in capitals and status Active. The response MUST report the amount billed and the new balance.

#### Scenario: Two-line order
- **WHEN** a client owing $1,000.00 places an order with line totals $1,350.004 and $500.00
- **THEN** the response reports $1,850.00 billed and a $2,850.00 balance, and both rentals are listed as Active

#### Scenario: Lifetime billed
- **WHEN** the client list is requested after that order
- **THEN** the client's lifetime billed includes both lines, and excludes any cancelled rental

### Requirement: Payment coverage
The suite SHALL verify that a payment is refused with HTTP 400 when it is zero or negative, or larger than the balance due, and with HTTP 404 for an unknown client. An accepted payment MUST reduce the balance by exactly its amount and create a receipt that appears first in the receipt history with the client's name.

#### Scenario: Overpayment
- **WHEN** a client owing $12,500.00 pays $12,500.01
- **THEN** the API answers 400 stating the $12,500.00 balance, and the balance is unchanged

#### Scenario: Exact payment
- **WHEN** a client owing $12,500.00 pays $12,500.00
- **THEN** the balance becomes $0.00 and the receipt history starts with that payment

### Requirement: Cancellation coverage
The suite SHALL verify that cancelling a rental marks it Cancelled and subtracts its total from the client's balance, which may become a credit. Cancelling an order SHALL cancel all of its rentals and subtract only the amount not already reversed. Repeating either cancellation MUST answer HTTP 400, and an unknown id MUST answer HTTP 404.

#### Scenario: Rental cancelled into credit
- **WHEN** a client owing $0.00 has a $606.50 rental cancelled
- **THEN** the client's balance becomes -$606.50

#### Scenario: Order after a line was cancelled
- **WHEN** an order of two $500.00 lines has one line cancelled and then the whole order is cancelled
- **THEN** the balance falls by $1,000.00 in total, not $1,500.00

#### Scenario: Double cancel
- **WHEN** the same rental is cancelled twice
- **THEN** the second call answers 400 and the balance changes only once

### Requirement: Client list coverage
The suite SHALL verify that the client list contains only active clients, with each client's balance due, default discount and lifetime billed.

#### Scenario: Inactive client hidden
- **WHEN** a client is marked inactive
- **THEN** it does not appear in the client list

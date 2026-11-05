# Spec Delta

## Purpose

Exercises the two flows the business depends on (placing a rental order and recording a payment) in a real browser, in demo mode and against the full stack.

## ADDED Requirements

### Requirement: Place-order flow
An end-to-end test SHALL place an order the way a user does: choose a client, add at least one machine with dates and a plate, place the order, and confirm it. It MUST verify that the confirmation shows the amount billed and that the new booking appears on the Fleet Schedule and in the client's balance on the Client Ledger.

#### Scenario: Order appears everywhere
- **WHEN** the test places a two-day order for an Excavator X3000 with a new plate
- **THEN** the confirmation names the amount billed, the schedule shows the booking, and the client's balance due grows by that amount

### Requirement: Booking conflict flow
An end-to-end test SHALL try to book a plate for days on which it is already booked, and verify that the user is told about the conflict and that no order is placed.

#### Scenario: Conflicting plate
- **WHEN** the test adds a line for a plate and dates that overlap an existing booking
- **THEN** a conflict message naming the plate is shown and the client's balance is unchanged

### Requirement: Record-payment flow
An end-to-end test SHALL record a payment the way a user does: choose a client with a balance, enter an amount, confirm in the dialog, and see the receipt. It MUST verify that the receipt is listed first in the receipt history and that the client's balance falls by the amount paid.

#### Scenario: Payment receipt
- **WHEN** the test pays $100.00 for a client with a balance and confirms
- **THEN** the receipt view shows the payment, the history lists it first, and the ledger shows the balance $100.00 lower

#### Scenario: Overpayment blocked
- **WHEN** the test enters more than the client's balance
- **THEN** the form explains the limit and the payment cannot be submitted

### Requirement: Keyboard-only path
The record-payment test SHALL complete the flow using only the keyboard, from the first focusable element to the receipt.

#### Scenario: No pointer used
- **WHEN** the payment test runs
- **THEN** every step is done with key presses, and focus lands on the receipt after confirming

### Requirement: Two targets
The end-to-end tests SHALL run against the demo build, with no backend and a fresh browser storage per test. The same tests MUST also run locally against the full stack (dev server and API) by setting one documented option. The full-stack run MUST be pointed at a scratch database, never the developer's real one.

#### Scenario: Demo run
- **WHEN** the tests run with the default settings
- **THEN** they start the demo build themselves and pass without SQL Server or the API

#### Scenario: Full-stack run
- **WHEN** a developer starts the API on a scratch database and runs the tests with the full-stack option
- **THEN** the same flows run against the real API and pass

### Requirement: Repeatable results
The end-to-end tests SHALL pass on repeated runs against the same data, without manual cleanup. Each run MUST use plates and dates that cannot collide with earlier runs or with seed data.

#### Scenario: Second run on the same database
- **WHEN** the full-stack tests run twice in a row against the same scratch database
- **THEN** both runs pass

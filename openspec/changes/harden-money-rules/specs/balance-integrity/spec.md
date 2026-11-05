# Spec Delta

## Purpose

Guarantees that when several requests change the same client's balance or the same plate's bookings at once, no change is silently lost, no plate is booked twice, and no request fails with a server error.

## ADDED Requirements

### Requirement: Simultaneous balance changes are never lost
A request that changes a client's balance (recording a payment, cancelling a rental, cancelling an order, placing an order) SHALL succeed only if the balance it started from is still current when it is saved. Otherwise the API MUST answer HTTP 409 with the message "The client's balance changed while this request was being processed. Please try again.", and the request MUST change nothing, including receipts and rental statuses.

#### Scenario: Two payments at the same moment
- **WHEN** a client owing $200.00 has two payments of $100.00 submitted at the same moment
- **THEN** either both succeed and the balance is $0.00 with two receipts, or one succeeds and the other answers 409 and leaves no receipt; the balance never equals $100.00 with two receipts

#### Scenario: Two cancellations of one rental at the same moment
- **WHEN** the same $500.00 rental is cancelled twice at the same moment
- **THEN** one call succeeds, the other answers 400 (already cancelled) or 409, and the balance falls by $500.00 exactly once

#### Scenario: Retrying after a conflict
- **WHEN** a request is refused with 409 for a changed balance and is submitted again
- **THEN** it is judged against the current balance and succeeds if it is otherwise valid

### Requirement: Orders are placed one at a time
The system SHALL handle orders placed at the same moment one after another, so each order's booking check sees every booking made by the orders before it. An order MUST wait its turn rather than fail. If it cannot get its turn within 5 seconds, the API MUST answer HTTP 409 with the message "Another order was being placed at the same time. Please try again." and store nothing.

#### Scenario: Two orders race for one plate
- **WHEN** two orders book plate DX-7728 for the same days at the same moment
- **THEN** one answers 200, the other answers 409 with a message starting "Scheduling conflict: plate DX-7728", and one rental exists for the plate on those days

#### Scenario: Unrelated orders both succeed
- **WHEN** two orders for different plates are placed at the same moment, for the same client or for different clients
- **THEN** both answer 200, and each client's balance rises by exactly what its orders billed

#### Scenario: Waiting too long
- **WHEN** an order cannot get its turn within 5 seconds
- **THEN** the API answers 409 "Another order was being placed at the same time. Please try again." and stores nothing

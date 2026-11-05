# Spec Delta

## MODIFIED Requirements

### Requirement: Order validation coverage
The suite SHALL verify that placing an order is refused with HTTP 400 when it has no items, a blank plate number, unparseable dates, an end date not after its start date, a missing, zero or negative daily rate, a negative tax, or a discount outside 0–100. It MUST also verify HTTP 404 for an unknown client and HTTP 409 for a deactivated client. A refused order MUST leave the database unchanged.

#### Scenario: End date before start date
- **WHEN** an order line runs from 2026-11-10 to 2026-11-09
- **THEN** the API answers 400 naming the plate, and no order, rental or balance change is stored

#### Scenario: Unknown client
- **WHEN** an otherwise valid order names a client id that does not exist
- **THEN** the API answers 404

#### Scenario: Non-positive daily rate
- **WHEN** an order line has a daily rate of -450, of 0, or none at all
- **THEN** the API answers 400 "Invalid pricing for plate <plate>." and nothing is stored

#### Scenario: Deactivated client
- **WHEN** an otherwise valid order names a client marked inactive
- **THEN** the API answers 409 and nothing is stored

### Requirement: Billing coverage
The suite SHALL verify that a successful order adds the sum of its server-computed line amounts, each rounded to cents, to the client's balance due, and that a total supplied in the request is ignored. Each rental MUST be stored with its plate in capitals, its billed amount and status Active. The response MUST report the amount billed, the new balance and each line's billed amount.

#### Scenario: Two-line order
- **WHEN** a client owing $1,000.00 places an order whose lines compute to $2,835.00 and $500.00
- **THEN** the response reports $3,335.00 billed, a $4,335.00 balance and lines of $2,835.00 and $500.00, and both rentals are listed as Active with those amounts

#### Scenario: Supplied total ignored
- **WHEN** an order line carries a total of $1.00 but computes to $2,835.00
- **THEN** the line is billed $2,835.00

#### Scenario: Tax and rounding
- **WHEN** a line computes to 71.3262 before rounding
- **THEN** it is billed $71.33

#### Scenario: Lifetime billed
- **WHEN** the client list is requested after that order
- **THEN** the client's lifetime billed includes both lines, and excludes any cancelled rental

### Requirement: Payment coverage
The suite SHALL verify that a payment is refused with HTTP 400 when it is zero, negative, below one cent, or larger than the balance due after rounding to cents, and with HTTP 404 for an unknown client. An accepted payment MUST reduce the balance by exactly its rounded amount and create a receipt that appears first in the receipt history with the client's name. It MUST verify that a deactivated client can still pay.

#### Scenario: Overpayment
- **WHEN** a client owing $12,500.00 pays $12,500.01
- **THEN** the API answers 400 stating the $12,500.00 balance, and the balance is unchanged

#### Scenario: Exact payment
- **WHEN** a client owing $12,500.00 pays $12,500.00
- **THEN** the balance becomes $0.00 and the receipt history starts with that payment

#### Scenario: Sub-cent payment
- **WHEN** a client pays $0.004
- **THEN** the API answers 400 and no receipt is created

#### Scenario: Fraction rounded
- **WHEN** a client owing $100.00 pays $10.456
- **THEN** the balance becomes $89.54 and the receipt shows $10.46

#### Scenario: Deactivated client pays
- **WHEN** a deactivated client owing $500.00 pays $500.00
- **THEN** the payment is recorded and the balance becomes $0.00

## ADDED Requirements

### Requirement: Concurrency coverage
The suite SHALL verify simultaneous requests by sending them at the same time, not one after another. It MUST cover two orders for the same plate, two orders for different plates, two payments against one balance, and two cancellations of one rental. No test MAY depend on which request wins, and each MUST repeat its scenario enough times in one run that a missing safeguard makes it fail.

#### Scenario: Same plate, same moment
- **WHEN** two orders for the same plate and days are sent together, repeated 10 times with fresh data each time
- **THEN** every repetition has exactly one 200 and one 409 "Scheduling conflict", and exactly one rental exists afterwards

#### Scenario: Different plates, same moment
- **WHEN** two orders for different plates of the same client are sent together, repeated 10 times
- **THEN** every repetition has two 200s and the balance rose by both amounts

#### Scenario: Two payments, same moment
- **WHEN** two payments of $100.00 are sent together to a client owing $200.00, repeated 10 times with fresh data each time
- **THEN** in every repetition each response is 200 or 409, and the balance equals $200.00 minus $100.00 for each receipt created

#### Scenario: Two cancellations, same moment
- **WHEN** the same rental is cancelled twice at the same moment, repeated 10 times with fresh data each time
- **THEN** in every repetition the balance fell by the rental's amount exactly once

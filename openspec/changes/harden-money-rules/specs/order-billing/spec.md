# Spec Delta

## Purpose

Defines how a rental order is priced and billed to a client, so the amount owed always comes from the server's own calculation and never from a total the browser supplies.

## ADDED Requirements

### Requirement: The server prices every line
The system SHALL compute each order line's amount itself from the line's rental days, daily rate, discount percentage and tax percentage, and SHALL NOT use any total supplied in the request. The order's amount is the sum of its line amounts.

#### Scenario: Line priced from its parts
- **WHEN** an order line runs 7 days at a $450.00 daily rate with a 10% discount and 0% tax
- **THEN** the line is billed $2,835.00

### Requirement: Line price formula
Rental days SHALL be the whole calendar days from the start date to the end date. The rate, discount and tax MUST first be rounded to 2 decimals, as they are stored. The discount applies first, then the tax on the discounted amount, and the result is rounded to whole cents, halves up.

#### Scenario: Discount then tax
- **WHEN** an order line runs 3 days at a $100.00 daily rate with a 10% discount and 5% tax
- **THEN** the line is billed $283.50 (300.00, less 30.00, plus 13.50 tax)

#### Scenario: Tax and rounding
- **WHEN** an order line runs 2 days at a $33.33 daily rate with no discount and 7% tax
- **THEN** the line is billed $71.33 (66.66 plus 4.6662 tax, rounded to the cent)

#### Scenario: A supplied total is ignored
- **WHEN** an order line carries a total of $1.00 but its days, rate, discount and tax add up to $2,835.00
- **THEN** the line is billed $2,835.00 and the client's balance rises by that amount

#### Scenario: Free rental as a full discount
- **WHEN** an order line has a $450.00 daily rate and a 100% discount
- **THEN** the line is accepted and billed $0.00, and the rental keeps its $450.00 rate

### Requirement: The response states what was billed
A successful order SHALL answer with the amount billed, the client's new balance due, and a `lines` list giving each line's plate and billed amount in the order the lines were sent. Every rental created by the order MUST store its billed amount.

#### Scenario: Two-line order
- **WHEN** a client owing $1,000.00 places an order whose lines compute to $2,835.00 and $500.00
- **THEN** the response reports $3,335.00 billed, a $4,335.00 balance, and lines of $2,835.00 and $500.00 in that order, and each rental is stored with its own amount

### Requirement: Pricing inputs are validated
An order line MUST be refused with HTTP 400 and the message "Invalid pricing for plate <plate>." when its daily rate is missing, zero or negative, its tax percentage is negative, or its discount is below 0 or above 100. A refused order SHALL leave all stored data unchanged.

#### Scenario: Negative daily rate
- **WHEN** an order line for plate DX-1 has a daily rate of -450
- **THEN** the API answers 400 "Invalid pricing for plate DX-1." and stores nothing

#### Scenario: Missing daily rate
- **WHEN** an order line for plate DX-1 has no daily rate
- **THEN** the API answers 400 "Invalid pricing for plate DX-1." and stores nothing

### Requirement: Deactivated clients cannot be billed
Placing an order for a client who has been deactivated SHALL be refused with HTTP 409 and the message "Company is inactive and cannot be billed." Line validation MUST still run first, and an unknown client MUST still answer 404. Cancelling a deactivated client's rentals or orders SHALL remain allowed.

#### Scenario: Order for a deactivated client
- **WHEN** an otherwise valid order names a client who is marked inactive
- **THEN** the API answers 409 and no order, rental or balance change is stored

#### Scenario: Unknown client unchanged
- **WHEN** an otherwise valid order names a client id that does not exist
- **THEN** the API answers 404 "Company not found."

#### Scenario: Cancelling a deactivated client's rental
- **WHEN** a rental of a client who is now inactive is cancelled
- **THEN** the rental is cancelled and its amount is subtracted from the client's balance

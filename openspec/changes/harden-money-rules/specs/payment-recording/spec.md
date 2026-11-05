# Spec Delta

## Purpose

Defines how a client's payment is accepted and recorded, so every receipt and balance change is an exact amount in whole cents.

## ADDED Requirements

### Requirement: Payment amounts are held to the cent
The system SHALL round a payment amount to whole cents before checking it, with halves rounded up, and SHALL record the rounded amount in both the balance change and the receipt. A payment that rounds to zero or less MUST be refused with HTTP 400 and the message "Payment amount must be greater than zero."

#### Scenario: Sub-cent payment
- **WHEN** a client pays $0.004
- **THEN** the API answers 400 "Payment amount must be greater than zero." and no receipt is created

#### Scenario: Fraction rounded before use
- **WHEN** a client owing $100.00 pays $10.456
- **THEN** the balance becomes $89.54 and the receipt shows $10.46

### Requirement: Overpayment is judged on the rounded amount
A payment larger than the client's balance due, after rounding, SHALL be refused with HTTP 400 and a message stating the balance due, and the balance MUST be unchanged.

#### Scenario: Rounds up to an overpayment
- **WHEN** a client owing $12,500.00 pays $12,500.005
- **THEN** the rounded amount is $12,500.01, the API answers 400 stating the $12,500.00 balance, and the balance is unchanged

### Requirement: Deactivated clients can still pay
A payment from a deactivated client SHALL be accepted under the same rules as any other client, so a client who has stopped renting can settle what they owe.

#### Scenario: Final payment from a deactivated client
- **WHEN** a deactivated client owing $500.00 pays $500.00
- **THEN** the payment is recorded, the balance becomes $0.00 and a receipt is created

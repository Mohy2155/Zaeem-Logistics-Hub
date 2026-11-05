# Spec Delta

## ADDED Requirements

### Requirement: Pricing and rounding parity
The demo mock SHALL compute each order line's amount from days, daily rate, discount and tax, ignore any supplied total, refuse a missing, zero or negative daily rate, return the billed `lines`, and round payments to cents, as the API does. The contract cases MUST cover a supplied total that disagrees with the computed price, discount then tax, a non-positive daily rate, the billed lines, a sub-cent payment, a payment that needs rounding, and a deactivated client's order and payment.

#### Scenario: Supplied total in the demo
- **WHEN** an order line with a supplied total of $1.00 that computes to $2,835.00 is placed in the demo
- **THEN** the demo bills $2,835.00 and returns a line of $2,835.00, exactly as the API does

#### Scenario: Sub-cent payment in the demo
- **WHEN** a payment of $0.004 is recorded in the demo
- **THEN** the demo answers 400 "Payment amount must be greater than zero.", exactly as the API does

#### Scenario: Deactivated client in the demo
- **WHEN** an order is placed in the demo for a deactivated client
- **THEN** the demo answers 409 "Company is inactive and cannot be billed.", exactly as the API does

### Requirement: Concurrency is outside parity
The demo SHALL NOT be required to reproduce the API's handling of simultaneous requests, because it runs for one user in one browser. This difference MUST be listed with its reason next to the contract cases, and no contract case may depend on concurrency.

#### Scenario: Listed difference
- **WHEN** the intentional differences next to the contract cases are read
- **THEN** they state that the 409 for a changed balance and the queueing of simultaneous orders exist only in the API

# Spec Delta

## MODIFIED Requirements

### Requirement: Order placement and confirmation
Placing an order SHALL show a busy state until the server responds. On success the cart is cleared, and a confirmation shows the invoice number, client and the total the server billed, with actions to download the invoice as PDF or Excel and to start a new order. The invoice MUST list each line at the amount the server billed for it. The cart's totals before placing remain an estimate.

#### Scenario: Successful order
- **WHEN** the user places an order and the server accepts it
- **THEN** a confirmation shows the invoice number and total, with Download PDF, Download Excel and New Order actions

#### Scenario: Server amount wins
- **WHEN** the server bills a line one cent differently from the cart's estimate
- **THEN** the confirmation total and the invoice line show the server's amount

## ADDED Requirements

### Requirement: The order request carries no totals
The order request sent to the server SHALL contain each line's machine, plate, dates, daily rate, discount and tax, and MUST NOT contain a line total or a day count.

#### Scenario: Request body
- **WHEN** an order is placed
- **THEN** the posted lines have no `lineTotal` or `rentalDays` field

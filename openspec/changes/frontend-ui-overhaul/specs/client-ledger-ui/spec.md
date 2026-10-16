# Spec Delta

## Purpose

Defines the finance screens: the Client Ledger (route `/admin`) for client balances and lifetime billing, and Payments (route `/payments`) for recording client payments and reviewing receipts. Each piece of financial information has exactly one home.

## ADDED Requirements

### Requirement: Single home for balances
Client balances and lifetime billing SHALL be presented in full on the Client Ledger page only. The Payments page MUST NOT repeat the full balance table; it shows a client's current balance only within the payment form.

#### Scenario: Payments page content
- **WHEN** the Payments page is opened
- **THEN** it shows the Record Payment form and the receipt history, and no standalone client balance table

### Requirement: Client ledger table
The Client Ledger SHALL list each client with name, default discount, balance due and lifetime billed, plus summary totals for balance due and lifetime billed. The list MUST be sortable by name, balance and lifetime billed, and filterable by client name.

#### Scenario: Sort by balance
- **WHEN** the user sorts the ledger by balance due, descending
- **THEN** the client with the largest balance is listed first, and the sort direction is indicated on the column header

#### Scenario: Filter by name
- **WHEN** the user types "swift" in the ledger filter
- **THEN** only clients whose names contain "swift" (case-insensitive) are listed

### Requirement: Credit balances
A negative balance SHALL be presented as a credit in the client's favour, labelled in text (for example "$606.50 credit"), rather than as a negative debt.

#### Scenario: Client in credit
- **WHEN** a client's balance is -606.50
- **THEN** the ledger shows "$606.50 credit" with a Credit label

### Requirement: Ledger to payment shortcut
Each ledger row with a balance due SHALL offer a Record Payment action that opens the Payments page with that client pre-selected.

#### Scenario: Pay from ledger
- **WHEN** the user activates Record Payment on the Build-It Corp row
- **THEN** the Payments page opens with Build-It Corp selected in the payment form

### Requirement: Payment recording form
The payment form SHALL require a client and a positive amount no greater than that client's balance due. It shows the current balance and the balance after payment as the amount is typed, and offers a "Pay full balance" shortcut. Invalid amounts are explained inline and block submission.

#### Scenario: Overpayment blocked
- **WHEN** the user enters $20,000 for a client whose balance is $12,500
- **THEN** the amount field explains it exceeds the $12,500.00 balance, and submission is disabled

#### Scenario: Remaining balance preview
- **WHEN** the user enters $5,000 for a client whose balance is $12,500
- **THEN** the form shows a resulting balance of $7,500.00

### Requirement: Payment confirmation and receipt
After the user confirms a payment and the server records it, the UI SHALL show the receipt number, client and amount, with actions to download the receipt as PDF or Excel. The ledger and receipt history MUST then reflect the new balance and receipt without a manual reload.

#### Scenario: Receipt after payment
- **WHEN** a confirmed payment is recorded successfully
- **THEN** the receipt number is shown with Download PDF and Download Excel actions, and the new receipt appears at the top of the receipt history

### Requirement: Receipt history
The Payments page SHALL list receipts, newest first, with receipt number, client, amount and payment date. It MUST be filterable by client.

#### Scenario: Filter receipts by client
- **WHEN** the user filters the receipt history to Swift Logistics
- **THEN** only Swift Logistics receipts are listed

### Requirement: Narrow-screen ledger presentation
Below 768px, ledger and receipt rows SHALL be presented as stacked cards that show every column's value with its label, instead of a squeezed table.

#### Scenario: Phone ledger
- **WHEN** the Client Ledger is viewed at 390px wide
- **THEN** each client appears as a card listing name, balance due and lifetime billed with labels

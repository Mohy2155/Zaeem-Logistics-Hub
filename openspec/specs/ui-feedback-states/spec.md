# ui-feedback-states Specification

## Purpose
Guarantees that every data view communicates what is happening: loading, empty, failed or updated. Users are never left looking at a blank or misleading screen.

## Requirements

### Requirement: Loading state
While a data view's data is being fetched for the first time, it SHALL show a skeleton placeholder shaped like the content it replaces, not an empty table or zero values.

#### Scenario: Slow network on the ledger
- **WHEN** the client ledger is opened and the companies request has not yet completed
- **THEN** skeleton rows are shown in place of the table body and no "$0.00" values are displayed

### Requirement: Empty state
When a data view loads successfully but has no records, it SHALL show an empty state with a short explanation and, where one exists, an action that leads to creating the first record.

#### Scenario: No receipts yet
- **WHEN** the payments page loads with zero receipts
- **THEN** an empty state explains that no payments have been recorded and offers a Record Payment action

#### Scenario: Empty order summary
- **WHEN** the order summary has no line items
- **THEN** it shows guidance to add machinery from the form, and the place-order action is disabled

### Requirement: Error state with retry
When loading a data view fails, the view SHALL show an inline error state with a plain-language message and a Retry action that re-requests the data. Stale or fabricated data MUST NOT be shown in its place.

#### Scenario: API unreachable
- **WHEN** the dashboard's data requests fail
- **THEN** the affected panels show an error state with a Retry action

#### Scenario: Retry succeeds
- **WHEN** the user activates Retry and the request then succeeds
- **THEN** the panel replaces the error state with the loaded data

### Requirement: Toast notification stack
Results of user actions SHALL be confirmed with toast notifications that stack when several arrive and can be dismissed. Success toasts dismiss themselves automatically; error toasts MUST remain until dismissed.

#### Scenario: Error toast persists
- **WHEN** placing an order fails with a scheduling conflict
- **THEN** an error toast with the server's message stays visible until the user dismisses it

#### Scenario: Multiple toasts
- **WHEN** two notifications are raised in quick succession
- **THEN** both are visible at once, stacked, rather than the second replacing the first

### Requirement: Announced notifications
Toast messages SHALL be announced to screen readers: errors assertively, other messages politely.

#### Scenario: Screen reader hears success
- **WHEN** a payment is recorded successfully
- **THEN** the confirmation message is exposed through a polite live region

### Requirement: Confirmation for consequential actions
Actions that change financial records or discard user data, such as recording a payment, clearing the order cart and resetting demo data, SHALL ask for confirmation in a dialog that summarises the effect. Cancelling MUST leave everything unchanged.

#### Scenario: Confirm payment
- **WHEN** a user submits a payment of $5,000 for Build-It Corp
- **THEN** a dialog summarises the client, amount and resulting balance, and the payment is only recorded after confirmation

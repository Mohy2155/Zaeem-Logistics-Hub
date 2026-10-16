# order-entry-ui Specification

## Purpose
Defines the New Rental Order workspace (route `/portal`): building a multi-item rental order for a client, seeing validation and booking conflicts as you go, reviewing the totals, and getting the invoice once the order is placed.

## Requirements

### Requirement: Workspace layout
The order page SHALL show the order form and the order summary side by side on wide screens, with the summary kept in view while the form scrolls. On viewports below 1024px the summary MUST stack below the form, and a compact total with a jump-to-summary control MUST stay visible.

#### Scenario: Desktop side-by-side
- **WHEN** the order page is viewed at 1440px wide with two items in the cart
- **THEN** the form and the summary are shown side by side, and the summary stays visible while scrolling the form

#### Scenario: Phone stacking
- **WHEN** the order page is viewed at 390px wide
- **THEN** the summary appears below the form, and a sticky bar shows the current total with a control that scrolls to the summary

### Requirement: Sectioned order form
The form SHALL group its fields into labelled sections: Client, Machinery & Period (machine type, start date, end date, plate number) and Pricing (tax type, tax %, trade discount). Each field shows helper text where its rules are not obvious, and the computed line price is previewed before adding.

#### Scenario: Line price preview
- **WHEN** a client, machine type and valid dates are selected
- **THEN** the form shows the number of rental days and the line total that will be added, including discount and tax

### Requirement: Inline validation
The form SHALL validate as the user goes and show each problem next to the field that causes it: missing client, end date not after start date, discount outside 0–100, negative tax. The add action MUST stay disabled while any problem remains.

#### Scenario: End date before start date
- **WHEN** the user picks an end date earlier than the start date
- **THEN** the end date field shows an error explaining the end date must be after the start date, and Add to Order is disabled

### Requirement: Booking conflict feedback
When the entered plate is already booked during an overlapping period (in existing rentals or in the current cart), the plate field SHALL show the conflicting dates and their source (an existing booking or the cart). The item MUST NOT be addable until the conflict is resolved.

#### Scenario: Conflict with an existing rental
- **WHEN** the user enters plate "DX-7728" for dates that overlap its existing booking
- **THEN** the plate field reports that the plate is already booked and shows the booked date range

#### Scenario: Server-side conflict on placement
- **WHEN** placing the order is rejected by the server because of a conflict
- **THEN** the server's message is shown, the cart is kept intact, and existing bookings are refreshed

### Requirement: Client selection lock
Once the cart contains items, the client selector SHALL be locked, and it MUST explain that the cart must be cleared to change client. A Clear Cart action MUST be available and confirmed before it runs.

#### Scenario: Change client with items in cart
- **WHEN** the cart has items and the user focuses the client selector
- **THEN** the selector is locked and its helper text explains how to change client

### Requirement: Order summary
The summary SHALL list each line item with machine, plate, rental period and line amount, plus a per-line remove action. Below the items it shows subtotal, discount, tax and grand total, and the Place Order action.

#### Scenario: Remove a line item
- **WHEN** the user removes one of three line items
- **THEN** the item disappears from the summary and all totals update immediately

#### Scenario: Totals breakdown
- **WHEN** the cart contains items with discounts and tax
- **THEN** the summary shows the subtotal before discount, the total discount, the total tax and a grand total equal to the sum of the line amounts

### Requirement: Order placement and confirmation
Placing an order SHALL show a busy state until the server responds. On success the cart is cleared, and a confirmation shows the invoice number, client and total, with actions to download the invoice as PDF or Excel and to start a new order.

#### Scenario: Successful order
- **WHEN** the user places an order and the server accepts it
- **THEN** a confirmation shows the invoice number and total, with Download PDF, Download Excel and New Order actions

### Requirement: Preserved pricing behaviour
The overhaul SHALL preserve existing order rules: the client's default discount pre-fills and persists between items, tax type "None" forces 0% tax, plates are normalised (trimmed, upper-case), and amounts are rounded to cents.

#### Scenario: Default discount persists
- **WHEN** a client with a 10% default discount is selected and an item is added
- **THEN** the discount field still shows 10% for the next item

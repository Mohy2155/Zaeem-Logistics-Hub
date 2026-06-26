## Why

The cart total UI text is currently bunched too closely to the "Process Bulk Order" button, reducing readability. Additionally, the fallback invoice IDs are generated randomly using a timestamp (`new Date().getTime()`), which causes disorganization and violates the requirement for sequentially numbered invoices.

## What Changes

- Add a bottom margin to the `grand-total-row` inside the cart summary to visually separate the text from the checkout button.
- Refactor the fallback invoice ID generation logic to utilize a persistent sequential counter (via `localStorage`) instead of a random timestamp.

## Capabilities

### New Capabilities
- `sequential-invoices`: Fallback invoices use a sequential counter to maintain chronological ordering.
- `footer-spacing`: Improved visual spacing between the cart totals and the checkout button.

### Modified Capabilities

## Impact

- `portal.component.ts` (UI styling and invoice generation logic update).

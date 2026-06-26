## 1. UI Spacing

- [x] 1.1 Add an inline style (`margin-bottom: 1rem;`) to the `.grand-total-row` div inside `portal.component.ts` to separate it from the bulk order button.

## 2. Invoice Generation

- [x] 2.1 Locate the `processBulkOrder` method in `portal.component.ts`.
- [x] 2.2 Replace the fallback timestamp logic (`new Date().getTime()`) with a sequential counter driven by `localStorage` (defaulting at 1000 if not set). Increment the counter and save it back to `localStorage` before assigning it to the invoice string.

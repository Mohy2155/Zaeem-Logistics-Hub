## Why

The UI formatting for the cart rows in the portal component is currently tightly compressed, misaligned with the headers, and lacks proper column boundaries. This creates visual clutter, especially when long text strings (like machine names and discount tags) crowd into the pricing and remove button fields. Refactoring to a CSS Grid will ensure clean tabular alignment.

## What Changes

- Refactor the cart summary list HTML structure to remove standard implicit flow layouts in favor of an explicitly controlled tabular grid.
- Introduce a CSS Grid (`display: grid; grid-template-columns: 1fr 120px 100px; align-items: center; gap: 1rem;`) for exact columnar alignment across both `thead` header rows and `tbody` item rows.
- Add safety padding (`padding-right: 1.5rem`) to the equipment description column to prevent text clipping.
- Force right-aligned vertical baselines for the 'Amount' header and pricing fields.
- Securely lock the 'Remove' action buttons into a defined rightmost column boundary (`100px`) and expand their width internally (`width: 100%`) to prevent adjacent elements from shifting them.

## Capabilities

### New Capabilities
- `cart-grid-layout`: A fully responsive and perfectly aligned order summary cart layout based on CSS Grid.

### Modified Capabilities

## Impact

- `portal.component.ts` in the `zaeem-distribute-ui` project.
- Visual updates only; no API or business logic changes.

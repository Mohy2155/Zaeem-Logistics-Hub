## Context

The UI formatting for the cart rows in the portal component was tightly compressed and misaligned because it relied on standard table layout rendering inside flex containers or without explicit column constraints.

## Goals / Non-Goals

**Goals:**
- Replace the legacy layout with an explicitly constrained CSS Grid to ensure pixel-perfect tabular alignment.
- Guarantee text safety margins for dynamic strings (machine names, discounts, VAT tags).
- Lock numerical values to right-aligned vertical baselines.
- Isolate functional buttons in fixed boundaries.

**Non-Goals:**
- Do not alter the overarching component logic, scheduling validations, or export handlers.
- Do not change any backend data structures.

## Decisions

- **CSS Grid over Flexbox:** Flexbox handles 1D spacing well but CSS Grid guarantees perfectly mirrored column dimensions across disconnected `thead` and `tbody` row elements without relying on global table flow constraints. 
- `grid-template-columns: 1fr 120px 100px;` was chosen to let the description consume maximum space while locking the price to `120px` and the button to `100px`.

## Risks / Trade-offs

- **Risk:** Browser compatibility for CSS Grid.
  **Mitigation:** Grid is universally supported in modern browsers, which aligns with our target constraints.

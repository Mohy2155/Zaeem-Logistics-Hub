## 1. Refactor Table Base Constraints

- [x] 1.1 Convert the existing `table`, `thead`, and `tbody` elements inside `portal.component.ts` to block display layouts with full widths (`width: 100%; display: block;`).

## 2. Refactor Row Grids

- [x] 2.1 Apply an explicit CSS Grid definition (`display: grid; grid-template-columns: 1fr 120px 100px; align-items: center; gap: 1rem;`) to both the `thead > tr` and `tbody > tr` container elements.

## 3. Apply Internal Padding and Alignment

- [x] 3.1 Insert a right safety margin (`padding-right: 1.5rem;`) into the primary equipment description cells (`td`) to prevent the text boundaries from clipping.
- [x] 3.2 Add `text-align: right;` constraints to the numerical 'Amount' header and corresponding item pricing cells to force a unified vertical decimal baseline.
- [x] 3.3 Secure the red 'Remove' buttons inside the rightmost column boundary by defining their internal widths to `width: 100%;` of their containing cell.

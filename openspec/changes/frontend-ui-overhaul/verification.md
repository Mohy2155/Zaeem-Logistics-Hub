# Verification notes (for the PR description)

Results of the manual and automated checks run while applying this change. Full-stack checks ran against a scratch database (`ZaeemDistribute_UiVerify`, dropped afterwards), never the developer database.

## Group 4 – Application shell
- Mobile drawer (390px): focus moves into the drawer, stays inside it, Escape returns focus to the menu button, navigating closes it and sets `aria-current`.
- Skip link is the first Tab stop and moves focus to `<main>`; landmarks: banner, navigation, main.
- Layout switches at 768px and 1280px; a manual rail/full choice resets when the width class changes.
- Theme toggle re-themes without reload and persists across reloads.
- Demo build shows the demo notice; Reset Demo Data is confirmed first, Cancel keeps all data, confirming clears only `zaeem_` keys (the theme choice survives). The full-stack build shows no notice.
- Toasts stack; success auto-dismisses after 5 s, errors stay until dismissed (seen with an order success plus a scheduling-conflict error).
- Initial bundle 1.95 MB → 465 kB (pages are lazy-loaded).

## Group 5 – Dashboard
- Demo: 2 on hire of 19 units (11%), $97,500.00 receivables, 2 of 3 clients with a balance.
- Full stack: figures matched the API exactly ($34,269.90 receivables, 0 units on hire, empty deployments panel).
- API stopped → "Couldn't load dashboard data" with Retry; Retry after starting the API loads the data.
- 4/2/1 stat cards and stacked panels below 1024px checked at 390, 800 and 1440px.

## Group 6 – New Rental Order
- `ng test`: 78 tests passing (12 files), including parity of the new pricing helper with the previous portal formula (discount, tax "None", rounding) and content checks of the generated Excel and PDF invoices.
- The invoice generators were moved verbatim (line-by-line diff of the bodies: identical apart from `this.x` → `order.x`).
- Conflict feedback: DX-7728 over its seeded dates reports "already booked from Oct 14, 2026 to Oct 21, 2026" on the plate field (via `aria-describedby`), and a duplicate of a cart line reports "already in this order"; Add stays disabled in both cases.
- Inline validation: end date before start, missing fields (after the field is visited), discount outside 0–100 and negative tax; Add disabled while any remain.
- Client lock with explanation once the cart has items; Clear Cart is confirmed, and Cancel keeps the cart.
- Default discount pre-fills and carries over to the next line (Build-It 10%, Swift 15%, Mega 5%); tax type "None" forces and locks 0%.
- Order flow, demo build: success shows the confirmation (invoice, client, total, PDF, Excel, New order); a 409 from the mock API keeps the cart, shows the server message and refreshes bookings.
- Order flow, full stack: success billed the client on the server (Build-It $12,500.00 → $16,070.75 for a $3,570.75 order, invoice INV-1002 from the API, "None" line stored at 0%). A 409 (same plate booked through the API meanwhile) kept the cart, showed the server's message, refreshed bookings, and billed nothing.
- Keyboard-only: client → machine → dates → plate → Enter adds the line → Tab to Place order → Enter → confirmation; after closing it, focus returns to Machine type.
- Layout: side by side with a sticky summary at 1440px; stacked with a sticky total bar and working "Review order" at 800 and 390px; at 320px the cart switches to its narrow layout with no horizontal overflow.

## Group 7 – Fleet Schedule
- `schedule-layout.spec.ts` (9 tests): overlapping bookings get separate lanes, back-to-back bookings share one, starting on another's end day counts as overlap (inclusive end dates), contained bookings and lane reuse, order independence, window clipping with continuation flags, cancelled and out-of-window bookings dropped.
- Seeded data plus two overlapping test bookings (scratch database): the Excavator X3000 row grows to 2 lanes; DX-7731 and DX-7735 run back to back in the second lane; DX-7728 shows a "starts before" cue, DX-7735 a "continues after" cue. Today's column is marked and weekends shaded, in both themes.
- Previous/Next move by 14 days with the range label updating (Oct 16 – Oct 29 → Oct 30 – Nov 12 → Nov 13 – Nov 26); Today returns to the default window and is disabled there.
- 390px: no page overflow; the timeline scrolls inside its box while the machine column stays pinned, and bar labels stay readable beside it.
- Keyboard: Tab reaches a bar (its label names client, machine, plate, dates, status and continuation), Enter opens the booking details (status badge, client, machine, plate, dates, days, amount), Escape closes them and focus returns to the bar.
- API stopped → "Couldn't load the schedule" with Retry (no misleading booking count); Retry after restarting the API loads the bookings.

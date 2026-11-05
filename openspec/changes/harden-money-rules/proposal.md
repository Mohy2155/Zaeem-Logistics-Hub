# Proposal

## Why

A backend audit found places where the API can record the wrong amount of money, even though the individual rules fixed in `d8e4706` are sound:

- **The browser sets the line total.** `POST /api/orders/place-bulk-order` bills the sum of each line's client-sent `lineTotal`. A line with a $450 daily rate for 7 days and `lineTotal: 1` bills the client $1. The tests send arbitrary totals (for example `1350.004` for a 2-day line), so nothing notices. A missing daily rate silently becomes $0.
- **Simultaneous balance changes overwrite each other.** Recording a payment, cancelling a rental and cancelling an order each read the balance, change it in memory and save it. Two payments of $100 on a $200 balance can both save `$100`, leaving two receipts and only $100 deducted.
- **Simultaneous orders deadlock.** Order placement checks bookings under a `Serializable` transaction. With no index on the plate number, that check locks the whole rentals table, so any two orders placed at the same moment can deadlock and one fails with a server error, even for unrelated plates and clients.
- **Fractions of a cent are accepted as payments.** A payment of `0.004` passes the `> 0` check and is then rounded away by the 2-decimal column.
- **A deactivated client can still be billed** by calling the API directly, because only the client list hides them.
- **The order confirmation and invoice show the browser's estimate, not the bill.** The confirmation dialog and the PDF/Excel invoice use the cart's preview total, never the amount the server billed.

The business rules are about to carry real users and real accounts, so these gaps need closing first.

## What Changes

- **Server-side line pricing.** The API works out each line's price itself from days, daily rate, discount and tax, in whole cents. The request no longer carries `lineTotal`; one that still sends it is accepted and the field ignored. A missing, zero or negative daily rate is refused. A free or promotional rental is a 100% discount.
- **The order response lists what was billed per line.** The confirmation dialog and the invoice are built from the server's figures; the cart keeps its live preview as an estimate.
- **Orders take turns.** Order placement queues on a database lock, so a later order always sees the bookings of the one before it. Two orders for the same plate give one success and one "Scheduling conflict"; unrelated orders both succeed. No deadlocks.
- **Balance changes can no longer overwrite each other.** A change to a client's balance made from a stale copy is refused with HTTP 409 and a message to try again, instead of silently losing an update.
- **Payment amounts are held to the cent.** A payment is rounded to cents before it is checked, so a sub-cent payment is refused as zero.
- **Deactivated clients cannot be billed but can still pay**, because a client who stops renting may still owe money. Cancelling their rentals and orders stays allowed.
- **Tests** for every rule above, including tests that send requests at the same moment, in the API suite and the shared contract cases. The demo mock follows the API: it prices lines itself, returns the billed lines and rounds payments. Concurrency is not mirrored in the mock, which has one user.
- The completed quality-gates change (`add-quality-gates`) is archived on this branch.

Non-goals:
- **The server still trusts the daily rate, discount and tax the browser sends.** There is no server-side price list yet; it arrives with `manage-machines`, when each account owns its fleet and the server looks up the rate.
- Linking rentals to clients by ID, indexes and dropping unused tables (the next change, `clean-up-data-model`). Until then, cancelling a rental whose client name matches no client still changes no balance.
- A "free / promo rental" shortcut in the order form (frontend work).
- Authentication and accounts, the UTC timestamp cleanup, changing how rental days are counted, and limits on extremely large amounts.

## Capabilities

### New Capabilities
- `order-billing`: how an order is priced and billed. The server computes line prices, refuses a missing or non-positive rate, reports what it billed per line, and refuses to bill a deactivated client.
- `payment-recording`: payment amounts are held to the cent, and a deactivated client can still pay.
- `balance-integrity`: changes to a client's balance and to plate bookings made at the same moment never lose an update, never double-book and never fail with a server error.

### Modified Capabilities
- `api-test-suite`: order-validation, billing and payment coverage change (line amounts are computed, not supplied; rates must be positive; payments are rounded), and concurrency coverage is added.
- `demo-api-parity`: the demo mock must price lines, report billed lines and round payments exactly as the API does, and the intentional differences gain concurrency.
- `order-entry-ui`: the confirmation and invoice show the amounts the server billed.

## Impact

- **API:** `OrdersController.cs` (pricing, rate check, inactive-client check, order lock, per-line response), `CompaniesController.cs` (payment rounding), `OrderResultDto.cs` (billed lines), `Company.cs` plus one migration (a row version), a new exception handler registered in `Program.cs`.
- **Request and response contract:** `lineTotal` is removed from order lines (ignored if sent). The order response gains `lines`, one billed amount per line in request order. Callers can now receive 409 for a changed balance.
- **Frontend:** `services/company.ts` sends only the request fields, `portal.component.ts` builds the confirmation and invoice from the response, `services/mock-api.ts` prices lines, returns `lines` and rounds payments. The cart preview formula is unchanged.
- **Contract cases:** `contracts/api-cases.json` and `contracts/README.md` (rounding note, concurrency difference).
- **Tests:** the API test project, frontend unit tests and the Vitest contract runner. The Playwright order test should pass unchanged.
- **Dependencies:** none.

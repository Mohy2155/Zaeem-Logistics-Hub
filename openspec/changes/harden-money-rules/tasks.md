# Tasks

Each group changes the API, its tests, the contract cases and the demo mock together, so `dotnet test` and `npm test` stay green after every group.

## 1. Server-side line pricing

- [x] 1.1 Delete `LineTotal` from `OrderItemDto`, add `PriceLine` with the inputs rounded to 2 decimals (D1), bill and store the computed amounts, and refuse a daily rate of 0 or less with "Invalid pricing for plate X."; verify `dotnet build` passes from `ZaeemDistributeSystem/`
- [x] 1.2 Change `ApiCollection.Line(...)` to take a `dailyRate` instead of a `lineTotal`. Rewrite the callers: tests that passed 1350, 500 or 750 for a 2-day line use rates 675, 250 and 375, so their assertions stay. Rewrite `Order_bills_the_sum_of_its_line_totals_rounded_to_cents` (`BillingTests.cs`) to the spec's two-line example, with new expected figures. Verify the API tests other than `ContractTests` pass
- [x] 1.3 Add API tests from `specs/order-billing`: line priced from its parts, discount then tax (283.50), tax and rounding (71.33), supplied total ignored, free rental at 100% discount keeps its rate, negative, zero and missing rate refused with nothing stored. Verify they pass, and that billing the supplied total again makes "supplied total ignored" fail (then revert)
- [x] 1.4 In `contracts/api-cases.json`, replace the 1350.004 billing case with a priced two-line case, and replace the negative-line-total case with negative and zero daily-rate cases. Add cases for a supplied total that disagrees and for discount then tax, avoiding exact half cents. Rewrite the half-cent rounding note in `contracts/README.md` for the new rule (D1, Risks). Verify `ContractTests` passes against the API
- [x] 1.5 Update `mock-api.ts` to price each line with `priceLine`, ignore `lineTotal` and refuse a daily rate of 0 or less; verify the Vitest contract runner passes every case in `npm test`

## 2. Billed lines in the response and the order documents

- [x] 2.1 Add `[NotMapped] Lines` (`PlateNumber`, `Amount`, in request order) to `OrderResultDto` and fill it in `PlaceBulkOrder` (D2); add the `lines` assertions to the two-line test; verify `dotnet test` passes and `dotnet ef migrations has-pending-model-changes` reports none
- [x] 2.2 Add `lines` to the order success contract case and return it from the mock; verify both contract runners pass
- [x] 2.3 Make `CompanyService.placeBulkOrder` post only the request fields (D2), with a unit test using `HttpTestingController` asserting the posted lines have no `lineTotal` or `rentalDays`; verify `npm test` passes
- [x] 2.4 Build the confirmation and invoice from the response in `portal.component.ts`: total from `amountBilled`, each line from `lines[i].amount`. Add a unit test where the response differs from the cart estimate by a cent and the confirmation shows the server's figure. Verify `npm test` passes and the demo build's confirmation and PDF show the billed amounts

## 3. Payment rounding

- [x] 3.1 Round the payment amount to cents before the checks in `RecordPayment` (D7); verify `dotnet build` passes
- [x] 3.2 Add API tests from `specs/payment-recording`: $0.004 refused with no receipt, $10.456 on a $100.00 balance gives $89.54 and a $10.46 receipt, $12,500.005 refused as an overpayment. Verify they pass, and that removing the rounding line makes the sub-cent test fail (then revert)
- [x] 3.3 Add the sub-cent and rounded-payment contract cases and round payments in the mock with `cents()` before its checks; verify both contract runners pass

## 4. Deactivated clients

- [x] 4.1 Refuse an order for an inactive client with 409 "Company is inactive and cannot be billed." after the client lookup (D6); verify `dotnet build` passes
- [x] 4.2 Add API tests: order for a deactivated client is refused with nothing stored, a deactivated client pays in full, a deactivated client's rental is cancelled with its amount reversed, and an unknown client still gets 404; verify `dotnet test` passes
- [x] 4.3 Add the deactivated-client order and payment contract cases and the same rule in the mock; verify both contract runners pass

## 5. Conflict handling

- [x] 5.1 Add the exception handler (D5) and register it in `Program.cs` with `AddExceptionHandler`, `AddProblemDetails` and `UseExceptionHandler()`, mapping `DbUpdateConcurrencyException` and `SqlException` 50001 anywhere in the inner-exception chain; verify `dotnet build` passes and an unrelated exception still answers 500
- [x] 5.2 Register a test-only `SaveChangesInterceptor` in the test factory that throws `DbUpdateConcurrencyException` on demand, and add a test that a payment hitting it answers 409 with the balance-changed message and creates no receipt; verify it passes

## 6. Orders take turns

- [ ] 6.1 In `PlaceBulkOrder`, open the transaction at the default isolation level and take the application lock first (D3); verify the existing order and double-booking tests pass
- [ ] 6.2 Add the concurrency tests for orders from `specs/balance-integrity` and `specs/api-test-suite` (D8): same plate, and different plates for the same client and for different clients, each repeated 10 times; verify they pass 3 runs in a row
- [ ] 6.3 Add the lock-timeout test: hold the application lock from a separate connection, place an order, and expect 409 "Another order was being placed at the same time. Please try again." after about 5 seconds with nothing stored; verify it passes
- [ ] 6.4 Mutation check: remove the lock statement and confirm the same-plate test fails (run up to 3 times, raising repetitions if it never fails), then restore it

## 7. Balance row version

- [ ] 7.1 Add `[Timestamp] RowVersion` to `Company` and generate one migration; verify `dotnet ef migrations list` shows it and a fresh test run applies it
- [ ] 7.2 Add the payment and cancellation race tests from `specs/balance-integrity` and `specs/api-test-suite` (D8): two payments on one balance, two cancellations of one rental, each repeated 10 times; verify they pass 3 runs in a row
- [ ] 7.3 Mutation check: remove `RowVersion` together with its migration and snapshot lines and confirm the payment race test fails (run up to 3 times, raising repetitions if it never fails), then restore all three
- [ ] 7.4 Add the concurrency difference to the intentional-differences list in `contracts/README.md`; verify it states why the mock does not mirror it

## 8. Whole-system check

- [ ] 8.1 Run the CI-equivalent locally: `dotnet test`, `npm test`, `npm run build`, `npm run build:demo`, `npm run check:contrast` and `npm run e2e` (demo); verify all pass
- [ ] 8.2 Run the full-stack end-to-end tests on a scratch database as the README describes; verify they pass, the confirmation total equals the server's `amountBilled`, and the developer database is untouched
- [ ] 8.3 Push and open the pull request; verify the `frontend`, `backend` and `e2e` checks all pass

## Workflow follow-up

- Archive the change with `/opsx:archive` after it is merged, on the branch for the next change (`clean-up-data-model`).
- Later changes inherit three follow-ups: a server-side price list (`manage-machines`), a "free / promo rental" shortcut in the order form (frontend), and a per-account order lock name (`add-accounts-and-tenancy`).

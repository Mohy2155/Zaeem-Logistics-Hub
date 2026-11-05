# Design

## Context

See proposal.md for motivation. The current state that shapes the approach:

- **Order placement** (`OrdersController.PlaceBulkOrder`) validates lines, opens a `Serializable` transaction, looks up the client, reads the plates' rentals for the double-booking check, then bills the sum of `Math.Round(item.LineTotal, 2)`, where `LineTotal` comes from the request. It saves twice inside the transaction (the order, to get its id, then the rentals). `RentalItems.PlateNumber` has no index, so the `Serializable` read range-locks the whole table and two simultaneous orders deadlock on their inserts.
- **Other balance changes** (`RecordPayment`, `DeleteRentalItem`, `CancelOrder`) load the client, change `OutstandingBalance` in memory and save once, with no transaction and no concurrency token, so the last writer wins. `DeleteRentalItem` finds the client by name.
- **Pricing today lives only in the browser** (`order-pricing.ts`, `priceLine`): `days × rate × (1 − discount/100) × (1 + tax/100)`, rounded to cents with `Math.round(x * 100) / 100`. `days` is `rentalDays(start, end)`, the whole days from start to end. The booking check is inclusive of the end day, so a Nov 1 to Nov 3 rental bills 2 days but blocks the plate for 3. That stays.
- **The UI posts the cart as it is.** `portal.component.ts` passes the cart's `OrderLineItem[]` (which include `lineTotal` and `rentalDays`) to `CompanyService.placeBulkOrder`, which posts the payload unchanged. On success it builds the confirmation and the invoice from the cart and the preview total; it never reads `amountBilled`.
- **Demo mock** (`services/mock-api.ts`) re-implements the API's rules and runs the same 37 cases in `contracts/api-cases.json` as the API. Only two cases use a `lineTotal` that is not `rate × days`: the 1350.004 billing case and the negative-line-total case.
- **API tests** share one host and database per run and execute sequentially. `ApiCollection.Line(...)` builds order lines with a `lineTotal`. `ContractTests` runs inside `dotnet test`, so contract-case edits must land with the API change that needs them.
- `OrderResultDto` is still registered as a keyless EF entity (`DbSet<OrderResultDto> OrderResults`), a leftover from the removed stored procedure that the next change deletes.

## Goals / Non-Goals

**Goals:**
- The amount billed depends only on the days, rate, discount and tax the server reads.
- Every document the user receives after placing an order shows what the server billed.
- A balance change based on stale data is refused, not silently merged.
- Simultaneous orders never deadlock and never return 500.
- Every new rule has a test that fails when the rule is removed.

**Non-Goals:**
- A server-side price list (`manage-machines`).
- Exact half-cent agreement between the cart preview and the server (see Risks).
- Retrying a conflicted request on the server. The caller retries.
- Limits on very large amounts (they overflow to 500, as before).

## Decisions

### D1. Price lines on the server with `decimal`, and drop `lineTotal` from the request
- **What:** A private static `PriceLine(days, dailyRate, discount, taxPercent)` in `OrdersController`. The rate, discount and tax are rounded to 2 decimals first, matching their `decimal(18,2)` columns, so the stored fields reproduce the bill. The result is `Math.Round(days * rate * (1 - discount / 100m) * (1 + tax / 100m), 2, MidpointRounding.AwayFromZero)`, with `days = (end - start).Days` from the dates already parsed.
- **Request:** `OrderItemDto.LineTotal` is deleted. A request that still sends it is accepted and the field is ignored (default System.Text.Json binding).
- **Validation:** `DailyRate <= 0` joins the "Invalid pricing for plate X." check. A missing rate binds to 0 and is refused the same way, so no nullable type is needed. Free rentals use a 100% discount, which keeps the machine's real rate on record.
- **Rounding:** `AwayFromZero` matches the UI's round-half-up for positive amounts. Banker's rounding (`Math.Round(x, 2)`), used today on the client's total, goes away.
- **Alternatives:** *Keep `lineTotal` and reject it if it differs by more than a cent.* That keeps two sources of truth. *A pricing service class.* There is one caller, so a private method is enough.

### D2. The response returns billed lines; the UI uses them
- **API:** `OrderResultDto` gains `Lines`, a list of `{ PlateNumber, Amount }` in request order. The property is `[NotMapped]` while the class is still a keyless EF entity, so the EF model and migrations do not change. The next change removes the entity.
- **UI:** `CompanyService.placeBulkOrder` builds the request lines explicitly (machine, plate, dates, rate, discount, tax, tax type), so `lineTotal` and `rentalDays` are never posted. `portal.component.ts` builds the `CompletedOrder` from the response: total = `amountBilled`, and each item's `lineTotal` = the matching `lines[i].amount`. The confirmation dialog and `invoice-export.ts` then print server figures without changes of their own.
- **Mock:** prices each line with `priceLine` from `order-pricing.ts` and returns `lines`, so the demo uses the cart's formula.
- **Alternative:** *Make the browser's arithmetic exact* (integer cents with `BigInt`). It removes the half-cent gap in the preview too, but adds code to the UI and the mock while the server still decides the bill. Not needed once the documents use server figures.

### D3. Orders take turns on a database application lock
- **What:** `PlaceBulkOrder` opens its transaction at the default isolation level (Read Committed) and, as its first statement, takes an exclusive application lock owned by the transaction:
  `DECLARE @r int; EXEC @r = sp_getapplock @Resource = N'place-bulk-order', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 5000; IF @r < 0 THROW 50001, 'Order lock not acquired', 1;`
  It runs through `Database.ExecuteSqlRawAsync` before the client lookup. The lock is released when the transaction commits or rolls back.
- **Why this is correct:** only order placement creates rentals, and it now does so one order at a time, so the booking check reads every committed booking. Cancellations only free plates, so they cannot create a conflict and do not need the lock. The client is read after the lock, so a queued order never works from a stale balance left by the order before it.
- **Why not keep `Serializable`:** its range locks over the unindexed table deadlock any two simultaneous orders, and an index only narrows the ranges; on a small table they stay coarse. Mapping the deadlock to 409 would have made staff retry unrelated orders.
- **Cost:** orders queue for a few milliseconds each. That is invisible at a few staff, and the lock lives in the database, so it still works with several API instances. When accounts arrive, the resource name can become per-account.
- **Alternatives:** *`UPDLOCK, HOLDLOCK` hints on the rentals read.* Raw SQL in the query, and still range locks. *An in-process `SemaphoreSlim`.* Breaks with two API instances.

### D4. A row version on `Company` for every other balance change
- **What:** Add `[Timestamp] public byte[] RowVersion { get; set; } = [];` to `Company` and one migration. EF adds `WHERE RowVersion = @original` to every client update, so a save from a stale copy updates 0 rows and throws `DbUpdateConcurrencyException`.
- **Coverage:** `RecordPayment`, `DeleteRentalItem` and `CancelOrder` each save once, so the receipt and the rental statuses roll back with the refused balance update. Order placement is covered too: an order racing a payment for the same client fails its save, and the transaction rolls back both saves.
- **Alternatives:** *Atomic `UPDATE ... SET OutstandingBalance = OutstandingBalance - @x` statements.* They never lose an update, but they mean rewriting three actions around raw SQL, and cancel-order's "subtract only what was not already reversed" depends on rows already read. *`UPDLOCK` on the client row.* Needs a transaction and hand-written SQL in three places.

### D5. One exception handler turns expected conflicts into 409
- **What:** A class implementing `IExceptionHandler`, registered with `AddExceptionHandler<T>()` and `AddProblemDetails()`, plus `app.UseExceptionHandler()` before `MapControllers`. It walks the exception and its `InnerException` chain, because EF wraps database errors:
  - `DbUpdateConcurrencyException` → 409 "The client's balance changed while this request was being processed. Please try again."
  - `SqlException` with `Number == 50001` → 409 "Another order was being placed at the same time. Please try again."
  - Anything else is not handled here and stays a 500.
- The body is `{ "message": ... }`, like every other refusal. It logs at Information level, because these are expected outcomes, not errors.

### D6. Deactivated clients: orders refused, payments and cancellations allowed
- After the client lookup, `if (!company.IsActive)` returns 409 "Company is inactive and cannot be billed." Line validation still runs first, and an unknown client still answers 404. `RecordPayment`, `DeleteRentalItem` and `CancelOrder` do not check the flag. This is the owner's rule: a client who stops renting can still settle or be refunded.

### D7. Round the payment first
- `request.Amount = Math.Round(request.Amount, 2, MidpointRounding.AwayFromZero);` before the `<= 0` check, so a sub-cent payment fails the existing check, and the receipt, the balance and the overpayment check all use one figure. The mock does the same with its `cents()` helper.

### D8. Tests
- **Rules:** one test per spec scenario, through HTTP, as today.
- **Concurrency:** within one test, two requests start from a shared `TaskCompletionSource` gate on the test host's `HttpClient` and are awaited with `Task.WhenAll`. Each scenario repeats 10 times with fresh data. Assertions are invariants, never "request A wins". The test collection stays sequential; only the requests inside a test run in parallel.
- **The 409 handler:**
  - The `DbUpdateConcurrencyException` path is tested deterministically. The test factory registers a `SaveChangesInterceptor` that throws on demand, and a test checks the 409 body.
  - The 50001 path is tested by holding the application lock from a separate connection, so an order waits 5 seconds and gets the 409.
- **Mutation checks (in tasks, not CI):**
  - Remove the application lock; the same-plate test must fail.
  - Remove `RowVersion` together with its migration and snapshot lines; the payment race test must fail. Removing the property alone would stop the test host at startup, because EF 9 refuses to migrate when the model and the snapshot disagree.
  - Run each mutated suite up to 3 times. If the safeguard's test never fails, raise its repetitions until it does.
- **Contract cases** change with each rule, in the same task group as the API change, because `ContractTests` runs in `dotnet test` and the Vitest runner runs in `npm test`.

## Risks / Trade-offs

- **[Risk] The cart preview and the server can differ by a cent on exact half-cent amounts** (for example 5 days × $33.33 at 10% = 149.985: the server bills 149.99, JavaScript floating point shows 149.98). → After placing, every document uses the server's figures (D2). The rounding note in `contracts/README.md` is rewritten for the new rule, and contract cases avoid exact half cents.
- **[Risk] Race tests can pass by luck when a safeguard is missing.** → Each scenario repeats 10 times, and the mutation checks prove each test catches its missing safeguard before the change is done.
- **[Risk] A wait of up to 5 seconds holds an HTTP request open.** → Only when orders pile up, which does not happen at the expected load. The 409 tells staff to try again.
- **[Risk] A rental whose client name matches no client still cancels without changing any balance.** → Existing behaviour, fixed by linking rentals by client ID in `clean-up-data-model`.
- **[Trade-off] Callers see 409s they never saw before.** → A visible "try again" beats a silently wrong balance.
- **[Trade-off] An extra `lineTotal` is ignored, not rejected.** → The only caller is this repository's frontend, which stops sending it.

## Migration Plan

1. Land the change on its branch; CI runs the API, contract and e2e checks.
2. The migration adds a `rowversion` column to `Companies`; SQL Server fills it for existing rows. It applies at API startup (`Database.Migrate()`).
3. Roll back by reverting the merge; the unused column is harmless.

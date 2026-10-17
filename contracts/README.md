# API contract cases

`api-cases.json` describes how each API endpoint used by the frontend behaves. The same cases run against two targets:

| Target | Runner | Command |
|--------|--------|---------|
| Real .NET API on a throwaway SQL Server database | `ZaeemDistributeSystem/ZaeemDistribute.Api.Tests/ContractTests.cs` | `dotnet test` in `ZaeemDistributeSystem/` |
| Demo mock API used by the GitHub Pages build | `zaeem-distribute-ui/src/app/services/mock-api.contract.spec.ts` | `npm test` in `zaeem-distribute-ui/` |

The demo therefore can't silently behave differently from the real app.

**The real API is the source of truth.** When a case passes against the API and fails against the mock, fix the mock (`zaeem-distribute-ui/src/app/services/mock-api.ts`). Don't edit the case to accept the mock's behaviour. A difference that has to stay goes in [Intentional differences](#intentional-differences) below, with its reason.

## Case format

```json
{
  "name": "payment: a payment one cent over the balance is refused, stating the balance",
  "given":   { "clients": [{ "id": 1, "name": "Build-It Corp", "balance": 12500 }] },
  "request": { "method": "POST", "path": "/api/payments/record", "body": { "companyId": 1, "amount": 12500.01 } },
  "expect":  { "status": 400, "messageStartsWith": "Payment exceeds the outstanding balance of 12500",
               "balances": { "Build-It Corp": 12500 }, "receiptCount": 0 }
}
```

Each case starts from empty storage and adds only the rows in `given`.

### `given`

| List | Fields | Defaults |
|------|--------|----------|
| `clients` | `id`, `name`, `balance`, `discount`, `active` | `discount` 0, `active` true |
| `rentals` | `id`, `client` (client name), `plate`, `start`, `end` (`yyyy-MM-dd`), `total`, `status`, `orderId`, `machineName`, `machineId` | `status` `"Active"`, no order, `"Excavator X3000"`, `101`; daily rate 450, discount 0, tax `"VAT"` 0% |
| `orders` | `id`, `clientId`, `total`, `status` | `status` `"Processed"` |
| `receipts` | `id` (listed as `REC-<id>`), `clientId`, `amount`, `paidAt` | |

Ids are explicit because requests address rows by id (`/api/orders/cancel/31`).

### `request`

`method`, `path`, and an optional JSON `body`, sent exactly as the frontend sends it (camelCase, dates as `yyyy-MM-dd`).

### `expect`

Every field is optional except `status`:

| Field | Checks |
|-------|--------|
| `status` | HTTP status code |
| `body` | Partial match on the response JSON. Objects must contain the listed properties (others are ignored). Arrays must have the same length and match element by element, in order. Numbers compare by value (`1850` equals `1850.00`). `{ "$matches": "<regex>" }` matches a string or number against a regular expression. |
| `message` | The error body's `message`, exactly |
| `messageStartsWith` | The start of the error body's `message` |
| `balances` | Client name → balance due after the request, read from storage |
| `rentalStatuses` | Plate → status after the request. A string means exactly one rental has that plate. A list gives the status of every rental with that plate, oldest first. |
| `rentalCount`, `receiptCount` | Number of stored rentals or receipts after the request |
| `rentalsAfter` | Partial match (as `body`) on `GET /api/orders/rentals` after the request |

Dates are fixed in 2030, so no case depends on today's date.

## Adding a case

1. Add the case to `api-cases.json`.
2. Run `dotnet test` in `ZaeemDistributeSystem/`. The case must pass against the API, which confirms that it describes real behaviour.
3. Run `npm test` in `zaeem-distribute-ui/`. If the case fails there, fix the mock.

Changing an API rule or message means updating its cases in the same commit. The API tests fail while the case is stale, and the frontend tests fail until the mock is updated.

## Intentional differences

The cases are written so that these differences aren't compared:

- **Receipt numbering.** Both targets issue `REC-<number>`, but from different sequences (the database identity, or a demo counter starting at 1003). Cases check new receipt numbers only against `^REC-\d+$`.
- **Payment timestamps.** The mock stores `paymentDate` as an ISO string in UTC (`…Z`). The API returns it without a zone. The frontend reads both, so cases don't compare `paymentDate`.
- **Half-cent rounding.** The API rounds line totals with .NET `Math.Round`, which rounds halves to even (`0.125 → 0.12`). The mock uses `Math.round(x * 100) / 100`, which rounds halves up (`0.125 → 0.13`). The frontend already sends line totals rounded to cents, so halves don't reach either side. The cases pin a sub-cent total (`1350.004`) that both round the same way.
- **Lifetime billed before the demo.** The demo's sample clients carry a `billedBeforeDemo` amount, so the ledger shows a believable billing history with only two sample rentals. Lifetime billed is still computed from rentals on both sides; the mock adds that starting amount. Clients created by the cases have none.

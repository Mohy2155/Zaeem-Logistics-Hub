using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ZaeemDistribute.Api.Tests.Infrastructure;

namespace ZaeemDistribute.Api.Tests;

/// <summary>What a placed order bills, what it stores, and how the client list reports it.</summary>
public class BillingTests(ApiFactory api) : ApiTest(api)
{
    [Fact]
    public async Task Order_bills_the_sum_of_its_line_totals_rounded_to_cents()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 1000);

        var response = await PlaceOrderAsync(client.CompanyId,
            Line(" fs-101 ", "2030-11-01", "2030-11-03", lineTotal: 1350.004m, discount: 10, taxPercent: 5),
            Line("FS-102", "2030-11-02", "2030-11-04", lineTotal: 500m, machineName: "Tower Crane T1", machineId: 103));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await JsonAsync(response);
        Assert.Equal("SUCCESS", body.GetProperty("result").GetString());
        Assert.Equal(1850.00m, body.GetProperty("amountBilled").GetDecimal());
        Assert.Equal(2850.00m, body.GetProperty("outstandingBalance").GetDecimal());
        Assert.Equal(2850.00m, await Data.BalanceOfAsync("Build-It Corp"));

        var order = Assert.Single(await Data.OrdersAsync());
        Assert.Equal(body.GetProperty("orderId").GetInt32(), order.OrderId);
        Assert.Equal(1850.00m, order.TotalAmount);
        Assert.Equal("Processed", order.OrderStatus);

        var rentals = await Data.RentalsAsync();
        Assert.Collection(rentals,
            first =>
            {
                Assert.Equal("FS-101", first.PlateNumber);
                Assert.Equal(1350.00m, first.TotalAmount);
                Assert.Equal(10m, first.Discount);
                Assert.Equal(5m, first.TaxPercent);
                Assert.Equal(Day("2030-11-01"), first.StartDate);
                Assert.Equal(Day("2030-11-03"), first.EndDate);
            },
            second =>
            {
                Assert.Equal("FS-102", second.PlateNumber);
                Assert.Equal("Tower Crane T1", second.MachineName);
                Assert.Equal(500m, second.TotalAmount);
            });
        Assert.All(rentals, r =>
        {
            Assert.Equal("Active", r.Status);
            Assert.Equal("Build-It Corp", r.CompanyName);
            Assert.Equal(order.OrderId, r.BulkOrderId);
        });
    }

    [Fact]
    public async Task Placed_order_is_listed_with_the_rentals()
    {
        var client = await Data.AddClientAsync("Build-It Corp");
        await PlaceOrderAsync(client.CompanyId, Line("fs-101", "2030-11-01", "2030-11-03", lineTotal: 1350m));

        var rentals = await Client.GetFromJsonAsync<JsonElement>("/api/orders/rentals");

        var rental = Assert.Single(rentals.EnumerateArray());
        Assert.Equal("FS-101", rental.GetProperty("plateNumber").GetString());
        Assert.Equal("Active", rental.GetProperty("status").GetString());
        Assert.Equal(1350m, rental.GetProperty("totalAmount").GetDecimal());
    }

    [Fact]
    public async Task Lifetime_billed_includes_new_orders_and_excludes_cancelled_rentals()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 1000);
        await Data.AddRentalAsync("Build-It Corp", "OLD-1", Day("2030-01-01"), Day("2030-01-03"), total: 300);
        await Data.AddRentalAsync("Build-It Corp", "OLD-2", Day("2030-02-01"), Day("2030-02-03"), total: 999, status: "Cancelled");
        await PlaceOrderAsync(client.CompanyId,
            Line("FS-101", "2030-11-01", "2030-11-03", lineTotal: 1350m),
            Line("FS-102", "2030-11-01", "2030-11-03", lineTotal: 500m));

        var clients = await Client.GetFromJsonAsync<JsonElement>("/api/companies");

        var listed = Assert.Single(clients.EnumerateArray());
        Assert.Equal(300m + 1850m, listed.GetProperty("totalBilledToDate").GetDecimal());
    }

    [Fact]
    public async Task Client_list_shows_active_clients_with_balance_discount_and_lifetime_billed()
    {
        var active = await Data.AddClientAsync("Build-It Corp", balance: 12500, discount: 10);
        await Data.AddClientAsync("Dormant Haulage", balance: 50, discount: 5, active: false);
        await Data.AddRentalAsync("Build-It Corp", "DX-7728", Day("2030-11-01"), Day("2030-11-05"), total: 2835);

        var clients = await Client.GetFromJsonAsync<JsonElement>("/api/companies");

        var listed = Assert.Single(clients.EnumerateArray());
        Assert.Equal(active.CompanyId, listed.GetProperty("companyId").GetInt32());
        Assert.Equal("Build-It Corp", listed.GetProperty("companyName").GetString());
        Assert.Equal(12500m, listed.GetProperty("outstandingBalance").GetDecimal());
        Assert.Equal(10m, listed.GetProperty("defaultDiscount").GetDecimal());
        Assert.Equal(2835m, listed.GetProperty("totalBilledToDate").GetDecimal());
    }
}

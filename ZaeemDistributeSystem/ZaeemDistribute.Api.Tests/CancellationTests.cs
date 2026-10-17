using System.Net;
using ZaeemDistribute.Api.Tests.Infrastructure;

namespace ZaeemDistribute.Api.Tests;

/// <summary>Cancelling reverses a charge exactly once; a reversal can leave the client in credit.</summary>
public class CancellationTests(ApiFactory api) : ApiTest(api)
{
    private Task<HttpResponseMessage> CancelRentalAsync(int id) => Client.DeleteAsync($"/api/orders/rentals/{id}");

    private Task<HttpResponseMessage> CancelOrderAsync(int id) => Client.PostAsync($"/api/orders/cancel/{id}", content: null);

    [Fact]
    public async Task Cancelling_a_rental_reverses_its_charge_into_a_credit()
    {
        await Data.AddClientAsync("Mega Structures", balance: 0);
        var rental = await Data.AddRentalAsync("Mega Structures", "AP-501", Day("2030-11-01"), Day("2030-11-03"), total: 606.50m);

        var response = await CancelRentalAsync(rental.RentalItemId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await JsonAsync(response);
        Assert.Equal("Rental item cancelled successfully", body.GetProperty("message").GetString());
        Assert.Equal(-606.50m, body.GetProperty("outstandingBalance").GetDecimal());
        Assert.Equal(-606.50m, await Data.BalanceOfAsync("Mega Structures"));
        Assert.Equal("Cancelled", Assert.Single(await Data.RentalsAsync()).Status);
    }

    [Fact]
    public async Task Cancelling_a_rental_twice_is_refused_and_reverses_once()
    {
        await Data.AddClientAsync("Mega Structures", balance: 1000);
        var rental = await Data.AddRentalAsync("Mega Structures", "AP-501", Day("2030-11-01"), Day("2030-11-03"), total: 400);
        await CancelRentalAsync(rental.RentalItemId);

        var second = await CancelRentalAsync(rental.RentalItemId);

        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
        Assert.Equal("Rental item is already cancelled", await MessageAsync(second));
        Assert.Equal(600m, await Data.BalanceOfAsync("Mega Structures"));
    }

    [Fact]
    public async Task Cancelling_an_unknown_rental_is_not_found()
    {
        var response = await CancelRentalAsync(424_242);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("Rental item not found", await MessageAsync(response));
    }

    [Fact]
    public async Task Cancelling_an_order_reverses_only_what_was_not_already_reversed()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 0);
        var placed = await JsonAsync(await PlaceOrderAsync(client.CompanyId,
            Line("FS-101", "2030-11-01", "2030-11-03", lineTotal: 500m),
            Line("FS-102", "2030-11-01", "2030-11-03", lineTotal: 500m)));
        var orderId = placed.GetProperty("orderId").GetInt32();
        Assert.Equal(1000m, await Data.BalanceOfAsync("Build-It Corp"));

        var firstLine = (await Data.RentalsAsync())[0];
        await CancelRentalAsync(firstLine.RentalItemId);
        Assert.Equal(500m, await Data.BalanceOfAsync("Build-It Corp"));

        var response = await CancelOrderAsync(orderId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await JsonAsync(response);
        Assert.Equal("Order cancelled successfully", body.GetProperty("message").GetString());
        Assert.Equal(0m, body.GetProperty("outstandingBalance").GetDecimal());
        Assert.Equal(0m, await Data.BalanceOfAsync("Build-It Corp")); // fell by 1,000 in total, not 1,500
        Assert.All(await Data.RentalsAsync(), r => Assert.Equal("Cancelled", r.Status));
        Assert.Equal("Cancelled", Assert.Single(await Data.OrdersAsync()).OrderStatus);
    }

    [Fact]
    public async Task Cancelling_an_order_twice_is_refused_and_reverses_once()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 0);
        var placed = await JsonAsync(await PlaceOrderAsync(client.CompanyId, Line("FS-101", "2030-11-01", "2030-11-03", lineTotal: 750m)));
        var orderId = placed.GetProperty("orderId").GetInt32();
        await CancelOrderAsync(orderId);

        var second = await CancelOrderAsync(orderId);

        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
        Assert.Equal("Order is already cancelled", await MessageAsync(second));
        Assert.Equal(0m, await Data.BalanceOfAsync("Build-It Corp"));
    }

    [Fact]
    public async Task Cancelling_an_unknown_order_is_not_found()
    {
        var response = await CancelOrderAsync(424_242);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("Order not found", await MessageAsync(response));
    }

    [Fact]
    public async Task Rows_can_be_seeded_with_explicit_ids()
    {
        await Data.AddClientAsync("Build-It Corp", balance: 900, id: 7);
        await Data.AddOrderAsync(companyId: 7, total: 900, id: 31);
        await Data.AddRentalAsync("Build-It Corp", "FS-301", Day("2030-11-01"), Day("2030-11-02"), total: 900, orderId: 31, id: 501);

        var response = await CancelOrderAsync(31);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(0m, await Data.BalanceOfAsync("Build-It Corp"));
        Assert.Equal(501, Assert.Single(await Data.RentalsAsync()).RentalItemId);
    }
}

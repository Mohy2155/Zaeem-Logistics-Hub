using System.Net;
using ZaeemDistribute.Api.Tests.Infrastructure;

namespace ZaeemDistribute.Api.Tests;

/// <summary>Rental periods include both their start and end day; a plate can only be out once on any day.</summary>
public class DoubleBookingTests(ApiFactory api) : ApiTest(api)
{
    private async Task<int> ClientWithBookingAsync(string status = "Active")
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 1000);
        await Data.AddRentalAsync("Build-It Corp", "DX-7728", Day("2030-11-01"), Day("2030-11-05"), total: 2250, status: status);
        return client.CompanyId;
    }

    [Fact]
    public async Task Booking_that_starts_on_the_return_day_conflicts_regardless_of_plate_case_and_spacing()
    {
        var clientId = await ClientWithBookingAsync();

        var response = await PlaceOrderAsync(clientId, Line(" dx-7728 ", "2030-11-05", "2030-11-08"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.StartsWith("Scheduling conflict: plate DX-7728", await MessageAsync(response));
        Assert.Single(await Data.RentalsAsync());
        Assert.Equal(1000, await Data.BalanceOfAsync("Build-It Corp"));
    }

    [Fact]
    public async Task Booking_that_ends_on_the_start_day_conflicts()
    {
        var clientId = await ClientWithBookingAsync();

        var response = await PlaceOrderAsync(clientId, Line("DX-7728", "2030-10-28", "2030-11-01"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Back_to_back_bookings_are_allowed()
    {
        var clientId = await ClientWithBookingAsync();

        var response = await PlaceOrderAsync(clientId, Line("DX-7728", "2030-11-06", "2030-11-08"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, (await Data.RentalsAsync()).Count);
    }

    [Fact]
    public async Task Same_days_on_a_different_plate_are_allowed()
    {
        var clientId = await ClientWithBookingAsync();

        var response = await PlaceOrderAsync(clientId, Line("DX-7729", "2030-11-01", "2030-11-05"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Overlap_between_lines_of_one_order_conflicts_and_stores_nothing()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 1000);

        var response = await PlaceOrderAsync(client.CompanyId,
            Line("FS-101", "2030-11-01", "2030-11-03"),
            Line("fs-101", "2030-11-03", "2030-11-04"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.StartsWith("Scheduling conflict: plate FS-101", await MessageAsync(response));
        Assert.Empty(await Data.RentalsAsync());
        Assert.Empty(await Data.OrdersAsync());
        Assert.Equal(1000, await Data.BalanceOfAsync("Build-It Corp"));
    }

    [Fact]
    public async Task Cancelled_booking_frees_the_plate()
    {
        var clientId = await ClientWithBookingAsync(status: "Cancelled");

        var response = await PlaceOrderAsync(clientId, Line("DX-7728", "2030-11-01", "2030-11-05"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}

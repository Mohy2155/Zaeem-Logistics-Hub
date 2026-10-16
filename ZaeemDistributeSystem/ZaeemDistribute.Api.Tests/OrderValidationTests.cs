using System.Net;
using ZaeemDistribute.Api.Tests.Infrastructure;

namespace ZaeemDistribute.Api.Tests;

/// <summary>Orders that must be refused before anything is billed or booked.</summary>
public class OrderValidationTests(ApiFactory api) : ApiTest(api)
{
    public static TheoryData<string, object, string> InvalidLines => new()
    {
        { "blank plate", Line("   ", "2030-11-01", "2030-11-03"), "Plate number is required for Excavator X3000." },
        { "unparseable start date", Line("DX-1", "not-a-date", "2030-11-03"), "Invalid rental dates for plate DX-1." },
        { "missing end date", Line("DX-1", "2030-11-01", ""), "Invalid rental dates for plate DX-1." },
        { "end date before start date", Line("DX-1", "2030-11-10", "2030-11-09"), "End date must be after start date for plate DX-1." },
        { "end date equal to start date", Line("DX-1", "2030-11-10", "2030-11-10"), "End date must be after start date for plate DX-1." },
        { "negative line total", Line("DX-1", "2030-11-01", "2030-11-03", lineTotal: -1), "Invalid pricing for plate DX-1." },
        { "negative tax", Line("DX-1", "2030-11-01", "2030-11-03", taxPercent: -5), "Invalid pricing for plate DX-1." },
        { "negative discount", Line("DX-1", "2030-11-01", "2030-11-03", discount: -1), "Invalid pricing for plate DX-1." },
        { "discount over 100", Line("DX-1", "2030-11-01", "2030-11-03", discount: 100.01m), "Invalid pricing for plate DX-1." },
    };

    [Theory]
    [MemberData(nameof(InvalidLines))]
    public async Task Invalid_line_is_refused_and_nothing_is_stored(string _, object line, string expectedMessage)
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 1000);

        var response = await PlaceOrderAsync(client.CompanyId, line);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(expectedMessage, await MessageAsync(response));
        await AssertNothingStored(balance: 1000);
    }

    [Fact]
    public async Task Order_without_items_is_refused()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 1000);

        var response = await PlaceOrderAsync(client.CompanyId);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Order must contain at least one item.", await MessageAsync(response));
        await AssertNothingStored(balance: 1000);
    }

    [Fact]
    public async Task Invalid_second_line_refuses_the_whole_order()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 1000);

        var response = await PlaceOrderAsync(client.CompanyId,
            Line("DX-1", "2030-11-01", "2030-11-03"),
            Line("DX-2", "2030-11-05", "2030-11-04"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("End date must be after start date for plate DX-2.", await MessageAsync(response));
        await AssertNothingStored(balance: 1000);
    }

    [Fact]
    public async Task Unknown_client_is_not_found()
    {
        await Data.AddClientAsync("Build-It Corp", balance: 1000);

        var response = await PlaceOrderAsync(999_999, Line("DX-1", "2030-11-01", "2030-11-03"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("Company not found.", await MessageAsync(response));
        await AssertNothingStored(balance: 1000);
    }

    [Fact]
    public async Task Line_validation_comes_before_the_client_lookup()
    {
        var response = await PlaceOrderAsync(999_999, Line("DX-1", "2030-11-05", "2030-11-04"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task AssertNothingStored(decimal balance)
    {
        Assert.Empty(await Data.RentalsAsync());
        Assert.Empty(await Data.OrdersAsync());
        Assert.Equal(balance, await Data.BalanceOfAsync("Build-It Corp"));
    }
}

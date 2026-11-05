using System.Net;
using ZaeemDistribute.Api.Tests.Infrastructure;

namespace ZaeemDistribute.Api.Tests;

/// <summary>The API prices every order line itself: days × rate, less the discount, plus tax, in whole cents.</summary>
public class PricingTests(ApiFactory api) : ApiTest(api)
{
    [Fact]
    public async Task Line_is_priced_from_its_days_rate_and_discount()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 0);

        var response = await PlaceOrderAsync(client.CompanyId, Line("DX-7728", "2030-11-01", "2030-11-08", dailyRate: 450, discount: 10));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2835.00m, (await JsonAsync(response)).GetProperty("amountBilled").GetDecimal());
        Assert.Equal(2835.00m, Assert.Single(await Data.RentalsAsync()).TotalAmount);
    }

    [Fact]
    public async Task Discount_applies_before_tax()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 0);

        // 300.00, less 30.00, plus 5% of 270.00
        var response = await PlaceOrderAsync(client.CompanyId, Line("DX-1", "2030-11-01", "2030-11-04", dailyRate: 100, discount: 10, taxPercent: 5));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(283.50m, Assert.Single(await Data.RentalsAsync()).TotalAmount);
        Assert.Equal(283.50m, await Data.BalanceOfAsync("Build-It Corp"));
    }

    [Fact]
    public async Task Tax_is_rounded_to_the_cent()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 0);

        // 66.66 plus 4.6662 tax = 71.3262
        var response = await PlaceOrderAsync(client.CompanyId, Line("DX-1", "2030-11-01", "2030-11-03", dailyRate: 33.33m, taxPercent: 7));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(71.33m, Assert.Single(await Data.RentalsAsync()).TotalAmount);
    }

    [Fact]
    public async Task A_supplied_line_total_is_ignored()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 1000);

        // An older caller that still sends its own total, far below the real price
        var response = await PlaceOrderAsync(client.CompanyId, new
        {
            machineId = 101,
            machineName = "Excavator X3000",
            plateNumber = "DX-7728",
            startDate = "2030-11-01",
            endDate = "2030-11-08",
            dailyRate = 450m,
            discount = 10m,
            taxPercent = 0m,
            taxType = "VAT",
            lineTotal = 1m,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2835.00m, (await JsonAsync(response)).GetProperty("amountBilled").GetDecimal());
        Assert.Equal(2835.00m, Assert.Single(await Data.RentalsAsync()).TotalAmount);
        Assert.Equal(3835.00m, await Data.BalanceOfAsync("Build-It Corp"));
    }

    [Fact]
    public async Task Full_discount_is_a_free_rental_that_keeps_its_rate()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 1000);

        var response = await PlaceOrderAsync(client.CompanyId, Line("DX-7728", "2030-11-01", "2030-11-08", dailyRate: 450, discount: 100));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(0m, (await JsonAsync(response)).GetProperty("amountBilled").GetDecimal());
        var rental = Assert.Single(await Data.RentalsAsync());
        Assert.Equal(0m, rental.TotalAmount);
        Assert.Equal(450m, rental.DailyRate);
        Assert.Equal(100m, rental.Discount);
        Assert.Equal(1000m, await Data.BalanceOfAsync("Build-It Corp"));
    }
}

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ZaeemDistribute.Api.Tests.Infrastructure;

namespace ZaeemDistribute.Api.Tests;

/// <summary>Payments reduce the balance due, never below zero, and each one leaves a receipt.</summary>
public class PaymentTests(ApiFactory api) : ApiTest(api)
{
    [Theory]
    [InlineData(0)]
    [InlineData(-25)]
    public async Task Zero_or_negative_payment_is_refused(decimal amount)
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 12500);

        var response = await PayAsync(client.CompanyId, amount);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Payment amount must be greater than zero.", await MessageAsync(response));
        await AssertUnchanged(balance: 12500);
    }

    [Fact]
    public async Task Payment_one_cent_over_the_balance_is_refused()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 12500);

        var response = await PayAsync(client.CompanyId, 12500.01m);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        // The API formats the balance with the server's culture, so either decimal separator is accepted.
        Assert.Matches(@"^Payment exceeds the outstanding balance of 12500[.,]00\.$", await MessageAsync(response));
        await AssertUnchanged(balance: 12500);
    }

    [Fact]
    public async Task Payment_for_an_unknown_client_is_not_found()
    {
        await Data.AddClientAsync("Build-It Corp", balance: 12500);

        var response = await PayAsync(999_999, 10);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("Company not found.", await MessageAsync(response));
        await AssertUnchanged(balance: 12500);
    }

    [Fact]
    public async Task Exact_payment_settles_the_balance_and_is_listed_first()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 12500);
        await Data.AddReceiptAsync(client.CompanyId, 300, new DateTime(2020, 5, 1)); // before any payment made now

        var response = await PayAsync(client.CompanyId, 12500m);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await JsonAsync(response);
        Assert.Equal("SUCCESS", body.GetProperty("result").GetString());
        var receiptId = body.GetProperty("receiptId").GetString();
        Assert.Matches(@"^REC-\d+$", receiptId);
        Assert.Equal(0m, await Data.BalanceOfAsync("Build-It Corp"));

        var history = await Client.GetFromJsonAsync<JsonElement>("/api/payments/receipts");
        Assert.Equal(2, history.GetArrayLength());
        var newest = history[0];
        Assert.Equal(receiptId, newest.GetProperty("receiptId").GetString());
        Assert.Equal("Build-It Corp", newest.GetProperty("companyName").GetString());
        Assert.Equal(client.CompanyId, newest.GetProperty("companyId").GetInt32());
        Assert.Equal(12500m, newest.GetProperty("amount").GetDecimal());
    }

    [Fact]
    public async Task Partial_payment_reduces_the_balance_by_exactly_its_amount()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 12500);

        var response = await PayAsync(client.CompanyId, 100.50m);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(12399.50m, await Data.BalanceOfAsync("Build-It Corp"));
        Assert.Equal(100.50m, Assert.Single(await Data.ReceiptsAsync()).Amount);
    }

    private async Task AssertUnchanged(decimal balance)
    {
        Assert.Equal(balance, await Data.BalanceOfAsync("Build-It Corp"));
        Assert.Empty(await Data.ReceiptsAsync());
    }
}

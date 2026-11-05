using System.Net;
using Microsoft.EntityFrameworkCore;
using ZaeemDistribute.Api.Tests.Infrastructure;

namespace ZaeemDistribute.Api.Tests;

/// <summary>How the API answers a request that loses a race, forced here so the result never depends on timing.</summary>
public class ConflictHandlingTests(ApiFactory api) : ApiTest(api)
{
    [Fact]
    public async Task Payment_made_from_a_stale_balance_answers_409_and_records_nothing()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 200);
        Api.SaveFailures.FailNextSave(() => new DbUpdateConcurrencyException("Simulated: the client row changed after it was read."));

        var response = await PayAsync(client.CompanyId, 100m);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("The client's balance changed while this request was being processed. Please try again.", await MessageAsync(response));
        Assert.Equal(200m, await Data.BalanceOfAsync("Build-It Corp"));
        Assert.Empty(await Data.ReceiptsAsync());
    }

    [Fact]
    public async Task Retrying_after_a_conflict_is_judged_against_the_current_balance()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 200);
        Api.SaveFailures.FailNextSave(() => new DbUpdateConcurrencyException("Simulated: the client row changed after it was read."));
        await PayAsync(client.CompanyId, 100m);

        var retry = await PayAsync(client.CompanyId, 100m);

        Assert.Equal(HttpStatusCode.OK, retry.StatusCode);
        Assert.Equal(100m, await Data.BalanceOfAsync("Build-It Corp"));
        Assert.Single(await Data.ReceiptsAsync());
    }

    [Fact]
    public async Task Any_other_failure_still_answers_500()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 200);
        Api.SaveFailures.FailNextSave(() => new InvalidOperationException("Simulated: an unexpected fault."));

        var response = await PayAsync(client.CompanyId, 100m);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal(200m, await Data.BalanceOfAsync("Build-It Corp"));
    }
}

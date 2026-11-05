using System.Diagnostics;
using System.Net;
using Microsoft.Data.SqlClient;
using ZaeemDistribute.Api.Tests.Infrastructure;

namespace ZaeemDistribute.Api.Tests;

/// <summary>
/// Requests sent at the same moment. Each scenario repeats with fresh data, because a race a missing safeguard
/// allows is not lost every time. The checks are invariants; no test depends on which request wins.
/// </summary>
public class ConcurrencyTests(ApiFactory api) : ApiTest(api)
{
    private const int Repetitions = 10;

    [Fact]
    public async Task Two_orders_for_one_plate_at_the_same_moment_book_it_once()
    {
        for (var run = 0; run < Repetitions; run++)
        {
            await Data.ResetAsync();
            var client = await Data.AddClientAsync("Build-It Corp", balance: 0);

            var responses = await AtTheSameTime(
                () => PlaceOrderAsync(client.CompanyId, Line("DX-7728", "2030-11-01", "2030-11-03")),
                () => PlaceOrderAsync(client.CompanyId, Line("DX-7728", "2030-11-01", "2030-11-03")));

            Assert.Equal([HttpStatusCode.OK, HttpStatusCode.Conflict], responses.Select(r => r.StatusCode).Order());
            Assert.StartsWith("Scheduling conflict: plate DX-7728", await MessageAsync(responses.Single(r => r.StatusCode == HttpStatusCode.Conflict)));
            Assert.Single(await Data.RentalsAsync());
            Assert.Equal(900m, await Data.BalanceOfAsync("Build-It Corp"));
        }
    }

    [Fact]
    public async Task Two_orders_for_different_plates_of_one_client_both_succeed()
    {
        for (var run = 0; run < Repetitions; run++)
        {
            await Data.ResetAsync();
            var client = await Data.AddClientAsync("Build-It Corp", balance: 0);

            var responses = await AtTheSameTime(
                () => PlaceOrderAsync(client.CompanyId, Line("DX-7728", "2030-11-01", "2030-11-03")),
                () => PlaceOrderAsync(client.CompanyId, Line("PL-4491", "2030-11-01", "2030-11-03", dailyRate: 320)));

            Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
            Assert.Equal(2, (await Data.RentalsAsync()).Count);
            Assert.Equal(900m + 640m, await Data.BalanceOfAsync("Build-It Corp"));
        }
    }

    [Fact]
    public async Task Two_orders_for_different_clients_both_succeed()
    {
        for (var run = 0; run < Repetitions; run++)
        {
            await Data.ResetAsync();
            var first = await Data.AddClientAsync("Build-It Corp", balance: 0);
            var second = await Data.AddClientAsync("Swift Logistics", balance: 100);

            var responses = await AtTheSameTime(
                () => PlaceOrderAsync(first.CompanyId, Line("DX-7728", "2030-11-01", "2030-11-03")),
                () => PlaceOrderAsync(second.CompanyId, Line("PL-4491", "2030-11-01", "2030-11-03", dailyRate: 320)));

            Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
            Assert.Equal(900m, await Data.BalanceOfAsync("Build-It Corp"));
            Assert.Equal(100m + 640m, await Data.BalanceOfAsync("Swift Logistics"));
        }
    }

    [Fact]
    public async Task Order_that_cannot_get_its_turn_within_5_seconds_is_refused()
    {
        var client = await Data.AddClientAsync("Build-It Corp", balance: 0);

        // Another session holds the order lock (same resource name as OrdersController) for the whole attempt.
        await using var other = new SqlConnection(Api.ConnectionString);
        await other.OpenAsync();
        await using var holding = (SqlTransaction)await other.BeginTransactionAsync();
        await using (var take = new SqlCommand(
            "EXEC sp_getapplock @Resource = N'place-bulk-order', @LockMode = 'Exclusive', @LockOwner = 'Transaction';", other, holding))
        {
            await take.ExecuteNonQueryAsync();
        }

        var clock = Stopwatch.StartNew();
        var response = await PlaceOrderAsync(client.CompanyId, Line("DX-7728", "2030-11-01", "2030-11-03"));
        clock.Stop();
        await holding.RollbackAsync();

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("Another order was being placed at the same time. Please try again.", await MessageAsync(response));
        Assert.InRange(clock.Elapsed, TimeSpan.FromSeconds(4.5), TimeSpan.FromSeconds(30));
        Assert.Empty(await Data.RentalsAsync());
        Assert.Empty(await Data.OrdersAsync());
        Assert.Equal(0m, await Data.BalanceOfAsync("Build-It Corp"));
    }

    /// <summary>Sends every request at once: none starts until all are ready.</summary>
    private static async Task<HttpResponseMessage[]> AtTheSameTime(params Func<Task<HttpResponseMessage>>[] requests)
    {
        var go = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var sending = requests.Select(async send =>
        {
            await go.Task;
            return await send();
        }).ToArray();
        go.SetResult();
        return await Task.WhenAll(sending);
    }
}

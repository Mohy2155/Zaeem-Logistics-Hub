using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ZaeemDistribute.Api.Models;
using ZaeemDistribute.Api.Tests.Infrastructure;

namespace ZaeemDistribute.Api.Tests;

/// <summary>Checks the test harness itself: the right database, no seed data, and no data leaking between tests.</summary>
public class HarnessTests(ApiFactory api) : ApiTest(api)
{
    [Fact]
    public async Task Api_uses_the_per_run_test_database()
    {
        var connected = await Data.QueryAsync(db => Task.FromResult(db.Database.GetDbConnection().Database));

        Assert.Equal(Api.DatabaseName, connected);
        Assert.Contains(ApiFactory.TestDatabaseMarker, connected);
    }

    // Counted when the host started: every test's reset would hide seed rows from a check made here.
    [Fact]
    public void Startup_seed_data_is_switched_off() => Assert.Equal(0, Api.ClientsAtStartup);

    // Points at a database that does not exist, so a broken guard fails this test instead of deleting anything.
    [Fact]
    public async Task Reset_refuses_a_database_without_the_test_marker()
    {
        var services = new ServiceCollection()
            .AddDbContext<ZaeemDbContext>(o => o.UseSqlServer($"{ApiFactory.DefaultServer}Database=ZaeemDistribute_GuardProbe_DoesNotExist;"))
            .BuildServiceProvider();

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => new TestData(services).ResetAsync());

        Assert.Contains("Refusing to reset 'ZaeemDistribute_GuardProbe_DoesNotExist'", error.Message);
    }

    // Both tests insert the same client and expect to see exactly one, so whichever runs second proves the reset.
    [Fact]
    public async Task Rows_from_another_test_are_gone_first() => await AssertOnlyOwnProbeClient();

    [Fact]
    public async Task Rows_from_another_test_are_gone_second() => await AssertOnlyOwnProbeClient();

    private async Task AssertOnlyOwnProbeClient()
    {
        await Data.AddClientAsync("Isolation Probe", balance: 10);

        var clients = await Data.ClientsAsync();

        Assert.Single(clients, c => c.CompanyName == "Isolation Probe");
    }
}

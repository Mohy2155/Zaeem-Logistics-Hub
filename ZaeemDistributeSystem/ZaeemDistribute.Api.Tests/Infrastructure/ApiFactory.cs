using System.Diagnostics;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace ZaeemDistribute.Api.Tests.Infrastructure;

/// <summary>
/// Hosts the API in memory against a database created for this test run and dropped afterwards.
/// The server comes from ZAEEM_TEST_SQL (defaults to the local SQL Server with Windows authentication);
/// the database name always contains "_Test_", which <see cref="TestData"/> checks before deleting anything.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string DefaultServer = "Server=localhost;Trusted_Connection=True;TrustServerCertificate=True;";
    public const string TestDatabaseMarker = "_Test_";

    private static readonly TimeSpan ConnectRetryWindow = TimeSpan.FromSeconds(60);

    public ApiFactory()
    {
        var server = Environment.GetEnvironmentVariable("ZAEEM_TEST_SQL");
        ServerConnectionString = string.IsNullOrWhiteSpace(server) ? DefaultServer : server;
        DatabaseName = $"ZaeemDistribute{TestDatabaseMarker}{Guid.NewGuid():N}"[..29];
        ConnectionString = new SqlConnectionStringBuilder(ServerConnectionString) { InitialCatalog = DatabaseName }.ConnectionString;
    }

    public string ServerConnectionString { get; }
    public string DatabaseName { get; }
    public string ConnectionString { get; }

    /// <summary>Clients in the database right after startup, before any test resets it (0 when seeding is off).</summary>
    public int ClientsAtStartup { get; private set; }

    public TestData Data => new(Services);

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:DefaultConnection", ConnectionString);
        builder.UseSetting("Seed:Enabled", "false");
        builder.ConfigureAppConfiguration(config => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = ConnectionString,
            ["Seed:Enabled"] = "false",
        }));
    }

    async Task IAsyncLifetime.InitializeAsync()
    {
        await WaitForServerAsync();
        _ = Services; // Starting the host runs Program.cs, which creates and migrates the test database
        ClientsAtStartup = await Data.QueryAsync(db => db.Companies.CountAsync());
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        SqlConnection.ClearAllPools();
        await using var master = new SqlConnection(MasterConnectionString());
        await master.OpenAsync();
        await using var drop = master.CreateCommand();
        drop.CommandText = $"""
            IF DB_ID(N'{DatabaseName}') IS NOT NULL
            BEGIN
                ALTER DATABASE [{DatabaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                DROP DATABASE [{DatabaseName}];
            END
            """;
        await drop.ExecuteNonQueryAsync();
    }

    private string MasterConnectionString() =>
        new SqlConnectionStringBuilder(ServerConnectionString) { InitialCatalog = "master" }.ConnectionString;

    // A SQL Server container can take a while to accept logins after it reports "started".
    private async Task WaitForServerAsync()
    {
        var clock = Stopwatch.StartNew();
        while (true)
        {
            try
            {
                await using var connection = new SqlConnection(MasterConnectionString());
                await connection.OpenAsync();
                return;
            }
            catch (SqlException) when (clock.Elapsed < ConnectRetryWindow)
            {
                await Task.Delay(TimeSpan.FromSeconds(2));
            }
        }
    }
}

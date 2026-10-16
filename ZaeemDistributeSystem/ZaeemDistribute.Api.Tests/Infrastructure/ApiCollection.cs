using System.Net.Http.Json;
using System.Text.Json;

// Every test shares one database, so tests run one at a time.
[assembly: CollectionBehavior(DisableTestParallelization = true)]

namespace ZaeemDistribute.Api.Tests.Infrastructure;

/// <summary>All API tests share one <see cref="ApiFactory"/>: one host and one database per test run.</summary>
[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "api";
}

/// <summary>Base class for API tests: each test starts from an empty database and seeds only what it needs.</summary>
[Collection(ApiCollection.Name)]
public abstract class ApiTest : IAsyncLifetime
{
    protected ApiTest(ApiFactory api)
    {
        Api = api;
        Client = api.CreateClient();
        Data = api.Data;
    }

    protected ApiFactory Api { get; }
    protected HttpClient Client { get; }
    protected TestData Data { get; }

    public Task InitializeAsync() => Data.ResetAsync();

    public Task DisposeAsync()
    {
        Client.Dispose();
        return Task.CompletedTask;
    }

    /// <summary>One order line as the frontend sends it (camelCase JSON, dates as yyyy-MM-dd).</summary>
    protected static object Line(string plate, string start, string end, decimal lineTotal = 900m,
        decimal discount = 0, decimal taxPercent = 0, string machineName = "Excavator X3000", int machineId = 101) => new
    {
        machineId,
        machineName,
        plateNumber = plate,
        startDate = start,
        endDate = end,
        dailyRate = 450m,
        discount,
        taxPercent,
        taxType = "VAT",
        lineTotal,
    };

    protected Task<HttpResponseMessage> PlaceOrderAsync(int companyId, params object[] lines) =>
        Client.PostAsJsonAsync("/api/orders/place-bulk-order", new { companyId, items = lines });

    protected Task<HttpResponseMessage> PayAsync(int companyId, decimal amount) =>
        Client.PostAsJsonAsync("/api/payments/record", new { companyId, amount });

    protected static async Task<JsonElement> JsonAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>();

    /// <summary>The <c>message</c> of an error response.</summary>
    protected static async Task<string> MessageAsync(HttpResponseMessage response) =>
        (await JsonAsync(response)).GetProperty("message").GetString() ?? "";

    protected static DateTime Day(string isoDate) => DateTime.Parse(isoDate, System.Globalization.CultureInfo.InvariantCulture);
}

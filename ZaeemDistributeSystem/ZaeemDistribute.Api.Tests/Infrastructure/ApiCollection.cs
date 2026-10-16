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
}

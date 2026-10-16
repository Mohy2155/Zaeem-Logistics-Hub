using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using ZaeemDistribute.Api.Tests.Infrastructure;

namespace ZaeemDistribute.Api.Tests;

/// <summary>
/// Runs the shared contract cases (contracts/api-cases.json) against the real API.
/// The demo mock runs the same cases in zaeem-distribute-ui; the format is described in contracts/README.md.
/// </summary>
public class ContractTests(ApiFactory api) : ApiTest(api)
{
    private static readonly Lazy<JsonArray> Cases = new(() =>
    {
        var path = Path.Combine(AppContext.BaseDirectory, "contracts", "api-cases.json");
        return JsonNode.Parse(File.ReadAllText(path))!["cases"]!.AsArray();
    });

    public static TheoryData<string> CaseNames()
    {
        var names = new TheoryData<string>();
        foreach (var c in Cases.Value) names.Add(c!["name"]!.GetValue<string>());
        return names;
    }

    [Theory]
    [MemberData(nameof(CaseNames))]
    public async Task Api_matches_the_contract_case(string name)
    {
        var testCase = Cases.Value.Single(c => c!["name"]!.GetValue<string>() == name)!;
        await SeedAsync(testCase["given"]);

        var request = testCase["request"]!;
        using var response = await SendAsync(request["method"]!.GetValue<string>(), request["path"]!.GetValue<string>(), request["body"]);
        var body = await ReadJsonAsync(response);

        var expect = testCase["expect"]!.AsObject();
        var failures = new List<string>();

        var expectedStatus = expect["status"]!.GetValue<int>();
        if ((int)response.StatusCode != expectedStatus)
            failures.Add($"status: expected {expectedStatus}, got {(int)response.StatusCode} {body?.ToJsonString()}");

        if (expect["body"] is { } expectedBody) Match(expectedBody, body, "body", failures);

        var message = body is JsonObject o && o["message"] is JsonValue m && m.GetValueKind() == JsonValueKind.String ? m.GetValue<string>() : null;
        if (expect["message"] is { } exact && message != exact.GetValue<string>())
            failures.Add($"message: expected \"{exact}\", got \"{message}\"");
        if (expect["messageStartsWith"] is { } prefix && !(message ?? "").StartsWith(prefix.GetValue<string>(), StringComparison.Ordinal))
            failures.Add($"message: expected to start with \"{prefix}\", got \"{message}\"");

        await CheckStorageAsync(expect, failures);

        if (expect["rentalsAfter"] is { } rentalsAfter)
        {
            using var listing = await Client.GetAsync("/api/orders/rentals");
            Match(rentalsAfter, await ReadJsonAsync(listing), "rentalsAfter", failures);
        }

        Assert.True(failures.Count == 0, $"Contract case \"{name}\" failed against the API:\n  " + string.Join("\n  ", failures));
    }

    private async Task SeedAsync(JsonNode? given)
    {
        if (given is null) return;

        foreach (var c in Rows(given, "clients"))
            await Data.AddClientAsync(Str(c, "name"), Dec(c, "balance"), Dec(c, "discount"), c["active"]?.GetValue<bool>() ?? true, id: Int(c, "id"));

        foreach (var o in Rows(given, "orders"))
            await Data.AddOrderAsync(Int(o, "clientId"), Dec(o, "total"), o["status"]?.GetValue<string>() ?? "Processed", id: Int(o, "id"));

        foreach (var r in Rows(given, "rentals"))
            await Data.AddRentalAsync(Str(r, "client"), Str(r, "plate"), Day(Str(r, "start")), Day(Str(r, "end")), Dec(r, "total"),
                status: r["status"]?.GetValue<string>() ?? "Active",
                orderId: r["orderId"]?.GetValue<int>(),
                id: Int(r, "id"),
                machineName: r["machineName"]?.GetValue<string>() ?? "Excavator X3000",
                machineId: r["machineId"]?.GetValue<int>() ?? 101);

        foreach (var p in Rows(given, "receipts"))
            await Data.AddReceiptAsync(Int(p, "clientId"), Dec(p, "amount"),
                DateTime.Parse(Str(p, "paidAt"), CultureInfo.InvariantCulture), id: Int(p, "id"));
    }

    private async Task<HttpResponseMessage> SendAsync(string method, string path, JsonNode? body)
    {
        using var message = new HttpRequestMessage(new HttpMethod(method), path);
        if (body is not null) message.Content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json");
        return await Client.SendAsync(message);
    }

    private async Task CheckStorageAsync(JsonObject expect, List<string> failures)
    {
        if (expect["balances"] is JsonObject balances)
        {
            var clients = await Data.ClientsAsync();
            foreach (var (clientName, amount) in balances)
            {
                var client = clients.SingleOrDefault(c => c.CompanyName == clientName);
                if (client is null) failures.Add($"balances: no client named {clientName}");
                else if (client.OutstandingBalance != amount!.GetValue<decimal>())
                    failures.Add($"balances: {clientName} expected {amount}, got {client.OutstandingBalance}");
            }
        }

        var rentals = await Data.RentalsAsync();
        if (expect["rentalStatuses"] is JsonObject statuses)
        {
            foreach (var (plate, expected) in statuses)
            {
                var actual = rentals.Where(r => r.PlateNumber == plate).Select(r => r.Status).ToList();
                var wanted = expected is JsonArray list ? list.Select(s => s!.GetValue<string>()).ToList() : [expected!.GetValue<string>()];
                if (!actual.SequenceEqual(wanted))
                    failures.Add($"rentalStatuses: {plate} expected [{string.Join(", ", wanted)}], got [{string.Join(", ", actual)}]");
            }
        }

        if (expect["rentalCount"] is { } rentalCount && rentals.Count != rentalCount.GetValue<int>())
            failures.Add($"rentalCount: expected {rentalCount}, got {rentals.Count}");

        if (expect["receiptCount"] is { } receiptCount)
        {
            var receipts = await Data.ReceiptsAsync();
            if (receipts.Count != receiptCount.GetValue<int>())
                failures.Add($"receiptCount: expected {receiptCount}, got {receipts.Count}");
        }
    }

    /// <summary>Partial match: listed object properties only, arrays element by element, numbers by value.</summary>
    private static void Match(JsonNode? expected, JsonNode? actual, string path, List<string> failures)
    {
        switch (expected)
        {
            case JsonObject pattern when pattern.Count == 1 && pattern["$matches"] is { } regex:
                var text = actual is JsonValue v ? (v.GetValueKind() == JsonValueKind.String ? v.GetValue<string>() : v.ToJsonString()) : null;
                if (text is null || !Regex.IsMatch(text, regex.GetValue<string>()))
                    failures.Add($"{path}: expected to match /{regex}/, got {actual?.ToJsonString() ?? "nothing"}");
                break;

            case JsonObject obj:
                if (actual is not JsonObject actualObj)
                {
                    failures.Add($"{path}: expected an object, got {actual?.ToJsonString() ?? "nothing"}");
                    break;
                }
                foreach (var (key, value) in obj)
                {
                    if (!actualObj.TryGetPropertyValue(key, out var actualValue)) failures.Add($"{path}.{key}: missing");
                    else Match(value, actualValue, $"{path}.{key}", failures);
                }
                break;

            case JsonArray array:
                if (actual is not JsonArray actualArray || actualArray.Count != array.Count)
                {
                    failures.Add($"{path}: expected {array.Count} items, got {actual?.ToJsonString() ?? "nothing"}");
                    break;
                }
                for (var i = 0; i < array.Count; i++) Match(array[i], actualArray[i], $"{path}[{i}]", failures);
                break;

            case null:
                if (actual is not null) failures.Add($"{path}: expected null, got {actual.ToJsonString()}");
                break;

            default:
                var same = expected.GetValueKind() == JsonValueKind.Number
                    ? actual is JsonValue n && n.GetValueKind() == JsonValueKind.Number && n.GetValue<decimal>() == expected.GetValue<decimal>()
                    : actual is not null && JsonNode.DeepEquals(expected, actual);
                if (!same) failures.Add($"{path}: expected {expected.ToJsonString()}, got {actual?.ToJsonString() ?? "nothing"}");
                break;
        }
    }

    private static async Task<JsonNode?> ReadJsonAsync(HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync();
        return string.IsNullOrWhiteSpace(text) ? null : JsonNode.Parse(text);
    }

    private static IEnumerable<JsonNode> Rows(JsonNode given, string list) => given[list]?.AsArray().Select(r => r!) ?? [];
    private static string Str(JsonNode row, string field) => row[field]!.GetValue<string>();
    private static int Int(JsonNode row, string field) => row[field]!.GetValue<int>();
    private static decimal Dec(JsonNode row, string field) => row[field]?.GetValue<decimal>() ?? 0;
}

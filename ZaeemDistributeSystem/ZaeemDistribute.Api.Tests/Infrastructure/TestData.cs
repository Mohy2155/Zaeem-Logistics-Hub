using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ZaeemDistribute.Api.Models;

namespace ZaeemDistribute.Api.Tests.Infrastructure;

/// <summary>Resets the test database and seeds or reads rows directly, bypassing the API under test.</summary>
public sealed class TestData(IServiceProvider services)
{
    /// <summary>Deletes every row, child tables first. Refuses to touch a database that is not a test database.</summary>
    public async Task ResetAsync()
    {
        await UseAsync(async db =>
        {
            var name = db.Database.GetDbConnection().Database;
            if (!name.Contains(ApiFactory.TestDatabaseMarker, StringComparison.Ordinal))
                throw new InvalidOperationException($"Refusing to reset '{name}': API tests only run against a database whose name contains '{ApiFactory.TestDatabaseMarker}'.");

            await db.PaymentReceipts.ExecuteDeleteAsync();
            await db.RentalItems.ExecuteDeleteAsync();
            await db.BulkOrders.ExecuteDeleteAsync();
            await db.Products.ExecuteDeleteAsync();
            await db.Companies.ExecuteDeleteAsync();
        });
    }

    public Task<Company> AddClientAsync(string name, decimal balance = 0, decimal discount = 0, bool active = true, int? id = null) =>
        InsertAsync("Companies", id, new Company
        {
            CompanyId = id ?? 0,
            CompanyName = name,
            OutstandingBalance = balance,
            DefaultDiscount = discount,
            IsActive = active,
            CreatedAt = new DateTime(2030, 1, 1),
        });

    public Task<BulkOrder> AddOrderAsync(int companyId, decimal total, string status = "Processed", int? id = null) =>
        InsertAsync("BulkOrders", id, new BulkOrder
        {
            OrderId = id ?? 0,
            CompanyId = companyId,
            OrderDate = new DateTime(2030, 1, 1),
            TotalAmount = total,
            OrderStatus = status,
        });

    public Task<RentalItem> AddRentalAsync(string companyName, string plate, DateTime start, DateTime end, decimal total,
        string status = "Active", int? orderId = null, int? id = null, string machineName = "Excavator X3000", int machineId = 101) =>
        InsertAsync("RentalItems", id, new RentalItem
        {
            RentalItemId = id ?? 0,
            BulkOrderId = orderId,
            MachineId = machineId,
            MachineName = machineName,
            CompanyName = companyName,
            PlateNumber = plate,
            StartDate = start,
            EndDate = end,
            DailyRate = 450,
            Discount = 0,
            TotalAmount = total,
            Status = status,
            TaxType = "VAT",
            TaxPercent = 0,
        });

    public Task<PaymentReceipt> AddReceiptAsync(int companyId, decimal amount, DateTime paidAt, int? id = null) =>
        InsertAsync("PaymentReceipts", id, new PaymentReceipt
        {
            PaymentReceiptId = id ?? 0,
            CompanyId = companyId,
            Amount = amount,
            PaymentDate = paidAt,
        });

    public Task<decimal> BalanceOfAsync(string companyName) =>
        QueryAsync(db => db.Companies.Where(c => c.CompanyName == companyName).Select(c => c.OutstandingBalance).SingleAsync());

    public Task<List<RentalItem>> RentalsAsync() => QueryAsync(db => db.RentalItems.AsNoTracking().OrderBy(r => r.RentalItemId).ToListAsync());

    public Task<List<BulkOrder>> OrdersAsync() => QueryAsync(db => db.BulkOrders.AsNoTracking().OrderBy(o => o.OrderId).ToListAsync());

    public Task<List<PaymentReceipt>> ReceiptsAsync() => QueryAsync(db => db.PaymentReceipts.AsNoTracking().OrderBy(r => r.PaymentReceiptId).ToListAsync());

    public Task<List<Company>> ClientsAsync() => QueryAsync(db => db.Companies.AsNoTracking().OrderBy(c => c.CompanyId).ToListAsync());

    public async Task<T> QueryAsync<T>(Func<ZaeemDbContext, Task<T>> query)
    {
        T result = default!;
        await UseAsync(async db => result = await query(db));
        return result;
    }

    // An explicit id needs IDENTITY_INSERT on the same open connection (contract cases address rows by id).
    private async Task<T> InsertAsync<T>(string table, int? explicitId, T entity) where T : class
    {
        await UseAsync(async db =>
        {
            db.Add(entity);
            if (explicitId is null)
            {
                await db.SaveChangesAsync();
                return;
            }

            await db.Database.OpenConnectionAsync();
            try
            {
                await db.Database.ExecuteSqlRawAsync($"SET IDENTITY_INSERT [{table}] ON");
                await db.SaveChangesAsync();
                await db.Database.ExecuteSqlRawAsync($"SET IDENTITY_INSERT [{table}] OFF");
            }
            finally
            {
                await db.Database.CloseConnectionAsync();
            }
        });
        return entity;
    }

    private async Task UseAsync(Func<ZaeemDbContext, Task> work)
    {
        await using var scope = services.CreateAsyncScope();
        await work(scope.ServiceProvider.GetRequiredService<ZaeemDbContext>());
    }
}

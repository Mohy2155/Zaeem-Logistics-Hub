using Scalar.AspNetCore;
using Microsoft.EntityFrameworkCore;
using ZaeemDistribute.Api.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. ADD THIS: Define the CORS policy for Angular
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        policy.WithOrigins("http://localhost:4200") // Trust this exact URL
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddDbContext<ZaeemDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

app.MapOpenApi();
app.MapScalarApiReference();

// 2. ADD THIS: Enforce the CORS policy BEFORE mapping controllers
app.UseCors("AllowAngularApp"); 

app.UseAuthorization();
app.MapControllers();

// Seed data inside scope for development testing
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ZaeemDbContext>();
        
        // Ensure table is seeded
        if (!context.Companies.Any())
        {
            var companies = new List<Company>
            {
                new Company { CompanyName = "Build-It Corp", OutstandingBalance = 12500, DefaultDiscount = 10, IsActive = true, CreatedAt = DateTime.Now },
                new Company { CompanyName = "Swift Logistics", OutstandingBalance = 85000, DefaultDiscount = 15, IsActive = true, CreatedAt = DateTime.Now },
                new Company { CompanyName = "Mega Structures", OutstandingBalance = 0, DefaultDiscount = 5, IsActive = true, CreatedAt = DateTime.Now }
            };
            context.Companies.AddRange(companies);
            context.SaveChanges();
        }

        if (!context.Products.Any())
        {
            var products = new List<Product>
            {
                new Product { SKU = "EXC-3000", ProductName = "Excavator X3000", UnitPrice = 450, StockQuantity = 5, CreatedAt = DateTime.Now },
                new Product { SKU = "CAT-LDR", ProductName = "Caterpillar Loader", UnitPrice = 320, StockQuantity = 10, CreatedAt = DateTime.Now },
                new Product { SKU = "TOW-CRN", ProductName = "Tower Crane T1", UnitPrice = 850, StockQuantity = 2, CreatedAt = DateTime.Now },
                new Product { SKU = "BUL-D9", ProductName = "Bulldozer D9", UnitPrice = 550, StockQuantity = 4, CreatedAt = DateTime.Now },
                new Product { SKU = "ASH-PVR", ProductName = "Asphalt Paver", UnitPrice = 400, StockQuantity = 3, CreatedAt = DateTime.Now }
            };
            context.Products.AddRange(products);
            context.SaveChanges();
        }

        if (!context.RentalItems.Any())
        {
            var rentals = new List<RentalItem>
            {
                new RentalItem
                {
                    MachineId = 101,
                    MachineName = "Excavator X3000",
                    CompanyName = "Build-It Corp",
                    PlateNumber = "DX-7728",
                    StartDate = DateTime.Now.AddDays(-2),
                    EndDate = DateTime.Now.AddDays(5),
                    DailyRate = 450,
                    Discount = 10,
                    TotalAmount = 2025,
                    Status = "Active"
                },
                new RentalItem
                {
                    MachineId = 102,
                    MachineName = "Caterpillar Loader",
                    CompanyName = "Swift Logistics",
                    PlateNumber = "PL-4491",
                    StartDate = DateTime.Now.AddDays(-1),
                    EndDate = DateTime.Now.AddDays(6),
                    DailyRate = 320,
                    Discount = 15,
                    TotalAmount = 1904,
                    Status = "Active"
                }
            };
            context.RentalItems.AddRange(rentals);
            context.SaveChanges();
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"An error occurred during database seeding: {ex.Message}");
    }
}

app.Run();
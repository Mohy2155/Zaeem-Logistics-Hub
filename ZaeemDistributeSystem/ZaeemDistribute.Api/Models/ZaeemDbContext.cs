using Microsoft.EntityFrameworkCore;
using ZaeemDistribute.Api.DTOs; // Added to access the DTO

namespace ZaeemDistribute.Api.Models
{
    public class ZaeemDbContext : DbContext
    {
        public ZaeemDbContext(DbContextOptions<ZaeemDbContext> options) : base(options) { }

        public DbSet<Company> Companies { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<BulkOrder> BulkOrders { get; set; }
        public DbSet<PaymentReceipt> PaymentReceipts { get; set; }
        public DbSet<RentalItem> RentalItems { get; set; }
        
        // This acts as the catcher's mitt for our Stored Procedure output
        public DbSet<OrderResultDto> OrderResults { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Company>().Property(c => c.OutstandingBalance).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<Company>().Property(c => c.DefaultDiscount).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<Product>().Property(p => p.UnitPrice).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<BulkOrder>().Property(b => b.TotalAmount).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<PaymentReceipt>().Property(p => p.Amount).HasColumnType("decimal(18,2)");
            
            modelBuilder.Entity<RentalItem>().Property(r => r.DailyRate).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<RentalItem>().Property(r => r.Discount).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<RentalItem>().Property(r => r.TotalAmount).HasColumnType("decimal(18,2)");

            // Tell EF Core this is a temporary result, not a real table
            modelBuilder.Entity<OrderResultDto>().HasNoKey();
            modelBuilder.Entity<OrderResultDto>().Property(o => o.AmountBilled).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<OrderResultDto>().Property(o => o.OutstandingBalance).HasColumnType("decimal(18,2)");
        }
    }
}
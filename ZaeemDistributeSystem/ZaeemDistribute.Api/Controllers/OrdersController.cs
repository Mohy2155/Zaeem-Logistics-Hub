using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZaeemDistribute.Api.Models;
using ZaeemDistribute.Api.DTOs;
using System.Linq;
using System.Threading.Tasks;

namespace ZaeemDistribute.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdersController : ControllerBase
    {
        private readonly ZaeemDbContext _context;

        public OrdersController(ZaeemDbContext context)
        {
            _context = context;
        }


        // POST: api/orders/place-bulk-order
        [HttpPost("place-bulk-order")]
        public async Task<IActionResult> PlaceBulkOrder([FromBody] OrderRequestDto request)
        {
            try 
            {
                // Attempt to use the Stored Procedure
                var result = await _context.OrderResults
                    .FromSqlRaw("EXEC sp_CheckCreditAndPlaceOrder @CompanyId = {0}, @OrderTotal = {1}", 
                                request.CompanyId, request.OrderTotal) 
                    .ToListAsync();

                var orderResult = result.FirstOrDefault();
                
                if (orderResult != null)
                {
                    // Seed/store rental items in DB
                    if (request.Items != null && request.Items.Any())
                    {
                        var companyName = (await _context.Companies.FindAsync(request.CompanyId))?.CompanyName ?? "Unknown Company";
                        foreach (var item in request.Items)
                        {
                            var rental = new RentalItem
                            {
                                MachineId = item.MachineId,
                                MachineName = item.MachineName,
                                CompanyName = companyName,
                                PlateNumber = item.PlateNumber,
                                StartDate = DateTime.TryParse(item.StartDate, out var sDate) ? sDate : DateTime.Now,
                                EndDate = DateTime.TryParse(item.EndDate, out var eDate) ? eDate : DateTime.Now.AddDays(7),
                                DailyRate = item.DailyRate,
                                Discount = item.Discount,
                                TotalAmount = item.LineTotal,
                                Status = "Active",
                                TaxType = item.TaxType,
                                TaxPercent = item.TaxPercent
                            };
                            _context.RentalItems.Add(rental);
                        }
                        await _context.SaveChangesAsync();
                    }
                    return Ok(orderResult);
                }

                return BadRequest(new { message = "Transaction could not be processed by database." });
            }
            catch (Exception)
            {
                // FALLBACK: If Stored Procedure is missing, perform a basic C# implementation
                // This ensures the system remains functional during development
                var company = await _context.Companies.FindAsync(request.CompanyId);
                if (company == null) return NotFound(new { message = "Company not found" });

                // Increase balance (Balance Due System)
                company.OutstandingBalance += request.OrderTotal;

                // Create the record
                var newOrder = new BulkOrder {
                    CompanyId = request.CompanyId,
                    OrderDate = DateTime.Now,
                    TotalAmount = request.OrderTotal,
                    OrderStatus = "Processed"
                };

                _context.BulkOrders.Add(newOrder);

                if (request.Items != null && request.Items.Any())
                {
                    foreach (var item in request.Items)
                    {
                        var rental = new RentalItem
                        {
                            MachineId = item.MachineId,
                            MachineName = item.MachineName,
                            CompanyName = company.CompanyName,
                            PlateNumber = item.PlateNumber,
                            StartDate = DateTime.TryParse(item.StartDate, out var sDate) ? sDate : DateTime.Now,
                            EndDate = DateTime.TryParse(item.EndDate, out var eDate) ? eDate : DateTime.Now.AddDays(7),
                            DailyRate = item.DailyRate,
                            Discount = item.Discount,
                            TotalAmount = item.LineTotal,
                            Status = "Active",
                            TaxType = item.TaxType,
                            TaxPercent = item.TaxPercent
                        };
                        _context.RentalItems.Add(rental);
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new OrderResultDto {
                    OrderId = newOrder.OrderId,
                    Result = "SUCCESS",
                    AmountBilled = request.OrderTotal,
                    OutstandingBalance = company.OutstandingBalance
                });
            }
        }

        // GET: api/orders/rentals
        [HttpGet("rentals")]
        public async Task<IActionResult> GetRentals()
        {
            var rentals = await _context.RentalItems.ToListAsync();
            return Ok(rentals);
        }

        // DELETE: api/orders/rentals/{id}
        [HttpDelete("rentals/{id}")]
        public async Task<IActionResult> DeleteRentalItem(int id)
        {
            var rental = await _context.RentalItems.FindAsync(id);
            if (rental == null)
            {
                return NotFound(new { message = "Rental item not found" });
            }

            // Recalculate ledger balance: deduct rental's total amount from company's outstanding balance
            var company = await _context.Companies.FirstOrDefaultAsync(c => c.CompanyName == rental.CompanyName);
            if (company != null)
            {
                company.OutstandingBalance = Math.Max(0, company.OutstandingBalance - rental.TotalAmount);
            }

            _context.RentalItems.Remove(rental);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Rental item cancelled and removed successfully", outstandingBalance = company?.OutstandingBalance });
        }

        // POST: api/orders/cancel/{id}
        [HttpPost("cancel/{id}")]
        public async Task<IActionResult> CancelOrder(int id)
        {
            var order = await _context.BulkOrders.FindAsync(id);
            if (order == null)
            {
                return NotFound(new { message = "Order not found" });
            }

            if (order.OrderStatus == "Cancelled")
            {
                return BadRequest(new { message = "Order is already cancelled" });
            }

            var company = await _context.Companies.FindAsync(order.CompanyId);
            if (company != null)
            {
                // Reverse the balance increase (Balance Due System)
                company.OutstandingBalance -= order.TotalAmount;

                // Also cancel associated rental items
                var activeRentals = await _context.RentalItems
                    .Where(r => r.CompanyName == company.CompanyName && r.Status == "Active")
                    .ToListAsync();
                foreach (var rental in activeRentals)
                {
                    rental.Status = "Cancelled";
                }
            }

            order.OrderStatus = "Cancelled";
            await _context.SaveChangesAsync();

            return Ok(new { message = "Order cancelled successfully", outstandingBalance = company?.OutstandingBalance });
        }
    }

    // This is the catcher's mitt for the JSON. 
    // .NET automatically maps Angular's lowercase JSON to these uppercase C# properties.
    public class OrderRequestDto
    {
        public int CompanyId { get; set; }
        public decimal OrderTotal { get; set; }
        public List<OrderItemDto> Items { get; set; } = new List<OrderItemDto>();
    }

    public class OrderItemDto
    {
        public int MachineId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string MachineName { get; set; } = string.Empty;
        public string PlateNumber { get; set; } = string.Empty;
        public string StartDate { get; set; } = string.Empty;
        public string EndDate { get; set; } = string.Empty;
        public int RentalDays { get; set; }
        public decimal DailyRate { get; set; }
        public decimal Discount { get; set; }
        public decimal TaxPercent { get; set; }
        public string TaxType { get; set; } = string.Empty;
        public decimal LineTotal { get; set; }
    }
}
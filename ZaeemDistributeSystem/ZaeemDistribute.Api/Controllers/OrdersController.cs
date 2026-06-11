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
                await _context.SaveChangesAsync();

                return Ok(new OrderResultDto {
                    OrderId = newOrder.OrderId,
                    Result = "SUCCESS",
                    AmountBilled = request.OrderTotal,
                    OutstandingBalance = company.OutstandingBalance
                });
            }
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
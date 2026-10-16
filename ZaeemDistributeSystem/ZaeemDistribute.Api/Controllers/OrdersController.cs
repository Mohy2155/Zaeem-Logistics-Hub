using System.Data;
using System.Globalization;
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
            if (request.Items == null || request.Items.Count == 0)
                return BadRequest(new { message = "Order must contain at least one item." });

            // 1. Validate every line before touching the database
            var lines = new List<(OrderItemDto Item, string Plate, DateTime Start, DateTime End)>();
            foreach (var item in request.Items)
            {
                var plate = item.PlateNumber.Trim().ToUpperInvariant();
                if (plate.Length == 0)
                    return BadRequest(new { message = $"Plate number is required for {item.MachineName}." });
                if (!TryParseDay(item.StartDate, out var start) || !TryParseDay(item.EndDate, out var end))
                    return BadRequest(new { message = $"Invalid rental dates for plate {plate}." });
                if (end <= start)
                    return BadRequest(new { message = $"End date must be after start date for plate {plate}." });
                if (item.LineTotal < 0 || item.Discount < 0 || item.Discount > 100 || item.TaxPercent < 0)
                    return BadRequest(new { message = $"Invalid pricing for plate {plate}." });

                lines.Add((item, plate, start, end));
            }

            // Serializable so two concurrent orders cannot both pass the double-booking check
            await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var company = await _context.Companies.FindAsync(request.CompanyId);
            if (company == null) return NotFound(new { message = "Company not found." });

            // 2. Double-booking check: against active bookings and within the order itself
            var plates = lines.Select(l => l.Plate).Distinct().ToList();
            var booked = await _context.RentalItems
                .Where(r => r.Status != "Cancelled" && plates.Contains(r.PlateNumber))
                .Select(r => new { r.PlateNumber, r.StartDate, r.EndDate })
                .ToListAsync();

            var taken = booked.Select(b => (Plate: b.PlateNumber.Trim().ToUpperInvariant(), Start: b.StartDate.Date, End: b.EndDate.Date)).ToList();
            foreach (var line in lines)
            {
                // End dates are inclusive: the machine is unavailable on its return day
                if (taken.Any(t => t.Plate == line.Plate && line.Start <= t.End && line.End >= t.Start))
                {
                    return Conflict(new { message = $"Scheduling conflict: plate {line.Plate} is already booked during {line.Start:yyyy-MM-dd} to {line.End:yyyy-MM-dd}." });
                }
                taken.Add((line.Plate, line.Start, line.End));
            }

            // 3. Bill the order (Balance Due System) from the line items, not a client-supplied total
            var orderTotal = lines.Sum(l => Math.Round(l.Item.LineTotal, 2));
            company.OutstandingBalance += orderTotal;

            var order = new BulkOrder
            {
                CompanyId = company.CompanyId,
                OrderDate = DateTime.Now,
                TotalAmount = orderTotal,
                OrderStatus = "Processed"
            };
            _context.BulkOrders.Add(order);
            await _context.SaveChangesAsync(); // Assigns order.OrderId

            foreach (var (item, plate, start, end) in lines)
            {
                _context.RentalItems.Add(new RentalItem
                {
                    BulkOrderId = order.OrderId,
                    MachineId = item.MachineId,
                    MachineName = item.MachineName,
                    CompanyName = company.CompanyName,
                    PlateNumber = plate,
                    StartDate = start,
                    EndDate = end,
                    DailyRate = item.DailyRate,
                    Discount = item.Discount,
                    TotalAmount = Math.Round(item.LineTotal, 2),
                    Status = "Active",
                    TaxType = item.TaxType,
                    TaxPercent = item.TaxPercent
                });
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new OrderResultDto
            {
                OrderId = order.OrderId,
                Result = "SUCCESS",
                AmountBilled = orderTotal,
                OutstandingBalance = company.OutstandingBalance
            });
        }

        // GET: api/orders/rentals
        [HttpGet("rentals")]
        public async Task<IActionResult> GetRentals()
        {
            var rentals = await _context.RentalItems.ToListAsync();
            return Ok(rentals);
        }

        // DELETE: api/orders/rentals/{id}
        // Soft-cancels so the ledger keeps its history; repeating the call does not reverse the charge twice.
        [HttpDelete("rentals/{id}")]
        public async Task<IActionResult> DeleteRentalItem(int id)
        {
            var rental = await _context.RentalItems.FindAsync(id);
            if (rental == null)
            {
                return NotFound(new { message = "Rental item not found" });
            }
            if (rental.Status == "Cancelled")
            {
                return BadRequest(new { message = "Rental item is already cancelled" });
            }

            // Reverse the rental's charge; a negative balance is a credit owed to the client
            var company = await _context.Companies.FirstOrDefaultAsync(c => c.CompanyName == rental.CompanyName);
            if (company != null)
            {
                company.OutstandingBalance -= rental.TotalAmount;
            }

            rental.Status = "Cancelled";
            await _context.SaveChangesAsync();

            return Ok(new { message = "Rental item cancelled successfully", outstandingBalance = company?.OutstandingBalance });
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

            // Only this order's rentals. Ones cancelled individually were already reversed.
            var rentals = await _context.RentalItems.Where(r => r.BulkOrderId == order.OrderId).ToListAsync();
            var alreadyReversed = rentals.Where(r => r.Status == "Cancelled").Sum(r => r.TotalAmount);
            foreach (var rental in rentals)
            {
                rental.Status = "Cancelled";
            }

            var company = await _context.Companies.FindAsync(order.CompanyId);
            if (company != null)
            {
                company.OutstandingBalance -= order.TotalAmount - alreadyReversed;
            }

            order.OrderStatus = "Cancelled";
            await _context.SaveChangesAsync();

            return Ok(new { message = "Order cancelled successfully", outstandingBalance = company?.OutstandingBalance });
        }

        private static bool TryParseDay(string value, out DateTime day)
        {
            var ok = DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed);
            day = parsed.Date;
            return ok;
        }
    }

    // This is the catcher's mitt for the JSON.
    // .NET automatically maps Angular's lowercase JSON to these uppercase C# properties.
    public class OrderRequestDto
    {
        public int CompanyId { get; set; }
        public List<OrderItemDto> Items { get; set; } = new List<OrderItemDto>();
    }

    public class OrderItemDto
    {
        public int MachineId { get; set; }
        public string MachineName { get; set; } = string.Empty;
        public string PlateNumber { get; set; } = string.Empty;
        public string StartDate { get; set; } = string.Empty;
        public string EndDate { get; set; } = string.Empty;
        public decimal DailyRate { get; set; }
        public decimal Discount { get; set; }
        public decimal TaxPercent { get; set; }
        public string TaxType { get; set; } = string.Empty;
        public decimal LineTotal { get; set; }
    }
}

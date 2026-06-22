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
    public class CompaniesController : ControllerBase
    {
        private readonly ZaeemDbContext _context;

        // Dependency Injection: The API automatically hands this controller the database connection
        public CompaniesController(ZaeemDbContext context)
        {
            _context = context;
        }

        // GET: api/companies
        [HttpGet]
        public async Task<IActionResult> GetCompanies()
        {
            // 1. Query the database using EF Core
            // 2. Map the raw Model to our secure DTO
            var companies = await _context.Companies
                .Where(c => c.IsActive == true) // Only get active companies
                .Select(c => new CompanyResponseDto
                {
                    CompanyId = c.CompanyId,
                    CompanyName = c.CompanyName,
                    OutstandingBalance = c.OutstandingBalance,
                    DefaultDiscount = c.DefaultDiscount
                })
                .ToListAsync();

            // 3. Return HTTP 200 OK with the data
            return Ok(companies);
        }

        // POST: api/payments/record
        [HttpPost("/api/payments/record")]
        public async Task<IActionResult> RecordPayment([FromBody] PaymentRequestDto request)
        {
            // 1. Fetch the target company from the database
            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.CompanyId == request.CompanyId);

            if (company == null)
            {
                return NotFound(new { message = "Company not found." });
            }

            // 2. Deduct the payment amount from the outstanding balance
            company.OutstandingBalance -= request.Amount;

            // 3. Instantiate a new ledger tracking instance (Payment Receipt)
            var receipt = new PaymentReceipt
            {
                CompanyId = request.CompanyId,
                Amount = request.Amount,
                PaymentDate = DateTime.UtcNow
            };

            _context.PaymentReceipts.Add(receipt);

            // 4. Persist all changes asynchronously
            await _context.SaveChangesAsync();

            // 5. Return Ok (200) JSON object response
            return Ok(new
            {
                result = "SUCCESS",
                receiptId = "REC-" + receipt.PaymentReceiptId
            });
        }

        // GET: api/payments/receipts
        [HttpGet("/api/payments/receipts")]
        public async Task<IActionResult> GetReceipts()
        {
            var receipts = await _context.PaymentReceipts
                .Include(r => r.Company)
                .OrderByDescending(r => r.PaymentDate)
                .Select(r => new
                {
                    receiptId = "REC-" + r.PaymentReceiptId,
                    companyId = r.CompanyId,
                    companyName = r.Company != null ? r.Company.CompanyName : "Unknown",
                    amount = r.Amount,
                    paymentDate = r.PaymentDate
                })
                .ToListAsync();

            return Ok(receipts);
        }
    }
}

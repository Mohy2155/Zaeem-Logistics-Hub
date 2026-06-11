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
    }



}
using System;

namespace ZaeemDistribute.Api.Models
{
    public class Company
    {
        public int CompanyId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public decimal OutstandingBalance { get; set; }
        public decimal DefaultDiscount { get; set; } 
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}   
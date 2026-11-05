using System;
using System.ComponentModel.DataAnnotations;

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

        // Changes on every update. A save made from a stale copy matches no row and throws
        // DbUpdateConcurrencyException (409), so simultaneous balance changes are never lost.
        [Timestamp]
        public byte[] RowVersion { get; set; } = [];
    }
}   
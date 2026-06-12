using System;

namespace ZaeemDistribute.Api.Models
{
    public class PaymentReceipt
    {
        public int PaymentReceiptId { get; set; }
        public int CompanyId { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }

        // Navigation property
        public Company? Company { get; set; }
    }
}

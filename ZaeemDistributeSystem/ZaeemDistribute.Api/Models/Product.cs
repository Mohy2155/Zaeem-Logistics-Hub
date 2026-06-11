using System;

namespace ZaeemDistribute.Api.Models
{
    public class Product
    {
        public int ProductId { get; set; }
        public string SKU { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
        public int StockQuantity { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
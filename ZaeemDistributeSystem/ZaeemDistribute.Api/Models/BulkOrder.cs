using System;
using System.ComponentModel.DataAnnotations; 
namespace ZaeemDistribute.Api.Models
{
    public class BulkOrder
    {

        [Key] //Explicitly told EF Core: "THIS is the Primary Key"
        public int OrderId { get; set; }
        public int CompanyId { get; set; }
        public DateTime OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string OrderStatus { get; set; } = string.Empty;
        public Company? Company { get; set; }
    }
}
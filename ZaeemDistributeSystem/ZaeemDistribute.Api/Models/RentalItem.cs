using System;
using System.ComponentModel.DataAnnotations;

namespace ZaeemDistribute.Api.Models
{
    public class RentalItem
    {
        [Key]
        public int RentalItemId { get; set; }
        public int MachineId { get; set; }
        public string MachineName { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public string PlateNumber { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal DailyRate { get; set; }
        public decimal Discount { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "Active";
    }
}

using System.ComponentModel.DataAnnotations.Schema;

namespace ZaeemDistribute.Api.DTOs
{
    public class OrderResultDto
    {
        public int? OrderId { get; set; }
        public string Result { get; set; } = string.Empty;
        public decimal AmountBilled { get; set; }
        public decimal OutstandingBalance { get; set; }

        // What each line billed, in request order. Not mapped: this class is still registered as a keyless EF entity.
        [NotMapped]
        public List<BilledLineDto> Lines { get; set; } = [];
    }

    public class BilledLineDto
    {
        public string PlateNumber { get; set; } = string.Empty;
        public decimal Amount { get; set; }
    }
}

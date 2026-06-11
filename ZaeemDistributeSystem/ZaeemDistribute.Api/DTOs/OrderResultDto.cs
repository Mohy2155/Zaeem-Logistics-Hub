namespace ZaeemDistribute.Api.DTOs
{
    public class OrderResultDto
    {
        public int? OrderId { get; set; } 
        public string Result { get; set; } = string.Empty;
        public decimal AmountBilled { get; set; }
        public decimal OutstandingBalance { get; set; }
    }
}
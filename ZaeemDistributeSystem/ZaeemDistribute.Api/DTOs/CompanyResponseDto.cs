namespace ZaeemDistribute.Api.DTOs
{
    public class CompanyResponseDto
    {
        public int CompanyId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public decimal OutstandingBalance { get; set; }
        public decimal DefaultDiscount { get; set; }
    }
}
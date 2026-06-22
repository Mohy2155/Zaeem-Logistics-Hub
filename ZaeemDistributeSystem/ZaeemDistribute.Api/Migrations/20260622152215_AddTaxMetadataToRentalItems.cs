using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ZaeemDistribute.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTaxMetadataToRentalItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "TaxPercent",
                table: "RentalItems",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "TaxType",
                table: "RentalItems",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TaxPercent",
                table: "RentalItems");

            migrationBuilder.DropColumn(
                name: "TaxType",
                table: "RentalItems");
        }
    }
}

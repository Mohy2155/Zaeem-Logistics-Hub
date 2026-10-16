using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ZaeemDistribute.Api.Migrations
{
    /// <inheritdoc />
    public partial class LinkRentalItemsToBulkOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BulkOrderId",
                table: "RentalItems",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BulkOrderId",
                table: "RentalItems");
        }
    }
}

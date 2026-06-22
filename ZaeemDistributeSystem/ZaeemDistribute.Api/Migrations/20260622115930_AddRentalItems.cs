using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ZaeemDistribute.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRentalItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AvailableCredit",
                table: "Companies");

            migrationBuilder.RenameColumn(
                name: "RemainingCredit",
                table: "OrderResults",
                newName: "OutstandingBalance");

            migrationBuilder.RenameColumn(
                name: "AmountDeducted",
                table: "OrderResults",
                newName: "AmountBilled");

            migrationBuilder.RenameColumn(
                name: "CreditLimit",
                table: "Companies",
                newName: "OutstandingBalance");

            migrationBuilder.CreateTable(
                name: "PaymentReceipts",
                columns: table => new
                {
                    PaymentReceiptId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PaymentDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentReceipts", x => x.PaymentReceiptId);
                    table.ForeignKey(
                        name: "FK_PaymentReceipts_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "CompanyId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RentalItems",
                columns: table => new
                {
                    RentalItemId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MachineId = table.Column<int>(type: "int", nullable: false),
                    MachineName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CompanyName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PlateNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DailyRate = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Discount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RentalItems", x => x.RentalItemId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentReceipts_CompanyId",
                table: "PaymentReceipts",
                column: "CompanyId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaymentReceipts");

            migrationBuilder.DropTable(
                name: "RentalItems");

            migrationBuilder.RenameColumn(
                name: "OutstandingBalance",
                table: "OrderResults",
                newName: "RemainingCredit");

            migrationBuilder.RenameColumn(
                name: "AmountBilled",
                table: "OrderResults",
                newName: "AmountDeducted");

            migrationBuilder.RenameColumn(
                name: "OutstandingBalance",
                table: "Companies",
                newName: "CreditLimit");

            migrationBuilder.AddColumn<decimal>(
                name: "AvailableCredit",
                table: "Companies",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }
    }
}

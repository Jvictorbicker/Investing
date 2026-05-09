using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Investing.Migrations
{
    /// <inheritdoc />
    public partial class AddFotoUrlColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FotoUrl",
                table: "AspNetUsers",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FotoUrl",
                table: "AspNetUsers");
        }
    }
}

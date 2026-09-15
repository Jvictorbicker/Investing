using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using AtivoApi.Models;

namespace AtivoApi.Data;

// Troca DbContext por IdentityDbContext<ApplicationUser>
public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Carteira> Carteiras { get; set; }
    public DbSet<Ativo> Ativos { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Relação 1:N → User pode ter várias Carteiras
        builder.Entity<ApplicationUser>()
            .HasMany(u => u.Carteiras)
            .WithOne(c => c.User)
            .HasForeignKey(c => c.UserId);

        // Relação 1:N → Carteira tem muitos Ativos
        builder.Entity<Carteira>()
            .HasMany(c => c.Ativos)
            .WithOne(a => a.Carteira)
            .HasForeignKey(a => a.CarteiraId);
    }
}
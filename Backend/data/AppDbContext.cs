
using Microsoft.EntityFrameworkCore;
using AtivoApi.Models;

namespace AtivoApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<Carteira> Carteiras { get; set; }
    public DbSet<Ativo> Ativos { get; set; }

    public DbSet<SolicitacaoCadastro> SolicitacoesCadastro { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Usuario>()
            .HasMany(u => u.Carteiras)
            .WithOne(c => c.Usuario)
            .HasForeignKey(c => c.UsuarioId);

        builder.Entity<Carteira>()
            .HasMany(c => c.Ativos)
            .WithOne(a => a.Carteira)
            .HasForeignKey(a => a.CarteiraId);

        // Informa ao EF Core que a tabela possui triggers.
        builder.Entity<SolicitacaoCadastro>()
            .ToTable("SolicitacaoCadastro", "dbo", table =>
            {
                table.HasTrigger("TR_SolicitacaoCadastro_Auditoria");
            });
    }
}

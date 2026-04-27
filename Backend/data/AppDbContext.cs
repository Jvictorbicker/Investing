using Microsoft.EntityFrameworkCore;
using AtivoApi.Models;

namespace AtivoApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Ativo> Ativos { get; set; }
}
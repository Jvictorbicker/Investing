using AtivoApi.Data;
using AtivoApi.Models;
using Microsoft.EntityFrameworkCore;

namespace AtivoApi.Services;

public record CarteiraResumoDto(long Id, string Nome, int QtdAtivos);

public class CarteiraService
{
    private readonly AppDbContext _context;

    public CarteiraService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<CarteiraResumoDto>> ListarAsync(string userId)
    {
        return await _context.Carteiras
            .Where(c => c.UserId == userId)
            .Select(c => new CarteiraResumoDto(c.Id, c.Nome, c.Ativos.Count))
            .ToListAsync();
    }

    public async Task<Carteira> CriarAsync(string nome, string userId)
    {
        var carteira = new Carteira { Nome = nome, UserId = userId };
        _context.Carteiras.Add(carteira);
        await _context.SaveChangesAsync();
        return carteira;
    }

    // Garante que a carteira existe e pertence ao usuário logado.
    // Usado também pelo AtivoService antes de listar/criar ativos numa carteira.
    public async Task<Carteira> ObterEValidarAsync(long carteiraId, string userId)
    {
        var carteira = await _context.Carteiras
            .FirstOrDefaultAsync(c => c.Id == carteiraId && c.UserId == userId);

        if (carteira is null)
            throw new UnauthorizedAccessException("Carteira não encontrada ou não pertence ao usuário.");

        return carteira;
    }

    public async Task DeletarAsync(long carteiraId, string userId)
    {
        var carteira = await ObterEValidarAsync(carteiraId, userId);
        _context.Carteiras.Remove(carteira); // cascata remove os ativos da carteira
        await _context.SaveChangesAsync();
    }
}
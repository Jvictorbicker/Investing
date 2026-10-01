using AtivoApi.Data;
using AtivoApi.Models;
using Microsoft.EntityFrameworkCore;

namespace AtivoApi.Services;

public record CarteiraResumoDto(
    long Id,
    string Nome,
    int QtdAtivos
);

public class CarteiraService
{
    private readonly AppDbContext _context;

    public CarteiraService(AppDbContext context)
    {
        _context = context;
    }

    // ============================================================
    // LISTAR CARTEIRAS DO USUÁRIO
    // ============================================================

    public async Task<List<CarteiraResumoDto>>
        ListarAsync(int usuarioId)
    {
        return await _context.Carteiras
            .Where(c => c.UsuarioId == usuarioId)
            .Select(c =>
                new CarteiraResumoDto(
                    c.Id,
                    c.Nome,
                    c.Ativos.Count
                )
            )
            .ToListAsync();
    }

    // ============================================================
    // CRIAR CARTEIRA
    // ============================================================

    public async Task<Carteira> CriarAsync(
        string nome,
        int usuarioId)
    {
        var carteira = new Carteira
        {
            Nome = nome,
            UsuarioId = usuarioId
        };

        _context.Carteiras.Add(carteira);

        await _context.SaveChangesAsync();

        return carteira;
    }

    // ============================================================
    // OBTER E VALIDAR CARTEIRA
    // ============================================================

    public async Task<Carteira> ObterEValidarAsync(
        long carteiraId,
        int usuarioId)
    {
        var carteira = await _context.Carteiras
            .FirstOrDefaultAsync(c =>
                c.Id == carteiraId &&
                c.UsuarioId == usuarioId
            );

        if (carteira is null)
        {
            throw new UnauthorizedAccessException(
                "Carteira não encontrada ou não pertence ao usuário."
            );
        }

        return carteira;
    }

   public async Task<Carteira?> AlterarNomeAsync(
    long id,
    string nome,
    int usuarioId)
    {
        var carteira = await _context.Carteiras
            .FirstOrDefaultAsync(c =>
                c.Id == id &&
                c.UsuarioId == usuarioId);

        if (carteira == null)
            return null;

        carteira.Nome = nome.Trim();

        await _context.SaveChangesAsync();

        return carteira;
    }

    // ============================================================
    // DELETAR CARTEIRA
    // ============================================================

    public async Task DeletarAsync(
        long carteiraId,
        int usuarioId)
    {
        var carteira = await ObterEValidarAsync(
            carteiraId,
            usuarioId
        );

        _context.Carteiras.Remove(carteira);

        await _context.SaveChangesAsync();
    }
}

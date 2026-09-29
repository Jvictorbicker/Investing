using AtivoApi.Data;
using AtivoApi.Models;
using Microsoft.EntityFrameworkCore;

namespace AtivoApi.Services;

public record BrapiResponse(List<BrapiQuote> Results);
public record BrapiQuote(string Symbol, decimal RegularMarketPrice);
public record AtivoComparativoDto(
    Ativo Ativo,
    decimal PrecoAtual,
    decimal VariacaoAbsoluta,
    decimal VariacaoPercent
);

public class AtivoService
{
    private readonly AppDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly string _brapiToken;

    public AtivoService(AppDbContext context, IHttpClientFactory httpClientFactory, IConfiguration config)
    {
        _context = context;
        _httpClient = httpClientFactory.CreateClient();
        _brapiToken = config["Brapi:Token"] ?? throw new InvalidOperationException("Brapi token not configured.");
    }

    // Garante que a carteira existe e pertence ao usuário logado
    private async Task ValidarCarteiraAsync(long carteiraId, string userId)
    {
        var existe = await _context.Carteiras
            .AnyAsync(c => c.Id == carteiraId && c.UserId == userId);

        if (!existe)
            throw new UnauthorizedAccessException("Carteira não encontrada ou não pertence ao usuário.");
    }

    public async Task<BrapiResponse?> BuscarCotacaoAsync(string ticker)
    {
        var url = $"https://brapi.dev/api/quote/{ticker}?token={_brapiToken}";
        var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<BrapiResponse>();
    }

    public async Task<List<Ativo>> ListarAsync(long carteiraId, string userId)
    {
        await ValidarCarteiraAsync(carteiraId, userId);
        return await _context.Ativos
            .Where(a => a.CarteiraId == carteiraId)
            .ToListAsync();
    }

    // Cria um ativo NOVO dentro de uma carteira específica (a carteira já precisa existir)
    public async Task<Ativo> CriarAsync(Ativo ativo, long carteiraId, string userId)
    {
        await ValidarCarteiraAsync(carteiraId, userId);

        var cotacao = await BuscarCotacaoAsync(ativo.Ticker);
        ativo.PrecoCompra = cotacao?.Results?.FirstOrDefault()?.RegularMarketPrice ?? 0;
        ativo.CarteiraId = carteiraId;
        ativo.Carteira = null;

        _context.Ativos.Add(ativo);
        await _context.SaveChangesAsync();
        return ativo;
    }

    // Atualiza um ativo já existente (comprar/vender/editar quantidade) — validado via dono da carteira
    public async Task<Ativo> AtualizarAsync(long id, Ativo dados, string userId)
    {
        var ativo = await _context.Ativos
            .Include(a => a.Carteira)
            .FirstOrDefaultAsync(a => a.Id == id && a.Carteira!.UserId == userId);

        if (ativo is null)
            throw new UnauthorizedAccessException("Ativo não encontrado ou não pertence ao usuário.");

        ativo.Quantidade = dados.Quantidade;
        ativo.Ticker = dados.Ticker;

        await _context.SaveChangesAsync();
        return ativo;
    }

    public async Task DeletarAsync(long id, string userId)
    {
        var ativo = await _context.Ativos
            .Include(a => a.Carteira)
            .FirstOrDefaultAsync(a => a.Id == id && a.Carteira!.UserId == userId);

        if (ativo is null)
            throw new UnauthorizedAccessException("Ativo não encontrado ou não pertence ao usuário.");

        _context.Ativos.Remove(ativo);
        await _context.SaveChangesAsync();
    }

    public async Task<List<AtivoComparativoDto>> ListarComComparativoAsync(long carteiraId, string userId)
    {
        var ativos = await ListarAsync(carteiraId, userId);
        var result = new List<AtivoComparativoDto>();

        foreach (var ativo in ativos)
        {
            decimal precoAtual = 0;
            try
            {
                var cotacao = await BuscarCotacaoAsync(ativo.Ticker);
                precoAtual = cotacao?.Results?.FirstOrDefault()?.RegularMarketPrice ?? 0;
            }
            catch { }

            result.Add(new AtivoComparativoDto(
                ativo,
                precoAtual,
                precoAtual - ativo.PrecoCompra,
                ativo.PrecoCompra > 0
                    ? Math.Round((precoAtual - ativo.PrecoCompra) / ativo.PrecoCompra * 100, 2)
                    : 0
            ));
        }

        return result;
    }
}
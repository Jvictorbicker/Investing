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

    // Busca ou cria a carteira do usuário
    private async Task<Carteira> ObterOuCriarCarteiraAsync(string userId)
    {
        var carteira = await _context.Carteiras
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (carteira is null)
        {
            carteira = new Carteira { UserId = userId };
            _context.Carteiras.Add(carteira);
            await _context.SaveChangesAsync();
        }

        return carteira;
    }

    public async Task<BrapiResponse?> BuscarCotacaoAsync(string ticker)
    {
        var url = $"https://brapi.dev/api/quote/{ticker}?token={_brapiToken}";
        var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<BrapiResponse>();
    }

    // Filtra ativos pela carteira do usuário logado
    public async Task<List<Ativo>> ListarAsync(string userId)
    {
        var carteira = await ObterOuCriarCarteiraAsync(userId);
        return await _context.Ativos
            .Where(a => a.CarteiraId == carteira.Id)
            .ToListAsync();
    }

    public async Task<Ativo> SalvarAsync(Ativo ativo, string userId)
    {
        var carteira = await ObterOuCriarCarteiraAsync(userId);

        if (ativo.Id == 0)
        {
            var cotacao = await BuscarCotacaoAsync(ativo.Ticker);
            ativo.PrecoCompra = cotacao?.Results?.FirstOrDefault()?.RegularMarketPrice ?? 0;
            ativo.CarteiraId = carteira.Id; // vincula à carteira do usuário
            _context.Ativos.Add(ativo);
        }
        else
        {
            // Garante que o ativo pertence ao usuário antes de atualizar
            var existe = await _context.Ativos
                .AnyAsync(a => a.Id == ativo.Id && a.CarteiraId == carteira.Id);

            if (!existe)
                throw new UnauthorizedAccessException("Ativo não pertence ao usuário.");

            _context.Ativos.Update(ativo);
        }

        await _context.SaveChangesAsync();
        return ativo;
    }

    public async Task DeletarAsync(long id, string userId)
    {
        var carteira = await ObterOuCriarCarteiraAsync(userId);

        // Busca o ativo garantindo que pertence ao usuário
        var ativo = await _context.Ativos
            .FirstOrDefaultAsync(a => a.Id == id && a.CarteiraId == carteira.Id);

        if (ativo is null)
            throw new UnauthorizedAccessException("Ativo não encontrado ou não pertence ao usuário.");

        _context.Ativos.Remove(ativo);
        await _context.SaveChangesAsync();
    }

    public async Task<List<AtivoComparativoDto>> ListarComComparativoAsync(string userId)
    {
        var ativos = await ListarAsync(userId); // já filtra pelo usuário
        var result = new List<AtivoComparativoDto>();

        foreach (var ativo in ativos)
        {
            decimal precoAtual = 0;
            try
            {
                var cotacao = await BuscarCotacaoAsync(ativo.Ticker);
                precoAtual = cotacao?.Results?.FirstOrDefault()?.RegularMarketPrice ?? 0;
            }
            catch { /* mantém 0 se falhar */ }

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
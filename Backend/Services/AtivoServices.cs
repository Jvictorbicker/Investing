using AtivoApi.Data;
using AtivoApi.Models;
using Microsoft.EntityFrameworkCore;

namespace AtivoApi.Services;

// DTOs outside the service class
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

    // Single, typed version — the object? overload is removed
    public async Task<BrapiResponse?> BuscarCotacaoAsync(string ticker)
    {
        var url = $"https://brapi.dev/api/quote/{ticker}?token={_brapiToken}";
        var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<BrapiResponse>();
    }

    public async Task<List<Ativo>> ListarAsync() =>
        await _context.Ativos.ToListAsync();

    public async Task<Ativo> SalvarAsync(Ativo ativo)
    {
        if (ativo.Id == 0)
        {
            var cotacao = await BuscarCotacaoAsync(ativo.Ticker);
            ativo.PrecoCompra = cotacao?.Results?.FirstOrDefault()?.RegularMarketPrice ?? 0;
            _context.Ativos.Add(ativo);
        }
        else
            _context.Ativos.Update(ativo);

        await _context.SaveChangesAsync();
        return ativo;
    }

    public async Task DeletarAsync(long id)
    {
        var ativo = await _context.Ativos.FindAsync(id);
        if (ativo is not null)
        {
            _context.Ativos.Remove(ativo);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<AtivoComparativoDto>> ListarComComparativoAsync()
    {
        var ativos = await _context.Ativos.ToListAsync();
        var result = new List<AtivoComparativoDto>();

        foreach (var ativo in ativos)
        {
            decimal precoAtual = 0;
            try
            {
                var cotacao = await BuscarCotacaoAsync(ativo.Ticker);
                precoAtual = cotacao?.Results?.FirstOrDefault()?.RegularMarketPrice ?? 0;
            }
            catch { /* keep 0 if fetch fails */ }

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
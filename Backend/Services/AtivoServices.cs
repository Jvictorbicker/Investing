using AtivoApi.Data;
using AtivoApi.Models;
using Microsoft.EntityFrameworkCore;

namespace AtivoApi.Services;

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

    public async Task<object?> BuscarCotacaoAsync(string tickers)
    {
        var url = $"https://brapi.dev/api/quote/{tickers}?token={_brapiToken}";
        var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<object>();
    }

    public async Task<List<Ativo>> ListarAsync() =>
        await _context.Ativos.ToListAsync();

    public async Task<Ativo> SalvarAsync(Ativo ativo)
    {
        if (ativo.Id == 0)
            _context.Ativos.Add(ativo);
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
}
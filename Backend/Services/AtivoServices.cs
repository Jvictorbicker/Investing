using AtivoApi.Data;
using AtivoApi.DTOs;
using AtivoApi.Models;
using Microsoft.EntityFrameworkCore;

namespace AtivoApi.Services;

public class AtivoService
{
    private readonly AppDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly string _brapiToken;

    public AtivoService(
        AppDbContext context,
        IHttpClientFactory httpClientFactory,
        IConfiguration config)
    {
        _context = context;
        _httpClient = httpClientFactory.CreateClient();

        _brapiToken = config["Brapi:Token"]
            ?? throw new InvalidOperationException(
                "Brapi token not configured."
            );
    }

    // ============================================================
    // VALIDA CARTEIRA
    // ============================================================

    private async Task ValidarCarteiraAsync(
        long carteiraId,
        int usuarioId)
    {
        var existe = await _context.Carteiras
            .AnyAsync(c =>
                c.Id == carteiraId &&
                c.UsuarioId == usuarioId
            );

        if (!existe)
        {
            throw new UnauthorizedAccessException(
                "Carteira não encontrada ou não pertence ao usuário."
            );
        }
    }

    // ============================================================
    // COTAÇÃO BRAPI
    // ============================================================

    public async Task<BrapiResponse?> BuscarCotacaoAsync(
    string ticker)
{
    var tickerSeguro = Uri.EscapeDataString(ticker.Trim());

    var url =
        $"https://brapi.dev/api/quote/{tickerSeguro}?token={_brapiToken}";

    using var response = await _httpClient.GetAsync(url);

    // A API não encontrou o ticker ou retornou outro erro HTTP
    if (!response.IsSuccessStatusCode)
        return null;

    return await response.Content
        .ReadFromJsonAsync<BrapiResponse>();
}

    // ============================================================
    // LISTAR ATIVOS
    // ============================================================

    public async Task<List<Ativo>> ListarAsync(
        long carteiraId,
        int usuarioId)
    {
        await ValidarCarteiraAsync(
            carteiraId,
            usuarioId
        );

        return await _context.Ativos
            .Where(a => a.CarteiraId == carteiraId)
            .ToListAsync();
    }

    // ============================================================
    // CRIAR ATIVO
    // ============================================================

public async Task<Ativo> CriarAsync(
    Ativo ativo,
    long carteiraId,
    int usuarioId)
{
    // Verifica se a carteira pertence ao usuário
    await ValidarCarteiraAsync(carteiraId, usuarioId);

    if (string.IsNullOrWhiteSpace(ativo.Ticker))
    {
        throw new ArgumentException(
            "Informe o ticker da ação."
        );
    }

    ativo.Ticker = ativo.Ticker.Trim().ToUpperInvariant();

    BrapiResponse? cotacao;

    try
    {
        cotacao = await BuscarCotacaoAsync(ativo.Ticker);
    }
    catch (HttpRequestException)
    {
        throw new ArgumentException(
            $"Não foi possível consultar o ticker '{ativo.Ticker}' na BRAPI."
        );
    }
    catch (System.Text.Json.JsonException)
    {
        throw new ArgumentException(
            "A BRAPI retornou uma resposta inválida para esse ticker."
        );
    }

    // Confere se a BRAPI encontrou resultados
    if (cotacao?.Results == null ||
        !cotacao.Results.Any())
    {
        throw new ArgumentException(
            $"O ticker '{ativo.Ticker}' não foi encontrado na BRAPI."
        );
    }

    // Vincula o ativo à carteira
    ativo.CarteiraId = carteiraId;

    // Salva no banco de dados
    _context.Ativos.Add(ativo);
    await _context.SaveChangesAsync();

    return ativo;
}


    // ============================================================
    // ATUALIZAR ATIVO
    // ============================================================

    public async Task<Ativo> AtualizarAsync(
        long id,
        Ativo dados,
        int usuarioId)
    {
        var ativo = await _context.Ativos
            .Include(a => a.Carteira)
            .FirstOrDefaultAsync(a =>
                a.Id == id &&
                a.Carteira != null &&
                a.Carteira.UsuarioId == usuarioId
            );

        if (ativo is null)
        {
            throw new UnauthorizedAccessException(
                "Ativo não encontrado ou não pertence ao usuário."
            );
        }

        ativo.Quantidade = dados.Quantidade;
        ativo.Ticker = dados.Ticker;

        await _context.SaveChangesAsync();

        return ativo;
    }

    // ============================================================
    // DELETAR ATIVO
    // ============================================================

    public async Task DeletarAsync(
        long id,
        int usuarioId)
    {
        var ativo = await _context.Ativos
            .Include(a => a.Carteira)
            .FirstOrDefaultAsync(a =>
                a.Id == id &&
                a.Carteira != null &&
                a.Carteira.UsuarioId == usuarioId
            );

        if (ativo is null)
        {
            throw new UnauthorizedAccessException(
                "Ativo não encontrado ou não pertence ao usuário."
            );
        }

        _context.Ativos.Remove(ativo);

        await _context.SaveChangesAsync();
    }

    // ============================================================
    // COMPARATIVO
    // ============================================================

    public async Task<List<AtivoComparativoDto>>
        ListarComComparativoAsync(
            long carteiraId,
            int usuarioId)
    {
        var ativos = await ListarAsync(
            carteiraId,
            usuarioId
        );

        var result = new List<AtivoComparativoDto>();

        foreach (var ativo in ativos)
        {
            decimal precoAtual = 0;

            try
            {
                var cotacao = await BuscarCotacaoAsync(
                    ativo.Ticker
                );

                precoAtual =
                    cotacao?.Results?
                        .FirstOrDefault()?
                        .RegularMarketPrice ?? 0;
            }
            catch
            {
                // Se a cotação falhar, mantém 0
            }

            var variacaoAbsoluta =
                precoAtual - ativo.PrecoCompra;

            var variacaoPercent =
                ativo.PrecoCompra > 0
                    ? Math.Round(
                        variacaoAbsoluta /
                        ativo.PrecoCompra *
                        100,
                        2
                    )
                    : 0;

            result.Add(
                new AtivoComparativoDto(
                    ativo,
                    precoAtual,
                    variacaoAbsoluta,
                    variacaoPercent
                )
            );
        }

        return result;
    }
}
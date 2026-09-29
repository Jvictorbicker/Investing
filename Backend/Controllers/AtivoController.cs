using AtivoApi.Models;
using AtivoApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AtivoApi.Controllers;

[ApiController]
[Authorize]
public class AtivosController : ControllerBase
{
    private readonly AtivoService _service;

    public AtivosController(AtivoService service)
    {
        _service = service;
    }

    private string GetUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new UnauthorizedAccessException("Usuário não autenticado.");

    // ── Escopadas por carteira ──────────────────────────────────────────────
    [HttpGet("api/carteiras/{carteiraId}/ativos")]
    public async Task<IActionResult> Listar(long carteiraId) =>
        Ok(await _service.ListarAsync(carteiraId, GetUserId()));

    [HttpPost("api/carteiras/{carteiraId}/ativos")]
    public async Task<IActionResult> Criar(long carteiraId, [FromBody] Ativo ativo) =>
        Ok(await _service.CriarAsync(ativo, carteiraId, GetUserId()));

    [HttpGet("api/carteiras/{carteiraId}/ativos/comparativo")]
    public async Task<IActionResult> Comparativo(long carteiraId) =>
        Ok(await _service.ListarComComparativoAsync(carteiraId, GetUserId()));

    // ── Por id do ativo (dono validado via join com a carteira) ─────────────
    [HttpPut("api/ativos/{id}")]
    public async Task<IActionResult> Atualizar(long id, [FromBody] Ativo ativo) =>
        Ok(await _service.AtualizarAsync(id, ativo, GetUserId()));

    [HttpDelete("api/ativos/{id}")]
    public async Task<IActionResult> Deletar(long id)
    {
        await _service.DeletarAsync(id, GetUserId());
        return NoContent();
    }

    [HttpGet("api/ativos/cotacoes")]
    public async Task<IActionResult> Cotacoes([FromQuery] string tickers)
    {
        var resultados = new List<BrapiResponse?>();

        foreach (var ticker in tickers.Split(','))
        {
            try
            {
                var resultado = await _service.BuscarCotacaoAsync(ticker.Trim());
                resultados.Add(resultado);
            }
            catch
            {
                // Se um ticker falhar, continua para o próximo
            }
        }

        return Ok(resultados);
    }
}
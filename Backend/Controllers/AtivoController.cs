using AtivoApi.Models;
using AtivoApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AtivoApi.Controllers;

[ApiController]
[Route("api/ativos")]
[Authorize] // Todos os endpoints exigem login
public class AtivosController : ControllerBase
{
    private readonly AtivoService _service;

    public AtivosController(AtivoService service)
    {
        _service = service;
    }

    // Helper para pegar o userId do token
    private string GetUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new UnauthorizedAccessException("Usuário não autenticado.");

    [HttpGet]
    public async Task<IActionResult> Listar() =>
        Ok(await _service.ListarAsync(GetUserId()));

    [HttpPost]
    public async Task<IActionResult> Salvar([FromBody] Ativo ativo) =>
        Ok(await _service.SalvarAsync(ativo, GetUserId()));

    [HttpDelete("{id}")]
    public async Task<IActionResult> Deletar(long id)
    {
        await _service.DeletarAsync(id, GetUserId());
        return NoContent();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Atualizar(long id, [FromBody] Ativo ativo)
    {
        ativo.Id = id;
        return Ok(await _service.SalvarAsync(ativo, GetUserId()));
    }

    [HttpGet("cotacoes")]
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

    [HttpGet("comparativo")]
    public async Task<IActionResult> Comparativo() =>
        Ok(await _service.ListarComComparativoAsync(GetUserId()));
}
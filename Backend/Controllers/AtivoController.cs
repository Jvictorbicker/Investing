using AtivoApi.Models;
using AtivoApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace AtivoApi.Controllers;

[ApiController]
[Route("api/ativos")]
public class AtivosController : ControllerBase
{
    private readonly AtivoService _service;

    public AtivosController(AtivoService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> Listar() =>
        Ok(await _service.ListarAsync());

    [HttpPost]
    public async Task<IActionResult> Salvar([FromBody] Ativo ativo) =>
        Ok(await _service.SalvarAsync(ativo));

    [HttpDelete("{id}")]
    public async Task<IActionResult> Deletar(long id)
    {
        await _service.DeletarAsync(id);
        return NoContent();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Atualizar(long id, [FromBody] Ativo ativo)
    {
        ativo.Id = id;
        return Ok(await _service.SalvarAsync(ativo));
    }

    [HttpGet("cotacoes")]
    public async Task<IActionResult> Cotacoes([FromQuery] string tickers)
    {
        var resultados = new List<object?>();

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
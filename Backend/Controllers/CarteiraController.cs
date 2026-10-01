using System.Security.Claims;
using AtivoApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtivoApi.Controllers;

[ApiController]
[Route("api/carteiras")]
[Authorize]
public class CarteiraController : ControllerBase
{
    private readonly CarteiraService _service;

    public CarteiraController(CarteiraService service)
    {
        _service = service;
    }

    private int GetUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(userId, out var id))
            throw new UnauthorizedAccessException("Usuário não autenticado.");

        return id;
    }

    public record CriarCarteiraRequest(string Nome);

    public record AlterarCarteiraRequest(string Nome);

    // ============================================================
    // LISTAR CARTEIRAS
    // ============================================================

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        return Ok(
            await _service.ListarAsync(GetUserId())
        );
    }

    // ============================================================
    // CRIAR CARTEIRA
    // ============================================================

    [HttpPost]
    public async Task<IActionResult> Criar(
        [FromBody] CriarCarteiraRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Nome))
            return BadRequest("Nome da carteira é obrigatório.");

        var carteira = await _service.CriarAsync(
            req.Nome.Trim(),
            GetUserId()
        );

        return Ok(carteira);
    }

    // ============================================================
    // ALTERAR NOME
    // ============================================================

    [HttpPut("{id}")]
    public async Task<IActionResult> Alterar(
        long id,
        [FromBody] AlterarCarteiraRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Nome))
            return BadRequest("Nome da carteira é obrigatório.");

        var carteira = await _service.AlterarNomeAsync(
            id,
            req.Nome.Trim(),
            GetUserId()
        );

        if (carteira == null)
            return NotFound("Carteira não encontrada.");

        return Ok(carteira);
    }

    // ============================================================
    // EXCLUIR CARTEIRA
    // ============================================================

    [HttpDelete("{id}")]
    public async Task<IActionResult> Deletar(long id)
    {
        await _service.DeletarAsync(
            id,
            GetUserId()
        );

        return NoContent();
    }
}
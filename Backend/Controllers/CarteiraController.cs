using AtivoApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AtivoApi.Controllers;

[ApiController]
[Route("api/carteiras")]
[Authorize]
public class CarteirasController : ControllerBase
{
    private readonly CarteiraService _service;

    public CarteirasController(CarteiraService service)
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

    [HttpGet]
    public async Task<IActionResult> Listar() =>
        Ok(await _service.ListarAsync(GetUserId()));

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] CriarCarteiraRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Nome))
            return BadRequest("Nome da carteira é obrigatório.");

        var carteira = await _service.CriarAsync(req.Nome.Trim(), GetUserId());
        return Ok(carteira);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Deletar(long id)
    {
        await _service.DeletarAsync(id, GetUserId());
        return NoContent();
    }
}
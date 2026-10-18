
using AtivoApi.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Security.Claims;

namespace AtivoApi.Controllers;

[ApiController]
[Route("api/admin/cadastros")]
[Authorize]
public class AdminCadastrosController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminCadastrosController(AppDbContext context)
    {
        _context = context;
    }

    private async Task<int?> ObterAdminId()
    {
        var claim = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!int.TryParse(claim, out var id))
            return null;

        var isAdmin = await _context.Usuarios
            .AnyAsync(u => u.Id == id && u.IsAdmin);

        return isAdmin ? id : null;
    }

    [HttpGet("pendentes")]
    public async Task<IActionResult> Pendentes()
    {
        if (await ObterAdminId() is null)
            return Forbid();

        var solicitacoes = await _context.SolicitacoesCadastro
            .AsNoTracking()
            .Where(s => s.Status == "Pendente")
            .OrderBy(s => s.DataSolicitacao)
            .Select(s => new
            {
                s.Id,
                s.Nome,
                s.Email,
                s.DataSolicitacao,
                s.Status
            })
            .ToListAsync();

        return Ok(solicitacoes);
    }

    [HttpPost("{id:int}/aprovar")]
    public async Task<IActionResult> Aprovar(int id)
    {
        var adminId = await ObterAdminId();

        if (adminId is null)
            return Forbid();

        try
        {
            await _context.Database.ExecuteSqlInterpolatedAsync(
                $"EXEC dbo.sp_AprovarCadastro @SolicitacaoId={id}, @AdministradorId={adminId.Value}");

            return Ok(new
            {
                mensagem = "Cadastro aprovado com sucesso."
            });
        }
        catch (Exception)
        {
            return Conflict(new
            {
                mensagem = "Não foi possível aprovar a solicitação. Verifique se ela ainda está pendente e se o e-mail já está cadastrado."
            });
        }
    }

    [HttpPost("{id:int}/rejeitar")]
    public async Task<IActionResult> Rejeitar(int id)
    {
        var adminId = await ObterAdminId();

        if (adminId is null)
            return Forbid();

        try
        {
            await _context.Database.ExecuteSqlInterpolatedAsync(
                $"EXEC dbo.sp_RejeitarCadastro @SolicitacaoId={id}, @AdministradorId={adminId.Value}");

            return Ok(new
            {
                mensagem = "Solicitação rejeitada."
            });
        }
        catch (Exception)
        {
            return Conflict(new
            {
                mensagem = "Não foi possível rejeitar a solicitação. Ela pode já ter sido analisada."
            });
        }
    }
}

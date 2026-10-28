using AtivoApi.Data;
using AtivoApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace AtivoApi.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminController(AppDbContext context)
    {
        _context = context;
    }

    // ============================================================
    // VERIFICA SE O USUÁRIO AUTENTICADO É ADMINISTRADOR
    // ============================================================

    private async Task<Usuario?> ObterAdministradorLogado()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(claim, out var usuarioId))
            return null;

        var usuario = await _context.Usuarios
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == usuarioId);

        if (usuario is null || !usuario.IsAdmin)
            return null;

        return usuario;
    }

    // ============================================================
    // LISTAR USUÁRIOS CADASTRADOS
    // GET /api/admin/usuarios
    // ============================================================

    [HttpGet("usuarios")]
    public async Task<IActionResult> ListarUsuarios()
    {
        var administrador = await ObterAdministradorLogado();

        if (administrador is null)
            return Forbid();

        var usuarios = await _context.Usuarios
            .AsNoTracking()
            .OrderBy(u => u.Nome)
            .Select(u => new
            {
                id = u.Id,
                nome = u.Nome,
                email = u.Email,
                telefone = u.Telefone,
                fotoUrl = u.FotoUrl,
                isAdmin = u.IsAdmin
            })
            .ToListAsync();

        return Ok(usuarios);
    }

    // ============================================================
    // LISTAR SOLICITAÇÕES PENDENTES
    // GET /api/admin/solicitacoes
    // ============================================================

    [HttpGet("solicitacoes")]
    public async Task<IActionResult> ListarSolicitacoes()
    {
        var administrador = await ObterAdministradorLogado();

        if (administrador is null)
            return Forbid();

        var solicitacoes = await _context.SolicitacoesCadastro
            .AsNoTracking()
            .Where(s => s.Status == "Pendente")
            .OrderBy(s => s.DataSolicitacao)
            .Select(s => new
            {
                id = s.Id,
                nome = s.Nome,
                email = s.Email,
                status = s.Status,
                dataSolicitacao = s.DataSolicitacao
            })
            .ToListAsync();

        return Ok(solicitacoes);
    }

    // ============================================================
    // APROVAR SOLICITAÇÃO
    // POST /api/admin/solicitacoes/{id}/aprovar
    // ============================================================

    [HttpPost("solicitacoes/{id:int}/aprovar")]
    public async Task<IActionResult> AprovarSolicitacao(int id)
    {
        var administrador = await ObterAdministradorLogado();

        if (administrador is null)
            return Forbid();

        var solicitacao = await _context.SolicitacoesCadastro
            .FirstOrDefaultAsync(s =>
                s.Id == id && s.Status == "Pendente");

        if (solicitacao is null)
            return NotFound(new
            {
                mensagem = "Solicitação não encontrada ou já analisada."
            });

        var email = solicitacao.Email.Trim().ToLowerInvariant();

        var usuarioExiste = await _context.Usuarios
            .AnyAsync(u => u.Email.ToLower() == email);

        if (usuarioExiste)
        {
            return Conflict(new
            {
                mensagem = "Já existe um usuário cadastrado com este e-mail."
            });
        }

        // A senha já está protegida na solicitação.
        // Não armazenamos a senha em texto puro.
        var usuario = new Usuario
        {
            Nome = solicitacao.Nome.Trim(),
            Email = email,
            Senha = solicitacao.SenhaHash,
            IsAdmin = false
        };

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            _context.Usuarios.Add(usuario);

            solicitacao.Status = "Aprovada";
            solicitacao.DataAnalise = DateTime.UtcNow;
            solicitacao.AdministradorId = administrador.Id;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        return Ok(new
        {
            mensagem = "Solicitação aprovada e usuário cadastrado.",
            usuario = new
            {
                id = usuario.Id,
                nome = usuario.Nome,
                email = usuario.Email,
                isAdmin = usuario.IsAdmin
            }
        });
    }

    // ============================================================
    // RECUSAR SOLICITAÇÃO
    // POST /api/admin/solicitacoes/{id}/recusar
    // ============================================================

    [HttpPost("solicitacoes/{id:int}/recusar")]
    public async Task<IActionResult> RecusarSolicitacao(int id)
    {
        var administrador = await ObterAdministradorLogado();

        if (administrador is null)
            return Forbid();

        var solicitacao = await _context.SolicitacoesCadastro
            .FirstOrDefaultAsync(s =>
                s.Id == id && s.Status == "Pendente");

        if (solicitacao is null)
        {
            return NotFound(new
            {
                mensagem = "Solicitação não encontrada ou já analisada."
            });
        }

        solicitacao.Status = "Recusada";
        solicitacao.DataAnalise = DateTime.UtcNow;
        solicitacao.AdministradorId = administrador.Id;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            mensagem = "Solicitação recusada."
        });
    }
}
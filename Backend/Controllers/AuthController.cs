using AtivoApi.Data;
using AtivoApi.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using AtivoApi.DTOs;

namespace AtivoApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly PasswordHasher<Usuario> _passwordHasher;

    public AuthController(AppDbContext context)
    {
        _context = context;
        _passwordHasher = new PasswordHasher<Usuario>();
    }

    // ============================================================
    // REGISTER
    // ============================================================

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nome) ||
            string.IsNullOrWhiteSpace(dto.Email) ||
            string.IsNullOrWhiteSpace(dto.Senha))
        {
            return BadRequest("Nome, e-mail e senha são obrigatórios.");
        }

        var email = dto.Email.Trim().ToLower();

        var existe = await _context.Usuarios
            .AnyAsync(u => u.Email == email);

        if (existe)
            return BadRequest("E-mail já cadastrado.");

        var usuario = new Usuario
        {
            Nome = dto.Nome.Trim(),
            Email = email
        };

        usuario.Senha = _passwordHasher.HashPassword(
            usuario,
            dto.Senha
        );

        _context.Usuarios.Add(usuario);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            usuario.Id,
            usuario.Nome,
            usuario.Email
        });
    }

    // ============================================================
    // LOGIN
    // ============================================================

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var email = dto.Email.Trim().ToLower();

        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Email == email);

        if (usuario is null)
            return Unauthorized("E-mail ou senha inválidos.");

        var resultado = _passwordHasher.VerifyHashedPassword(
            usuario,
            usuario.Senha,
            dto.Senha
        );

        if (resultado == PasswordVerificationResult.Failed)
            return Unauthorized("E-mail ou senha inválidos.");

        var claims = new List<Claim>
        {
            new Claim(
                ClaimTypes.NameIdentifier,
                usuario.Id.ToString()
            ),

            new Claim(
                ClaimTypes.Name,
                usuario.Nome
            ),

            new Claim(
                ClaimTypes.Email,
                usuario.Email
            )
        };

        var identity = new ClaimsIdentity(
            claims,
            CookieAuthenticationDefaults.AuthenticationScheme
        );

        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal,
            new AuthenticationProperties
            {
                IsPersistent = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddHours(8)
            }
        );

        return Ok(new
        {
            usuario.Id,
            usuario.Nome,
            usuario.Email
        });
    }

    // ============================================================
    // LOGOUT
    // ============================================================

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(
            CookieAuthenticationDefaults.AuthenticationScheme
        );

        return Ok();
    }

    // ============================================================
    // ME
    // ============================================================

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var usuario = await ObterUsuarioLogado();

        if (usuario is null)
            return Unauthorized();

        return Ok(new
        {
            usuario.Id,
            usuario.Nome,
            usuario.Email,
            usuario.Telefone,
            usuario.FotoUrl
        });
    }

    // ============================================================
    // PERFIL
    // ============================================================

    [Authorize]
    [HttpGet("perfil")]
    public async Task<IActionResult> GetPerfil()
    {
        var usuario = await ObterUsuarioLogado();

        if (usuario is null)
            return Unauthorized();

        return Ok(new
        {
            usuario.Id,
            usuario.Nome,
            usuario.Email,
            usuario.FotoUrl
        });
    }

    // ============================================================
    // ATUALIZAR PERFIL
    // ============================================================

    [Authorize]
    [HttpPut("perfil")]
    public async Task<IActionResult> AtualizarPerfil(
        AtualizarPerfilDto dto)
    {
        var usuario = await ObterUsuarioLogado();

        if (usuario is null)
            return Unauthorized();

        if (!string.IsNullOrWhiteSpace(dto.Nome))
    usuario.Nome = dto.Nome.Trim();

        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            var email = dto.Email.Trim().ToLower();

            var emailExiste = await _context.Usuarios
                .AnyAsync(u =>
                    u.Email == email &&
                    u.Id != usuario.Id);

            if (emailExiste)
                return BadRequest("E-mail já está sendo utilizado.");

            usuario.Email = email;
        }

        if (!string.IsNullOrWhiteSpace(dto.Telefone))
            usuario.Telefone = dto.Telefone.Trim();

        if (!string.IsNullOrWhiteSpace(dto.NovaSenha))
        {
            if (string.IsNullOrWhiteSpace(dto.SenhaAtual))
                return BadRequest(
                    "Informe a senha atual para alterá-la."
                );

            var senhaAtual = _passwordHasher.VerifyHashedPassword(
                usuario,
                usuario.Senha,
                dto.SenhaAtual
            );

            if (senhaAtual == PasswordVerificationResult.Failed)
                return BadRequest("Senha atual inválida.");

            usuario.Senha = _passwordHasher.HashPassword(
                usuario,
                dto.NovaSenha
            );
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            usuario.Id,
            usuario.Nome,
            usuario.Email,
            usuario.Telefone,
            usuario.FotoUrl
        });
    }

    // ============================================================
    // FOTO
    // ============================================================

    [Authorize]
    [HttpPost("perfil/foto")]
    public async Task<IActionResult> UploadFoto(IFormFile foto)
    {
        if (foto is null || foto.Length == 0)
            return BadRequest("Nenhum arquivo enviado.");

        var usuario = await ObterUsuarioLogado();

        if (usuario is null)
            return Unauthorized();

        var pasta = Path.Combine(
            "wwwroot",
            "avatars"
        );

        Directory.CreateDirectory(pasta);

        var extensao = Path.GetExtension(foto.FileName);

        var nomeArquivo = $"{usuario.Id}{extensao}";

        var caminho = Path.Combine(
            pasta,
            nomeArquivo
        );

        using var stream = System.IO.File.Create(caminho);

        await foto.CopyToAsync(stream);

        usuario.FotoUrl = $"/avatars/{nomeArquivo}";

        await _context.SaveChangesAsync();

        return Ok(new
        {
            fotoUrl = usuario.FotoUrl
        });
    }

    // ============================================================
    // USUARIO LOGADO
    // ============================================================

    private async Task<Usuario?> ObterUsuarioLogado()
    {
        var claim = User.FindFirstValue(
            ClaimTypes.NameIdentifier
        );

        if (!int.TryParse(claim, out var usuarioId))
            return null;

        return await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Id == usuarioId);
    }
}
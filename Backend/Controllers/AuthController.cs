using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AtivoApi.Data;
using AtivoApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace AtivoApi.Controllers;

public record RegisterDto(string Nome, string Email, string Senha);
public record LoginDto(string Email, string Senha);
public record AtualizarPerfilDto(string? Nome, string? Email, string? Telefone, string? SenhaAtual, string? NovaSenha);

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly AppDbContext _context;
    private readonly IConfiguration _config; // NOVO

    public AuthController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager, AppDbContext context, IConfiguration config)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _context = context;
        _config = config; // NOVO
    }

    // ─── Geração de Token ───────────────────────────────────────────────────
    private string GerarToken(ApplicationUser user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email!),
            new Claim("nome", user.Nome)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(double.Parse(_config["Jwt:ExpiresInMinutes"]!)),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var user = new ApplicationUser
        {
            Nome = dto.Nome,
            UserName = dto.Email,
            Email = dto.Email
        };

        var result = await _userManager.CreateAsync(user, dto.Senha);
        if (!result.Succeeded)
            return BadRequest(result.Errors);

        // MUDOU: gera token em vez de SignInAsync
        var token = GerarToken(user);
        return Ok(new { token, nome = user.Nome, email = user.Email });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user is null || !await _userManager.CheckPasswordAsync(user, dto.Senha))
            return Unauthorized(new { mensagem = "Email ou senha inválidos." });

        // MUDOU: gera token em vez de PasswordSignInAsync
        var token = GerarToken(user);
        return Ok(new { token, nome = user.Nome, email = user.Email });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        // Com JWT não existe "logout" no servidor — o cliente só descarta o token.
        // Mantido aqui só para não quebrar chamadas existentes do front.
        return Ok();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null) return Unauthorized();

        return Ok(new { nome = user.Nome, email = user.Email, telefone = user.PhoneNumber });
    }

    // ─── Perfil ───────────────────────────────────────────────────────────────

    [Authorize]
    [HttpGet("perfil")]
    public async Task<IActionResult> GetPerfil()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null) return Unauthorized();

        return Ok(new { nome = user.Nome, email = user.Email, telefone = user.PhoneNumber, fotoUrl = user.FotoUrl });
    }

    [Authorize]
    [HttpPut("perfil")]
    public async Task<IActionResult> AtualizarPerfil([FromBody] AtualizarPerfilDto dto)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null) return Unauthorized();

        // ── Nome ──────────────────────────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(dto.Nome))
            user.Nome = dto.Nome.Trim();

        // ── Telefone ──────────────────────────────────────────────────────────
        user.PhoneNumber = dto.Telefone?.Trim();

        // ── E-mail ────────────────────────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(dto.Email) &&
            !dto.Email.Equals(user.Email, StringComparison.OrdinalIgnoreCase))
        {
            var setEmail = await _userManager.SetEmailAsync(user, dto.Email.Trim());
            if (!setEmail.Succeeded)
                return BadRequest(setEmail.Errors.Select(e => e.Description));

            var setUser = await _userManager.SetUserNameAsync(user, dto.Email.Trim());
            if (!setUser.Succeeded)
                return BadRequest(setUser.Errors.Select(e => e.Description));
        }

        // ── Senha (opcional) ──────────────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(dto.NovaSenha))
        {
            if (string.IsNullOrWhiteSpace(dto.SenhaAtual))
                return BadRequest(new[] { "Informe a senha atual para alterá-la." });

            var changePassword = await _userManager.ChangePasswordAsync(user, dto.SenhaAtual, dto.NovaSenha);
            if (!changePassword.Succeeded)
                return BadRequest(changePassword.Errors.Select(e => e.Description));
        }

        // ── Persiste ──────────────────────────────────────────────────────────
        var update = await _userManager.UpdateAsync(user);
        if (!update.Succeeded)
            return BadRequest(update.Errors.Select(e => e.Description));

        return Ok(new { message = "Perfil atualizado com sucesso." });
    }

    [Authorize]
    [HttpPost("perfil/foto")]
    public async Task<IActionResult> UploadFoto(IFormFile foto)
    {
        if (foto is null || foto.Length == 0)
            return BadRequest("Nenhum arquivo enviado.");

        var user = await _userManager.GetUserAsync(User);
        if (user is null) return Unauthorized();

        var pasta = Path.Combine("wwwroot", "avatars");
        Directory.CreateDirectory(pasta);

        var extensao = Path.GetExtension(foto.FileName);
        var nomeArquivo = $"{user.Id}{extensao}";
        var caminho = Path.Combine(pasta, nomeArquivo);

        using (var stream = System.IO.File.Create(caminho))
            await foto.CopyToAsync(stream);

        user.FotoUrl = $"/avatars/{nomeArquivo}";
        await _userManager.UpdateAsync(user);

        return Ok(new { fotoUrl = user.FotoUrl });
    }
}
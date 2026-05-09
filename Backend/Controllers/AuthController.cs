using AtivoApi.Data;
using AtivoApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
 
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
 
    public AuthController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager, AppDbContext context)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _context = context;
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
 
        _context.Carteiras.Add(new Carteira { UserId = user.Id });
        await _context.SaveChangesAsync();
 
        await _signInManager.SignInAsync(user, isPersistent: true);
        return Ok(new { nome = user.Nome, email = user.Email });
    }
 
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var result = await _signInManager.PasswordSignInAsync(dto.Email, dto.Senha, isPersistent: true, lockoutOnFailure: false);
        if (!result.Succeeded)
            return Unauthorized(new { mensagem = "Email ou senha inválidos." });
 
        var user = await _userManager.FindByEmailAsync(dto.Email);
        return Ok(new { nome = user!.Nome, email = user.Email });
    }
 
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await _signInManager.SignOutAsync();
        return Ok();
    }
 
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (!User.Identity?.IsAuthenticated ?? true)
            return Unauthorized();
 
        var user = await _userManager.GetUserAsync(User);
        return Ok(new { nome = user!.Nome, email = user.Email, telefone = user.PhoneNumber });
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

    // Garante que a pasta existe
    var pasta = Path.Combine("wwwroot", "avatars");
    Directory.CreateDirectory(pasta);

    // Nome único para não sobrescrever fotos de outros usuários
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
 
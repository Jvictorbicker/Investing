using Microsoft.AspNetCore.Identity;

namespace AtivoApi.Models;

public class ApplicationUser : IdentityUser
{
    public string Nome { get; set; } = string.Empty;

    public Carteira? Carteira { get; set; }
}
using Microsoft.AspNetCore.Identity;

namespace AtivoApi.Models;

public class ApplicationUser : IdentityUser
{
    public string Nome { get; set; } = string.Empty;

    public string? FotoUrl {get; set;}

    public ICollection<Carteira> Carteiras { get; set; } = new List<Carteira>();
}
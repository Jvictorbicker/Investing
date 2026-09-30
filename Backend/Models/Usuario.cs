using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AtivoApi.Models;

[Table("usuario")]
public class Usuario
{
    [Key]
    public int Id { get; set; }

    public string Nome { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Senha { get; set; } = string.Empty;

    public string? Telefone { get; set; }

    public string? FotoUrl { get; set; }

    public ICollection<Carteira> Carteiras { get; set; } = new List<Carteira>();
}
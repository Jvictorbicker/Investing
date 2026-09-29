using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AtivoApi.Models;

[Table("carteiras")]
public class Carteira
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    // NOVO: nome que o usuário dá para a carteira (ex: "Renda Variável", "Longo Prazo")
    public string Nome { get; set; } = string.Empty;

    public string UserId { get; set; } = string.Empty;

    [ForeignKey("UserId")]
    public ApplicationUser? User { get; set; }

    public ICollection<Ativo> Ativos { get; set; } = new List<Ativo>();
}
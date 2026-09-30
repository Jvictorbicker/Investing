using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AtivoApi.Models;

[Table("carteiras")]
public class Carteira
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public string Nome { get; set; } = string.Empty;

    public int UsuarioId { get; set; }

    [ForeignKey(nameof(UsuarioId))]
    public Usuario? Usuario { get; set; }

    public ICollection<Ativo> Ativos { get; set; } = new List<Ativo>();
}
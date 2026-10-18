
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AtivoApi.Models;

[Table("SolicitacaoCadastro", Schema = "dbo")]
public class SolicitacaoCadastro
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Nome { get; set; } = string.Empty;

    [Required, MaxLength(320)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(500)]
    public string SenhaHash { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string Status { get; set; } = "Pendente";

    public DateTime DataSolicitacao { get; set; }

    public DateTime? DataAnalise { get; set; }

    public int? AdministradorId { get; set; }
}

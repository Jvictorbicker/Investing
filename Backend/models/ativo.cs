using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AtivoApi.Models;

[Table("ativos")]
public class Ativo
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public string Ticker { get; set; } = string.Empty;  // ex: PETR4

    public int Quantidade { get; set; }  // ex: 2
}
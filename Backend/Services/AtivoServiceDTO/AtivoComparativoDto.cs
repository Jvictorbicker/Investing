using AtivoApi.Models;

namespace AtivoApi.DTOs;

public record AtivoComparativoDto(
    Ativo Ativo,
    decimal PrecoAtual,
    decimal VariacaoAbsoluta,
    decimal VariacaoPercent
);
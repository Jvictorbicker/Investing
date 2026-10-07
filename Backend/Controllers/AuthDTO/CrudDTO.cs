namespace AtivoApi.DTOs;

public record RegisterDto(
    string Nome,
    string Email,
    string Senha
);

public record LoginDto(
    string Email,
    string Senha
);

public record AtualizarPerfilDto(
    string? Nome,
    string? Email,
    string? Telefone,
    string? SenhaAtual,
    string? NovaSenha
);
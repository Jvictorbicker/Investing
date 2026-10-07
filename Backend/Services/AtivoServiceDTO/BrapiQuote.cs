namespace AtivoApi.DTOs;

public record BrapiQuote(
    string Symbol,
    decimal RegularMarketPrice
);